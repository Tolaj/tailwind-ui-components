import crypto from "node:crypto";
import Component from "../models/component.model.js";
import { buildProfile, enrichProfileWithAI } from "./profile.service.js";
import { normalizeTags } from "../controllers/component.controller.js";
import { parseDocument, splitSections } from "@windcraft/core/split-sections.js";
import { tailwindWarning } from "./design-spec.service.js";
import { normalizeGroup } from "@windcraft/core/pages.js";

const MAX_HTML = 5_000_000;

const buildDoc = (userId, { title, description, htmlCode, tags, project = null, kind = "component", parent = null, order = 0, group = "", frameW = null }) => ({
        title: String(title).slice(0, 80) || "Imported design",
        description: String(description || `Imported design: ${title}`).slice(0, 200),
        category: "apps-general",
        htmlCode,
        tags: normalizeTags(tags),
        profile: buildProfile(htmlCode),
        createdBy: userId,
        project, kind, parent, order,
        group: normalizeGroup(group),
        ...(Number.isFinite(frameW) ? { frameW: Math.round(frameW) } : {}),
        isPublished: false,
});

const createOne = (userId, fields) => Component.create(buildDoc(userId, fields));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Saves new code as the component's next version (the old code stays in its history). Returns whether anything changed. */
function nextVersion(c, htmlCode, note) {
    if (c.htmlCode === htmlCode) return false;
    c.versions.push({ version: c.version || 1, htmlCode: c.htmlCode, note });
    c.version = (c.version || 1) + 1;
    c.htmlCode = htmlCode;
    c.profile = buildProfile(htmlCode, c.profile);
    return true;
}

/**
 * The saved page this design replaces: the one named by id, or the page with the same title in the same project.
 * Without a project or an id there is nothing to match, so a new component is made (the Library's own Import).
 */
async function existingPage(userId, { id, project, title }) {
    if (id) {
        if (!/^[a-f0-9]{24}$/i.test(String(id))) throw new Error("Invalid page id");
        const c = await Component.findOne({ _id: id, createdBy: userId, kind: { $ne: "section" } });
        if (!c) throw new Error("No page with that id in your library");
        return c;
    }
    if (!project) return null;
    return Component.findOne({ createdBy: userId, project, kind: "page", title: new RegExp(`^${escapeRe(title)}$`, "i") });
}

const hashOf = (html) => crypto.createHash("sha1").update(String(html)).digest("hex");

/**
 * Makes (or brings up to date) the parts of a page: one "section" component per clear section (header, hero, footer...), linked to the
 * page, with the page's styles so each renders on its own. A page saved again: each section is matched to an old one by name, else by its
 * kind (hero, pricing...) and place (a hero whose heading changed is still the hero), then updated; new ones are added, ones no longer
 * there removed. A part someone changed by hand since it was made (its code no longer matches what was generated) keeps its code.
 */
export async function syncSections(userId, page, { doc, baseTags = [], project, isNew = false }) {
    const sections = [], created = [];
    const assets = [...doc.links, ...doc.styles].join("\n");
    const fresh = splitSections(doc.body).map((s, order) => buildDoc(userId, {
        title: `${page.title}: ${s.name}`,
        description: `${s.name} section from "${page.title}"`,
        htmlCode: `${assets ? assets + "\n" : ""}${s.html}`,
        tags: [...baseTags, "section", s.kind],
        project, kind: "section", parent: project ? page._id : null, order,
    }));
    const old = !isNew ? await Component.find({ createdBy: userId, parent: page._id, kind: "section" }) : [];
    const kept = new Set();
    const kindOf = (tags) => (tags || [])[(tags || []).length - 1]; // a section's last tag is its kind (header, section, footer)
    const byName = new Map(fresh.map((f) => [f, old.find((o) => o.title.toLowerCase() === f.title.toLowerCase())]));
    byName.forEach((o) => o && kept.add(o));
    for (const f of fresh) {
        const match = byName.get(f) || old.find((o) => !kept.has(o) && kindOf(o.tags) === kindOf(f.tags) && o.order === f.order)
            || old.find((o) => !kept.has(o) && kindOf(o.tags) === kindOf(f.tags));
        if (match) {
            kept.add(match);
            match.order = f.order;
            const byHand = match.partHash && match.partHash !== hashOf(match.htmlCode); // edited since it was generated: its code stays
            if (!byHand) {
                match.title = f.title;
                match.description = f.description;
                if (nextVersion(match, f.htmlCode, "Page saved again")) created.push(match);
                match.partHash = hashOf(match.htmlCode);
            }
            await match.save();
            sections.push(match);
        } else {
            const c = await Component.create({ ...f, partHash: hashOf(f.htmlCode) });
            created.push(c);
            sections.push(c);
        }
    }
    const gone = old.filter((o) => !kept.has(o));
    if (gone.length) await Component.deleteMany({ _id: { $in: gone.map((o) => o._id) } });
    return { sections, created, removed: gone.length };
}

