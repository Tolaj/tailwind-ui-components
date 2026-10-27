import express from "express";
import { authenticateBearer } from "../services/bearer.service.js";
import { callTool } from "../mcp/tools.js";
import { saveFont, removeFont, withFonts, haveFamilies } from "../services/fonts.service.js";
import User from "../models/user.model.js";
import FigmaDraft from "../models/figmaDraft.model.js";
import { listProjects } from "../services/project.service.js";
import { startLink, collectLink, signOutToken } from "../services/figma-link.service.js";
import { publicBase } from "../utils/publicUrl.js";

const router = express.Router();

// The Figma plugin window has no origin of its own, so it is allowed from anywhere. That is safe here: the request
// is checked by the Bearer token in its header, and no cookie or session is read.
router.use((req, res, next) => {
    res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS" });
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

/** What the plugin asks first: where Windcraft lives now (so the address can change later without a new plugin). */
router.get("/config", (req, res) => res.json({ ok: true, server: publicBase(req) }));

/** Sign-in without a token: the plugin gets a code to open in the browser, then waits for the user to approve it there. */
router.post("/link", async (req, res) => {
    const { code, secret } = await startLink();
    res.json({ ok: true, secret, code, url: `${publicBase(req)}/figma/authorize?code=${encodeURIComponent(code)}` });
});
router.post("/link/poll", async (req, res) => res.json({ ok: true, ...(await collectLink(req.body?.code, req.body?.secret)) }));

/** Who the token belongs to (the plugin shows it, and notices a token that stopped working). */
router.get("/me", async (req, res) => {
    const userId = await authenticateBearer(req);
    if (!userId) return res.status(401).json({ ok: false, message: "Signed out" });
    const user = await User.findById(userId).select("name email").lean();
    res.json({ ok: true, user: { name: user?.name || "", email: user?.email || "" } });
});

/** Signing out in the plugin ends its sign-in (a personal API token is left alone: it is managed on the Connect page). */
router.post("/signout", async (req, res) => {
    const token = (req.get("authorization") || "").replace(/^Bearer\s+/, "").trim();
    res.json({ ok: true, removed: await signOutToken(token) });
});

const MAX_HTML = 1000000;
const bearer = async (req, res) => {
    const userId = await authenticateBearer(req);
    if (!userId) res.status(401).json({ ok: false, message: "Your sign-in ended. Sign in again." });
    return userId;
};

/** The user's projects, for the "save in" choice. */
router.get("/projects", async (req, res) => {
    const userId = await bearer(req, res);
    if (!userId) return;
    res.json({ ok: true, projects: (await listProjects(userId)).map((p) => ({ id: p.id, name: p.name, pages: p.pages })) });
});

/**
 * The Figma plugin saves one converted frame as a page in a project (a project is required: a new name creates it).
 * A page with the same name already in that project is not touched unless the plugin says what to do: mode "replace" saves it as
 * the page's next version, mode "copy" keeps both under a numbered name. Otherwise the answer is 409 with the choices.
 */
router.post("/send", async (req, res) => {
    try {
        const userId = await bearer(req, res);
        if (!userId) return;
        const { title, html, project, mode } = req.body || {};
        if (typeof title !== "string" || typeof html !== "string" || !title.trim() || !html.trim()) return res.status(400).json({ ok: false, message: "title and html are required" });
        if (html.length > MAX_HTML) return res.status(413).json({ ok: false, message: "This page is over 1 MB: use fewer or smaller pictures." });
        if (typeof project !== "string" || !project.trim()) return res.status(400).json({ ok: false, message: "Choose a project to save in, or give a name to create one." });
        const withFont = await withFonts(html, publicBase(req));
        const baseTitle = title.trim().slice(0, 110);
        let name = baseTitle;
        for (let n = 2; n < 12; n++) {
            const args = { title: name, html: withFont, project: project.trim(), note: "From Figma" };
            let out = await callTool(userId, "save_design", mode === "replace" ? { ...args, force: true } : args);
            const raw = out?.content?.[0]?.text || "";
            const clash = out?.isError && /already exists \(id ([a-f0-9]{24}), v(\d+)\)/.exec(raw);
            if (clash && mode === "replace") { out = await callTool(userId, "save_design", { ...args, id: clash[1], force: true, baseVersion: Number(clash[2]) }); }
            else if (clash && mode === "copy") { name = `${baseTitle} (${n})`; continue; }
            else if (clash) return res.status(409).json({ ok: false, conflict: true, title: baseTitle, message: `"${baseTitle}" is already in this project.` });
            const text = out?.content?.[0]?.text || "";
            let data = null;
            try { data = JSON.parse(text); } catch { /* a plain message */ }
            if (out?.isError) return res.status(422).json({ ok: false, message: text || "Could not save" });
            return res.json({ ok: true, message: data?.message || text, url: data?.page?.id ? `${publicBase(req)}/design/${data.page.id}` : `${publicBase(req)}/library`, id: data?.page?.id || null, project: data?.project?.name || null });
        }
        res.status(409).json({ ok: false, message: "Too many pages with that name in this project." });
    } catch (error) {
        console.error("Figma send error:", error);
        res.status(500).json({ ok: false, message: "Could not save the design" });
    }
});

/** Opens the editor on a design without saving it to the library: it is kept for a day as a draft. */
router.post("/draft", async (req, res) => {
    try {
        const userId = await bearer(req, res);
        if (!userId) return;
        const { title, html } = req.body || {};
        if (typeof html !== "string" || !html.trim() || html.length > MAX_HTML) return res.status(400).json({ ok: false, message: "A design up to 1 MB is needed." });
        const draft = await FigmaDraft.create({ userId, title: String(title || "").slice(0, 120), html: await withFonts(html, publicBase(req)), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
        res.json({ ok: true, url: `${publicBase(req)}/design/new?draft=${draft._id}` });
    } catch (error) {
        console.error("Figma draft error:", error);
        res.status(500).json({ ok: false, message: "Could not open the editor" });
    }
});

/** Which fonts the user already uploaded, among the ones a design is missing. */
router.post("/fonts/have", async (req, res) => {
    const userId = await authenticateBearer(req);
    if (!userId) return res.status(401).json({ ok: false, message: "That token was not accepted." });
    const families = (Array.isArray(req.body?.families) ? req.body.families : []).filter((f) => typeof f === "string").slice(0, 50);
    res.json({ ok: true, have: await haveFamilies(families) });
});

/** Adds a font file to the library every user shares (base64 in the JSON body: fonts are small as .woff2). */
router.post("/fonts", async (req, res) => {
    try {
        const userId = await authenticateBearer(req);
        if (!userId) return res.status(401).json({ ok: false, message: "That token was not accepted." });
        res.json({ ok: true, font: await saveFont(userId, req.body || {}) });
    } catch (error) {
        res.status(400).json({ ok: false, message: error.message });
    }
});

router.delete("/fonts/:id", async (req, res) => {
    const userId = await authenticateBearer(req);
    if (!userId) return res.status(401).json({ ok: false, message: "That token was not accepted." });
    res.json({ ok: true, removed: await removeFont(userId, req.params.id) });
});

export default router;
