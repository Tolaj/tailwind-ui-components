import express from "express";
import mongoose from "mongoose";
import Component from "../models/component.model.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) throw new Error("bad id");
        const c = await Component.findOne({ _id: req.params.id, createdBy: req.session.user.id })
            .select("title htmlCode version")
            .lean();
        if (!c) {
            return res.status(404).render("error", { layout: "main", title: "Not found", message: "That component isn't in your library.", user: req.session.user });
        }
        const data = { id: String(c._id), title: c.title, version: c.version || 1, htmlCode: c.htmlCode };
        res.render("main/design", {
            layout: "canvas",
            title: `Design: ${c.title}`,
            componentTitle: c.title,
            dataJson: JSON.stringify(data).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, ""),
        });
    } catch (error) {
        res.status(404).render("error", { layout: "main", title: "Not found", message: "That component isn't in your library.", user: req.session.user });
    }
});

export default router;
