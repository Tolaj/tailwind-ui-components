import Component from "../models/component.model.js";
import { buildSpec, enrichSpecWithAI } from "./spec.service.js";
import { normalizeTags } from "../controllers/component.controller.js";
import { parseDocument, splitSections } from "../public/js/shared/split-sections.js";

const MAX_HTML = 1_000_000;

async function createOne(userId, { title, description, htmlCode, tags }) {
    return Component.create({
        title: String(title).slice(0, 80) || "Imported design",
        description: String(description || `Imported design: ${title}`).slice(0, 200),
        category: "apps-general",
        htmlCode,
        tags: normalizeTags(tags),
        spec: buildSpec(htmlCode),
        createdBy: userId,
        isPublished: false,
    });
}

/**
 * Saves a design as one "page" component and, when it has clear sections, one component per section.
 * Everything is private. Sections carry the page's styles so they render on their own.
 */
export async function importDesign(userId, { title, html, description, tags = [], split = true }) {
    if (!html || typeof html !== "string" || !html.trim()) throw new Error("html is required");
    if (html.length > MAX_HTML) throw new Error("html is too large (limit 1 MB per design)");

    const doc = parseDocument(html);
    const pageTitle = (title || doc.title || doc.heading || "Imported design").trim();
    const baseTags = [...normalizeTags(tags), "claude-design"];
    const created = [];

    const page = await createOne(userId, {
        title: pageTitle,
        description: description || doc.description || doc.heading,
        htmlCode: html,
        tags: [...baseTags, "page"],
    });
    created.push(page);

    const sections = [];
    if (split) {
        const assets = [...doc.links, ...doc.styles].join("\n");
        for (const s of splitSections(doc.body)) {
            sections.push(await createOne(userId, {
                title: `${pageTitle}: ${s.name}`,
                description: `${s.name} section from "${pageTitle}"`,
                htmlCode: `${assets ? assets + "\n" : ""}${s.html}`,
                tags: [...baseTags, "section", s.kind],
            }));
        }
    }

    const all = [...created, ...sections];
    (async () => { for (const c of all.slice(0, 12)) await enrichSpecWithAI(c._id, userId); })();

    return {
        page: { id: String(page._id), title: page.title },
        sections: sections.map((c) => ({ id: String(c._id), title: c.title })),
    };
}