/** A page saved from the editor (or made there): its parts are made or updated to match. Only pages in a project have parts. */
export async function syncPartsOf(userId, page) {
    if (!page || page.kind !== "page" || !page.project) return { sections: [], created: [], removed: 0 };
    return syncSections(userId, page, { doc: parseDocument(page.htmlCode), baseTags: [], project: page.project, isNew: false });
}

/**
 * Saves a design as one "page" component and, when it has clear sections, one component per section.
 * Everything is private. Sections carry the page's styles so they render on their own.
 *
 * The same page saved again (same project and title, or its id) becomes its next version instead of a copy, and its
 * sections are updated, added or removed to match. That save must say which version it started from (baseVersion):
 * if the page changed since (an edit in the editor), it is refused, so nothing is overwritten unseen, unless force.
 */
export async function importDesign(userId, { title, html, description, tags = [], split = true, project = null, id = null, baseVersion, force = false, note, group, frameW, summarize = true }) {
    if (!html || typeof html !== "string" || !html.trim()) throw new Error("html is required");
    if (html.length > MAX_HTML) throw new Error("html is too large (limit 5 MB per design)");

    const doc = parseDocument(html);
    const pageTitle = (title || doc.title || doc.heading || "Imported design").trim();
    const baseTags = [...normalizeTags(tags), "claude-design"];
    const created = [];

    let page = await existingPage(userId, { id, project, title: pageTitle });
    let updated = false;
    if (page) {
        const now = page.version || 1;
        if (!force && Number(baseVersion) !== now) {
            throw new Error(baseVersion === undefined || baseVersion === null
                ? `"${page.title}" already exists (id ${page._id}, v${now}). To save this as its next version, pass baseVersion: ${now} after reading it with get_component (it may have been edited in the editor since you last saw it). To keep both, use a different title.`
                : `"${page.title}" is now v${now}, but this design was made from v${baseVersion}: it was changed since (perhaps in the editor). Read it again with get_component and work from that, or pass force: true to replace it anyway.`);
        }
        updated = nextVersion(page, html, String(note || "Saved again from Claude").slice(0, 200));
        if (description) page.description = String(description).slice(0, 200);
        if (group !== undefined) page.group = normalizeGroup(group);
        if (Number.isFinite(frameW)) page.frameW = Math.round(frameW);
        page.tags = [...new Set([...(page.tags || []), ...baseTags, "page"])];
        await page.save();
    } else {
        page = await createOne(userId, {
            title: pageTitle,
            description: description || doc.description || doc.heading,
            htmlCode: html,
            tags: [...baseTags, "page"],
            project, kind: project ? "page" : "component", group, frameW,
        });
        created.push(page);
    }

    const isNew = created.includes(page);
    // sections are only linked to their page inside a project: outside one, a page saved again gets no new copies
    let sections = [], removedSections = 0;
    if (split && (isNew || project)) {
        const r = await syncSections(userId, page, { doc, baseTags, project, isNew });
        sections = r.sections; removedSections = r.removed; created.push(...r.created);
    }

    // The owner's AI writes a short summary of what changed (when they turned it on). `summarize: false` skips it: a converter
    // such as the Figma plugin saves its own work without any AI.
    if (summarize) {
        const all = [...new Set([...(updated ? [page] : []), ...created])]; // what changed, for the AI summary
        if (process.env.VERCEL) {
            // Serverless freezes work started after the response, so give the page's AI summary a short, bounded wait.
            await Promise.race([enrichProfileWithAI(page._id, userId), new Promise((resolve) => setTimeout(resolve, 6000))]);
        } else {
            (async () => { for (const c of all.slice(0, 12)) await enrichProfileWithAI(c._id, userId); })();
        }
    }

    const warning = tailwindWarning(html);
    return {
        page: { id: String(page._id), title: page.title, ...(page.group ? { group: page.group } : {}), version: page.version || 1, ...(isNew ? { created: true } : { updated, ...(updated ? {} : { note: "Same code as the saved version: nothing changed" }) }) },
        sections: sections.map((c) => ({ id: String(c._id), title: c.title, version: c.version || 1 })),
        ...(removedSections ? { removedSections } : {}),
        ...(warning ? { warning } : {}),
    };
}
