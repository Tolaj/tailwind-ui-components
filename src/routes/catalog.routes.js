import express from "express";
import Component from "../models/component.model.js";
import { families, family, summary, variantHtml } from "../services/catalog.service.js";
import { resolveProject } from "../services/project.service.js";
import { ensureAuthAPI } from "../middlewares/auth.js";

// The catalog is public to read; adding a part to a project needs a signed-in user.
export const catalogPages = express.Router();
export const catalogApi = express.Router();

catalogPages.get("/", async (req, res) => {
    res.render("main/catalog", { layout: "main", title: "Catalog", activePage: "catalog", user: req.session.user, families: (await families()).map(summary) });
});

catalogPages.get("/:slug", async (req, res) => {
    const f = await family(req.params.slug);
    if (!f) return res.status(404).render("error", { layout: "main", title: "Not found", message: "That part isn't in the catalog.", user: req.session.user });
    const meta = { slug: f.slug, name: f.name, description: f.description, tags: f.tags, styleLabel: f.styleLabel || "Style", previewClass: f.previewClass || "", styles: f.styles, axes: f.axes, compositions: (f.compositions || []).map((c) => ({ slug: c.slug, name: c.name, description: c.description, html: c.html })) };
    res.render("main/catalog-family", { layout: "main", title: `${f.name} | Catalog`, activePage: "catalog", user: req.session.user, name: f.name, description: f.description, metaJson: JSON.stringify(meta).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, "") });
});

/** Adds one variant to one of the user's projects as a component that remembers where it came from. */
catalogApi.post("/:slug/add", ensureAuthAPI, async (req, res) => {
    try {
        const f = await family(req.params.slug);
        if (!f) return res.status(404).json({ success: false, message: "That part isn't in the catalog" });
        const project = await resolveProject(req.session.user.id, req.body.project);
        if (!project) return res.status(400).json({ success: false, message: "Choose a project" });
        const v = variantHtml(f, req.body);
        const label = [f.name, f.styles.find((s) => s.slug === v.style).name, v.size, v.icon && v.icon !== "none" ? `icon ${v.icon}` : ""].filter(Boolean).join(" · ");
        const c = await Component.create({
            title: label, category: "apps-general", description: f.description, htmlCode: v.html, tags: f.tags,
            project: project._id, kind: "component", isPublished: false, createdBy: req.session.user.id,
            origin: { family: f.slug, variant: [v.style, v.size, v.icon].filter(Boolean).join("/") },
        });
        res.status(201).json({ success: true, data: { id: String(c._id), project: String(project._id), title: label } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
