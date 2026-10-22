import Component from "../models/component.model.js";
import { buildSpec, enrichSpecWithAI } from "./spec.service.js";
import { normalizeTags } from "../controllers/component.controller.js";
import { parseDocument, splitSections } from "../public/js/shared/split-sections.js";

const MAX_HTML = 1_000_000;

const buildDoc = (userId, { title, description, htmlCode, tags, project = null, kind = "component", parent = null, order = 0 }) => ({
        title: String(title).slice(0, 80) || "Imported design",
        description: String(description || `Imported design: ${title}`).slice(0, 200),
        category: "apps-general",
        htmlCode,
        tags: normalizeTags(tags),
        spec: buildSpec(htmlCode),
        createdBy: userId,
        project, kind, parent, order,
        isPublished: false,
});

const createOne = (userId, fields) => Component.create(buildDoc(userId, fields));

/**
 * Saves a design as one "page" component and, when it has clear sections, one component per section.
 * Everything is private. Sections carry the page's styles so they render on their own.
 */
export async function importDesign(userId, { title, html, description, tags = [], split = true, project = null }) {
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
        project, kind: project ? "page" : "component",
    });
    created.push(page);

    let sections = [];
    if (split) {
        const assets = [...doc.links, ...doc.styles].join("\n");
        sections = await Component.insertMany(
            splitSections(doc.body).map((s, order) => buildDoc(userId, {
                title: `${pageTitle}: ${s.name}`,
                description: `${s.name} section from "${pageTitle}"`,
                htmlCode: `${assets ? assets + "\n" : ""}${s.html}`,
                tags: [...baseTags, "section", s.kind],
                project, kind: "section", parent: project ? page._id : null, order,
            }))
        );
    }

    const all = [...created, ...sections];
    if (process.env.VERCEL) {
        // Serverless freezes work started after the response, so give the page's AI summary a short, bounded wait.
        await Promise.race([enrichSpecWithAI(page._id, userId), new Promise((resolve) => setTimeout(resolve, 6000))]);
    } else {
        (async () => { for (const c of all.slice(0, 12)) await enrichSpecWithAI(c._id, userId); })();
    }

    return {
        page: { id: String(page._id), title: page.title },
        sections: sections.map((c) => ({ id: String(c._id), title: c.title })),
    };
}
