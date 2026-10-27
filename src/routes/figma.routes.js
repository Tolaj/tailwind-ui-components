import express from "express";
import { authenticateBearer } from "../services/bearer.service.js";
import { callTool } from "../mcp/tools.js";
import { publicBase } from "../utils/publicUrl.js";

const router = express.Router();

// The Figma plugin window has no origin of its own, so it is allowed from anywhere. That is safe here: the request
// is checked by the Bearer token in its header, and no cookie or session is read.
router.use((req, res, next) => {
    res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

/** The Figma plugin sends one converted frame: it is saved as a page (a new version when the page already exists). */
router.post("/send", async (req, res) => {
    try {
        const userId = await authenticateBearer(req);
        if (!userId) return res.status(401).json({ ok: false, message: "That token was not accepted. Make a new one on the Connect page." });
        const { title, html, project } = req.body || {};
        if (typeof title !== "string" || typeof html !== "string" || !title.trim() || !html.trim()) return res.status(400).json({ ok: false, message: "title and html are required" });
        const out = await callTool(userId, "save_design", { title: title.trim().slice(0, 120), html, project: typeof project === "string" && project.trim() ? project.trim() : undefined, note: "From Figma" });
        const raw = out?.content?.[0]?.text || "";
        let data = null;
        try { data = JSON.parse(raw); } catch { /* a plain message */ }
        if (out?.isError) return res.status(422).json({ ok: false, message: raw || "Could not save" });
        res.json({ ok: true, message: data?.message || raw, url: data?.page?.id ? `${publicBase(req)}/design/${data.page.id}` : `${publicBase(req)}/library` });
    } catch (error) {
        console.error("Figma send error:", error);
        res.status(500).json({ ok: false, message: "Could not save the design" });
    }
});

export default router;
