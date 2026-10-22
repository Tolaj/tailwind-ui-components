import express from "express";
import mongoose from "mongoose";
import Project from "../models/project.model.js";
import Component from "../models/component.model.js";
import { listProjects } from "../services/project.service.js";

// ── Pages ────────────────────────────────────────────────────────────────────
export const projectPages = express.Router();

projectPages.get("/", async (req, res) => {
    try {
        res.render("main/projects", { layout: "main", activePage: "projects", title: "Projects", user: req.session.user, projects: await listProjects(req.session.user.id) });
    } catch (error) {
        console.error("Projects page error:", error);
        res.status(500).render("error", { layout: "main", title: "Error", message: "Failed to load projects" });
    }
});

projectPages.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) throw new Error("bad id");
        const project = await Project.findOne({ _id: req.params.id, owner: req.session.user.id }).lean();
        if (!project) throw new Error("missing");
        const items = await Component.find({ createdBy: req.session.user.id, project: project._id })
            .select("title description kind parent order tags version htmlCode board updatedAt")
            .sort("order createdAt")
            .lean();
        const data = {
            project: { id: String(project._id), name: project.name, description: project.description },
            items: items.map((c) => ({
                id: String(c._id), title: c.title, description: c.description, kind: c.kind, parent: c.parent ? String(c.parent) : null,
                version: c.version || 1, tags: c.tags || [], htmlCode: c.htmlCode, board: c.board && Number.isFinite(c.board.x) ? { x: c.board.x, y: c.board.y } : null, updatedAt: c.updatedAt,
            })),
        };
        res.render("main/project", {
            layout: "canvas", title: project.name, projectName: project.name,
            dataJson: JSON.stringify(data).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, ""),
        });
    } catch {
        res.status(404).render("error", { layout: "main", title: "Not found", message: "That project doesn't exist.", user: req.session.user });
    }
});

// ── API ──────────────────────────────────────────────────────────────────────
export const projectApi = express.Router();

const clean = (b) => ({ name: String(b.name || "").trim().slice(0, 80), description: String(b.description || "").trim().slice(0, 300) });

projectApi.get("/", async (req, res) => res.json({ success: true, data: await listProjects(req.session.user.id) }));

projectApi.post("/", async (req, res) => {
    const { name, description } = clean(req.body || {});
    if (!name) return res.status(400).json({ success: false, message: "A project needs a name" });
    const p = await Project.create({ name, description, owner: req.session.user.id });
    res.status(201).json({ success: true, data: { id: String(p._id), name: p.name, description: p.description } });
});

projectApi.put("/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const { name, description } = clean(req.body || {});
    const update = {};
    if (name) update.name = name;
    if (req.body && req.body.description !== undefined) update.description = description;
    const p = await Project.findOneAndUpdate({ _id: req.params.id, owner: req.session.user.id }, update, { new: true });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: { id: String(p._id), name: p.name, description: p.description } });
});

// Saves frame positions in one call. A null position resets that frame to automatic layout (Tidy up).
projectApi.post("/:id/layout", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const owned = await Project.exists({ _id: req.params.id, owner: req.session.user.id });
    if (!owned) return res.status(404).json({ success: false, message: "Not found" });
    const positions = Array.isArray(req.body && req.body.positions) ? req.body.positions.slice(0, 500) : [];
    const ops = positions
        .filter((p) => mongoose.isValidObjectId(p.id))
        .map((p) => ({
            updateOne: {
                filter: { _id: p.id, createdBy: req.session.user.id, project: req.params.id },
                update: { board: Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: Math.round(p.x), y: Math.round(p.y) } : null },
            },
        }));
    if (ops.length) await Component.bulkWrite(ops);
    res.json({ success: true });
});

// Deleting a project keeps its components: they go back to the library with no project.
projectApi.delete("/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    const p = await Project.findOneAndDelete({ _id: req.params.id, owner: req.session.user.id });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });
    await Component.updateMany({ createdBy: req.session.user.id, project: p._id }, { project: null, kind: "component", parent: null });
    res.json({ success: true });
});
