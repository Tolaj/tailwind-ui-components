import express from "express";
import mongoose from "mongoose";
import Component from "../models/component.model.js";
import User from "../models/user.model.js";
import { categories } from "./home.routes.js";

// The site owners' screens (see ADMIN_EMAILS in middlewares/auth.js). Reported designs stay in the gallery until an owner removes them.
export const adminPages = express.Router();
export const adminApi = express.Router();

adminPages.get("/reports", async (req, res) => {
    const reported = await Component.find({ "reports.0": { $exists: true } }).select("title category description likes isPublished createdBy reports updatedAt").sort("-updatedAt").lean();
    const owners = new Map((await User.find({ _id: { $in: reported.map((c) => c.createdBy) } }).select("name email").lean()).map((u) => [String(u._id), u]));
    const rows = reported.map((c) => {
        const by = {};
        c.reports.forEach((r) => { by[r.reason] = (by[r.reason] || 0) + 1; });
        const owner = owners.get(String(c.createdBy)) || {};
        return {
            id: String(c._id), title: c.title, categoryName: categories[c.category]?.name || c.category, likes: c.likes || 0, public: Boolean(c.isPublished),
            owner: owner.name ? `${owner.name} (${owner.email})` : "unknown", count: c.reports.length,
            reasons: Object.entries(by).map(([reason, n]) => `${reason} ×${n}`).join(", "),
            notes: c.reports.filter((r) => r.note).map((r) => r.note),
        };
    });
    res.render("main/admin-reports", { layout: "main", title: "Reports", activePage: "reports", user: req.session.user, rows });
});

/** Take the design out of the gallery (it becomes private to its owner) and clear its reports. */
adminApi.post("/reports/:id/remove", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    await Component.updateOne({ _id: req.params.id }, { $set: { isPublished: false, reports: [] } });
    res.json({ success: true });
});
/** Keep the design in the gallery and clear its reports. */
adminApi.post("/reports/:id/dismiss", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Not found" });
    await Component.updateOne({ _id: req.params.id }, { $set: { reports: [] } });
    res.json({ success: true });
});
