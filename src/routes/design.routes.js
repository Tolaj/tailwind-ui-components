import express from "express";
import mongoose from "mongoose";
import Component from "../models/component.model.js";
import { categories } from "./home.routes.js";

const router = express.Router();

const categoryGroups = () => {
    const groups = {};
    Object.entries(categories).forEach(([slug, c]) => (groups[c.group] ||= []).push({ slug, name: c.name }));
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
};

const safeJson = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, "");

const renderEditor = (res, data, title) =>
    res.render("main/design", {
        layout: "canvas",
        title: `Design: ${title}`,
        dataJson: safeJson({ ...data, categories: categoryGroups() }),
    });

const notFound = (req, res) =>
    res.status(404).render("error", { layout: "main", title: "Not found", message: "That component isn't in your library.", user: req.session.user });

router.get("/new", (req, res) =>
    renderEditor(res, { id: null, title: "", version: 0, htmlCode: "", category: "", description: "", tags: [], isPublished: true }, "New component")
);

router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(req, res);
        const c = await Component.findOne({ _id: req.params.id, createdBy: req.session.user.id })
            .select("title htmlCode version category description tags isPublished")
            .lean();
        if (!c) return notFound(req, res);
        renderEditor(res, {
            id: String(c._id), title: c.title, version: c.version || 1, htmlCode: c.htmlCode,
            category: c.category, description: c.description, tags: c.tags || [], isPublished: c.isPublished,
        }, c.title);
    } catch (error) {
        notFound(req, res);
    }
});

export default router;
