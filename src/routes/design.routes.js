import express from "express";
import mongoose from "mongoose";
import Component from "../models/component.model.js";
import { categories } from "./home.routes.js";
import Project from "../models/project.model.js";
import { resolveProject } from "../services/project.service.js";

const router = express.Router();

const categoryGroups = () => {
    const groups = {};
    Object.entries(categories).forEach(([slug, c]) => (groups[c.group] ||= []).push({ slug, name: c.name }));
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
};

const safeJson = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, "");

const projectList = async (userId) => (await Project.find({ owner: userId }).select("name").sort("name").lean()).map((p) => ({ id: String(p._id), name: p.name }));

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
    renderEditor(res, {
        id: null, title: "", version: 0, htmlCode: "", category: "", description: "", tags: [], isPublished: true,
        project: p ? { id: String(p._id), name: p.name } : null, projects: await projectList(req.session.user.id),
    }, "New component");
});

router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(req, res);
        const c = await Component.findOne({ _id: req.params.id, createdBy: req.session.user.id })
            .select("title htmlCode version category description tags isPublished project")
            .lean();
        if (!c) return notFound(req, res);
        const projects = await projectList(req.session.user.id);
        renderEditor(res, {
            project: c.project ? projects.find((p) => p.id === String(c.project)) || null : null, projects,
            id: String(c._id), title: c.title, version: c.version || 1, htmlCode: c.htmlCode,
            category: c.category, description: c.description, tags: c.tags || [], isPublished: c.isPublished,
        }, c.title);
    } catch (error) {
        notFound(req, res);
    }
});

export default router;
