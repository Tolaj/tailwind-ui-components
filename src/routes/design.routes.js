import express from "express";
import mongoose from "mongoose";
import Component from "../models/component.model.js";
import { categories } from "./home.routes.js";
import Project from "../models/project.model.js";
import FigmaDraft from "../models/figmaDraft.model.js";
import { figmaSourceInfo, updateFromFigma } from "../services/figma-update.service.js";
import { publicBase } from "../utils/publicUrl.js";
import { resolveProject } from "../services/project.service.js";
import { normalizeTheme } from "@windcraft/core/theme.js";

const router = express.Router();

const categoryGroups = () => {
    const groups = {};
    Object.entries(categories).forEach(([slug, c]) => (groups[c.group] ||= []).push({ slug, name: c.name }));
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
};

const safeJson = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, "");

const projectList = async (userId) => (await Project.find({ owner: userId }).select("name").sort("name").lean()).map((p) => ({ id: String(p._id), name: p.name }));

const boardOf = (c) => (c.board && Number.isFinite(c.board.x) && Number.isFinite(c.board.y)
    ? { x: c.board.x, y: c.board.y, ...(Number.isFinite(c.board.w) ? { w: c.board.w } : {}), ...(Number.isFinite(c.board.h) ? { h: c.board.h } : {}) }
    : null);

const renderEditor = (res, data, title) =>
    res.render("main/design", {
        layout: "canvas",
        title: `Design: ${title}`,
        dataJson: safeJson({ ...data, categories: categoryGroups() }),
    });

const notFound = (req, res) =>
    res.status(404).render("error", { layout: "main", title: "Not found", message: "That component isn't in your library.", user: req.session.user });

router.get("/new", async (req, res) => {
    const p = req.query.project ? await resolveProject(req.session.user.id, req.query.project) : null;
    // a design sent from Figma "to edit only": it fills the new page, and is saved to the library only when the user saves it here
    const draft = mongoose.isValidObjectId(req.query.draft) ? await FigmaDraft.findOne({ _id: req.query.draft, userId: req.session.user.id }).lean() : null;
    renderEditor(res, {
        id: null, draftId: draft ? String(draft._id) : null, frameW: draft && draft.width ? draft.width : null, // the frame opens at the width it has in Figma
         title: draft ? draft.title : "", version: 0, htmlCode: draft ? draft.html : "", category: "", description: "", tags: [], isPublished: false,
        project: p ? { id: String(p._id), name: p.name } : null, projects: await projectList(req.session.user.id), theme: normalizeTheme(p && p.theme),
        // "New component" from a project: the code opens below the design (the default), ready to write or paste into
        ...(req.query.kind === "component" ? { kind: "component", codeOpen: true } : {}),
    }, "New component");
});

router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(req, res);
        const c = await Component.findOne({ _id: req.params.id, createdBy: req.session.user.id })
            .select("title htmlCode version category description tags isPublished project kind parent board group frameW")
            .lean();
        if (!c) return notFound(req, res);
        const projects = await projectList(req.session.user.id);
        // Everything in the same project shares one infinite plane with this design.
        const plane = c.project ? (await Component.find({ createdBy: req.session.user.id, project: c.project })
            .select("title htmlCode version category description tags isPublished kind parent board group frameW")
            .sort("order createdAt").limit(60).lean()).map((p) => ({
            id: String(p._id), title: p.title, group: p.group || "", frameW: p.frameW || null, version: p.version || 1, kind: p.kind, parent: p.parent ? String(p.parent) : null,
            board: boardOf(p), category: p.category, description: p.description, tags: p.tags || [], isPublished: p.isPublished,
            htmlCode: String(p._id) === String(c._id) ? "" : p.htmlCode,
        })) : [];
        const proj = c.project ? await Project.findOne({ _id: c.project, owner: req.session.user.id }).select("theme").lean() : null;
        renderEditor(res, {
            theme: normalizeTheme(proj && proj.theme),
            project: c.project ? projects.find((p) => p.id === String(c.project)) || null : null, projects,
            figmaSource: await figmaSourceInfo(c._id),
            id: String(c._id), title: c.title, group: c.group || "", frameW: c.frameW || null, version: c.version || 1, htmlCode: c.htmlCode,
            category: c.category, description: c.description, tags: c.tags || [], isPublished: c.isPublished,
            kind: c.kind, parent: c.parent ? String(c.parent) : null, board: boardOf(c), plane,
        }, c.title);
    } catch (error) {
        notFound(req, res);
    }
});

/** Converts the page again from the Figma data kept with it, with the latest converter (the old code stays in its version history). */
router.post("/:id/update-from-figma", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, ...(await updateFromFigma(req.session.user.id, req.params.id, publicBase(req))) });
    } catch (error) {
        console.error("Update from Figma error:", error);
        // a failure we did not expect says what it was (briefly): this is the owner's own request, and it makes a failure on a live site findable
        res.status(error.status || 500).json({ success: false, message: error.status ? error.message : `Could not update the page (${String((error && error.message) || error).slice(0, 160)})` });
    }
});

export default router;
