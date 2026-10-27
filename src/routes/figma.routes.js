import express from "express";
import { authenticateBearer } from "../services/bearer.service.js";
import { saveFont, removeFont, withFonts, haveFamilies } from "../services/fonts.service.js";
import User from "../models/user.model.js";
import zlib from "zlib";
import ConversionSample from "../models/conversionSample.model.js";
import FigmaDraftSource from "../models/figmaDraftSource.model.js";
import FigmaChunk from "../models/figmaChunk.model.js";
import { MAX_HTML, UPLOAD_ID, CHUNK_MAX, SOURCE_MAX_CHUNKS, assembleUpload, dropUpload, convertOnServer, savePage, keepSource, gridsOf } from "../services/figma-save.service.js";
import FigmaDraft from "../models/figmaDraft.model.js";
import { listProjects } from "../services/project.service.js";
import { startLink, collectLink, signOutToken } from "../services/figma-link.service.js";
import { publicBase } from "../utils/publicUrl.js";
import { limit, rateLimited } from "../utils/rateLimit.js";
import { DEFAULT_RULES } from "../../packages/figma/src/rules.js";

const router = express.Router();

// The Figma plugin window has no origin of its own, so it is allowed from anywhere. That is safe here: the request
// is checked by the Bearer token in its header, and no cookie or session is read.
router.use((req, res, next) => {
    res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Content-Encoding, X-Upload-Id, X-Chunk-Index", "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS" });
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

/** What the plugin asks first: where Windcraft lives now (so the address can change later without a new plugin). */
router.get("/config", (req, res) => res.json({ ok: true, server: publicBase(req) }));

/** The converter's data rules (which free font stands in for a paid one, which names mean a button...): the plugin refreshes them on open, so they can improve without a new plugin version. */
router.get("/rules", (req, res) => {
    res.set("Cache-Control", "public, max-age=300");
    res.json({ ok: true, rules: DEFAULT_RULES });
});

/** Sign-in without a token: the plugin gets a code to open in the browser, then waits for the user to approve it there. */
router.post("/link", limit("figma-link", 30, 60 * 60 * 1000), async (req, res) => {
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
 * The Figma plugin saves one converted frame as a page in a project (a project is required: a new name creates it), using the plugin's
 * own HTML. When the user lets the Figma layer data come too, /convert-save is used instead: the server makes the code.
 */
router.post("/send", async (req, res) => {
    try {
        const userId = await bearer(req, res);
        if (!userId) return;
        if (rateLimited("figma-send", userId, 200, 60 * 60 * 1000)) return res.status(429).json({ ok: false, message: "That is a lot of saves in an hour. Try again in a little while." });
        const { title, html, project, mode, width } = req.body || {};
        if (typeof title !== "string" || typeof html !== "string" || !title.trim() || !html.trim()) return res.status(400).json({ ok: false, message: "title and html are required" });
        if (html.length > MAX_HTML) return res.status(413).json({ ok: false, message: "This page is over 5 MB: use fewer or smaller pictures." });
        if (typeof project !== "string" || !project.trim()) return res.status(400).json({ ok: false, message: "Choose a project to save in, or give a name to create one." });
        const base = publicBase(req);
        const { status, body } = await savePage(userId, { title, html: await withFonts(html, base), project, mode, width, base });
        res.status(status).json(body);
    } catch (error) {
        console.error("Figma send error:", error);
        res.status(500).json({ ok: false, message: "Could not save the design" });
    }
});

// ── Keeping the Figma layer data with a saved page ────────────────────────────────────────────────────────────────────────────
// The data (gzipped, with its pictures) can be bigger than a host accepts in one request, so the plugin sends it in pieces of up to
// 3 MB, then says which page it belongs to; the pieces are joined, checked and kept next to the page.
router.post("/upload/chunk", express.raw({ type: "application/octet-stream", limit: "4mb" }), async (req, res) => {
    try {
        const userId = await bearer(req, res);
        if (!userId) return;
        if (rateLimited("figma-chunk", userId, 300, 60 * 60 * 1000)) return res.status(429).json({ ok: false, message: "Too many uploads in an hour. Try again in a little while." });
        const uploadId = String(req.get("x-upload-id") || ""), index = Number(req.get("x-chunk-index"));
        if (!UPLOAD_ID.test(uploadId) || !Number.isInteger(index) || index < 0 || index >= SOURCE_MAX_CHUNKS) return res.status(400).json({ ok: false, message: "Not a valid upload piece." });
        if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > CHUNK_MAX) return res.status(400).json({ ok: false, message: "A piece must be up to 3 MB." });
        await FigmaChunk.findOneAndUpdate({ uploadId, index }, { userId, data: req.body, createdAt: new Date() }, { upsert: true });
        res.json({ ok: true });
    } catch (error) {
        console.error("Figma chunk error:", error);
        res.status(500).json({ ok: false, message: "Could not store that piece" });
    }
});

/**
 * Saves a page from the Figma layer data the plugin uploaded, converting it HERE with this server's converter and rules (the newest
 * ones: the plugin's own copy can be older). The pieces stay for a retry (a name clash asks the user, then calls this again with a mode)
 * and go once the page is saved. The layer data is kept with the page, so the editor can convert it again later.
 */
router.post("/convert-save", async (req, res) => {
    try {
        const userId = await bearer(req, res);
        if (!userId) return;
        if (rateLimited("figma-send", userId, 200, 60 * 60 * 1000)) return res.status(429).json({ ok: false, message: "That is a lot of saves in an hour. Try again in a little while." });
        const { uploadId, chunks, title, project, mode } = req.body || {};
        if (typeof title !== "string" || !title.trim()) return res.status(400).json({ ok: false, message: "A title is needed." });
        if (typeof project !== "string" || !project.trim()) return res.status(400).json({ ok: false, message: "Choose a project to save in, or give a name to create one." });
        const { gz, snapshot } = await assembleUpload(userId, uploadId, chunks);
        const base = publicBase(req);
        const result = await convertOnServer(snapshot, { title: title.trim(), base });
        if (result.html.length > MAX_HTML) { await dropUpload(userId, uploadId); return res.status(413).json({ ok: false, message: "This page is over 5 MB: use fewer or smaller pictures." }); }
        const { status, body } = await savePage(userId, { title, html: result.html, project, mode, width: snapshot.width, base });
        if (status === 200 && body.id) {
            await keepSource(userId, body.id, gz, snapshot, result);
            await dropUpload(userId, uploadId);
            return res.json({ ...body, converter: result.converter, rulesVersion: result.rulesVersion, warnings: result.warnings, size: result.size });
        }
        if (status !== 409) await dropUpload(userId, uploadId); // a name clash keeps the pieces for the next call
        res.status(status).json(body);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ ok: false, message: error.message });
        console.error("Figma convert-save error:", error);
        res.status(500).json({ ok: false, message: "Could not save the design" });
    }
});

/** A design the user chose to share (or report) to improve the converter: the layer data, what we made of it, and a note. */
router.post("/sample", async (req, res) => {
    try {
        const userId = await bearer(req, res);
        if (!userId) return;
        if (rateLimited("figma-sample", userId, 60, 60 * 60 * 1000)) return res.status(429).json({ ok: false, message: "Too many shared designs in an hour. Try again in a little while." });
        const { snapshot, html, kind, note, converter, title, anonymized } = req.body || {};
        if (!snapshot || typeof snapshot !== "object" || typeof html !== "string" || !html.trim()) return res.status(400).json({ ok: false, message: "A design to share is needed." });
        const dims = Number.isFinite(snapshot.width) && Number.isFinite(snapshot.height) ? { width: snapshot.width, height: snapshot.height } : {};
        const sample = await ConversionSample.create({
            userId, kind: kind === "report" ? "report" : "share", converter: String(converter || "").slice(0, 20), title: String(title || "").slice(0, 120),
            note: String(note || "").slice(0, 1000), anonymized: anonymized === true, ...dims,
            snapshotGz: zlib.gzipSync(JSON.stringify(snapshot)), htmlGz: zlib.gzipSync(html),
        });
        res.json({ ok: true, id: String(sample._id) });
    } catch (error) {
        console.error("Figma sample error:", error);
        res.status(500).json({ ok: false, message: "Could not save the shared design" });
    }
});

/** Opens the editor on a design without saving it to the library: it is kept for a day as a draft. From the plugin's HTML, or converted here from uploaded layer data. */
router.post("/draft", async (req, res) => {
    try {
        const userId = await bearer(req, res);
        if (!userId) return;
        if (rateLimited("figma-draft", userId, 100, 60 * 60 * 1000)) return res.status(429).json({ ok: false, message: "Too many editor drafts in an hour. Try again in a little while." });
        const { title, uploadId, chunks } = req.body || {};
        let { html } = req.body || {};
        const base = publicBase(req);
        let kept = null; // the layer data, when it came: it goes with the draft, and on to the page if the draft is saved
        if (uploadId) {
            const { gz, snapshot } = await assembleUpload(userId, uploadId, chunks);
            const result = await convertOnServer(snapshot, { title: String(title || snapshot.name || "Design"), base });
            html = result.html;
            kept = { gz, snapshot, result };
            await dropUpload(userId, uploadId);
        } else if (typeof html === "string") html = await withFonts(html, base);
        if (typeof html !== "string" || !html.trim() || html.length > MAX_HTML) return res.status(400).json({ ok: false, message: "A design up to 5 MB is needed." });
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const width = kept ? kept.snapshot.width : req.body.width;
        const draft = await FigmaDraft.create({ userId, title: String(title || "").slice(0, 120), html, expiresAt, ...(Number.isFinite(width) && width >= 200 && width <= 10000 ? { width } : {}) });
        if (kept) await FigmaDraftSource.create({ userId, draft: draft._id, converter: kept.result.converter, rulesVersion: kept.result.rulesVersion, width: kept.snapshot.width, height: kept.snapshot.height, grids: gridsOf(kept.snapshot), snapshotGz: kept.gz, expiresAt });
        res.json({ ok: true, url: `${base}/design/new?draft=${draft._id}` });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ ok: false, message: error.message });
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
        if (rateLimited("figma-font", userId, 40, 60 * 60 * 1000)) return res.status(429).json({ ok: false, message: "Too many font uploads in an hour. Try again in a little while." });
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
