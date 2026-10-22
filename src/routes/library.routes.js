import express from "express";
import Component from "../models/component.model.js";
import User from "../models/user.model.js";
import { categories } from "./home.routes.js";
import { buildDesignGuide } from "../services/guide.service.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [components, account] = await Promise.all([
            Component.find({ createdBy: userId })
                .select("title description category tags version htmlCode isPublished forkedFrom useAsReference updatedAt createdAt")
                .sort("-updatedAt")
                .lean(),
            User.findById(userId).select("apiTokenPrefix").lean(),
        ]);

        const tagCounts = {};
        components.forEach((c) => (c.tags || []).forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));

        const data = components.map((c) => ({
            id: String(c._id),
            title: c.title,
            description: c.description,
            category: c.category,
            categoryName: categories[c.category]?.name || c.category,
            tags: c.tags || [],
            version: c.version || 1,
            htmlCode: c.htmlCode,
            isPublished: c.isPublished,
            forked: Boolean(c.forkedFrom),
            useAsReference: c.useAsReference !== false,
            updatedAt: c.updatedAt,
        }));

        res.render("main/library", {
            layout: "main",
            activePage: "library",
            title: "Library",
            user: req.session.user,
            count: data.length,
            tags: Object.entries(tagCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            tokenPrefix: account?.apiTokenPrefix || "",
            mcpUrl: `${req.protocol}://${req.get("host")}/mcp`,
            libraryJson: JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, ""),
        });
    } catch (error) {
        console.error("Library error:", error);
        res.status(500).render("error", { layout: "main", title: "Error", message: "Failed to load your library" });
    }
});

router.get("/design-guide.md", async (req, res) => {
    try {
        const { markdown } = await buildDesignGuide(req.session.user.id);
        res.type("text/markdown; charset=utf-8");
        if (req.query.download) res.attachment("design-guide.md");
        res.send(markdown);
    } catch (error) {
        console.error("Design guide error:", error);
        res.status(500).type("text/plain").send("Could not build the design guide");
    }
});

export default router;
