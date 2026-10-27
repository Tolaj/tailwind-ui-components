import zlib from "zlib";
import FigmaChunk from "../models/figmaChunk.model.js";
import FigmaSource from "../models/figmaSource.model.js";
import { callTool } from "../mcp/tools.js";
import { withFonts } from "./fonts.service.js";
import { convertDesign } from "../../packages/figma/src/convert.js";
import { DEFAULT_RULES } from "../../packages/figma/src/rules.js";

export const MAX_HTML = 5_000_000;
export const CHUNK_MAX = 3.5 * 1024 * 1024; // a piece of an upload (the plugin sends 3 MB)
export const SOURCE_MAX_CHUNKS = 5; // 5 pieces of 3 MB: up to ~15 MB gzipped (a document can hold 16 MB)
export const UPLOAD_ID = /^[a-z0-9_-]{16,64}$/i;

const toBuffer = (b) => (Buffer.isBuffer(b) ? b : Buffer.from(b.buffer || b));
const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });

/** Joins the pieces of an upload and reads the Figma layer data in them. Throws an error with a status and a plain message. */
export async function assembleUpload(userId, uploadId, chunks) {
    if (!UPLOAD_ID.test(String(uploadId || "")) || !Number.isInteger(chunks) || chunks < 1 || chunks > SOURCE_MAX_CHUNKS) throw fail(400, "A finished upload is needed.");
    const pieces = await FigmaChunk.find({ userId, uploadId }).sort("index").lean();
    if (pieces.length !== chunks || pieces.some((p, i) => p.index !== i)) throw fail(400, "Some pieces did not arrive. Try again.");
    const gz = Buffer.concat(pieces.map((p) => toBuffer(p.data)));
    let snapshot;
    try { snapshot = JSON.parse(zlib.gunzipSync(gz, { maxOutputLength: 80 * 1024 * 1024 }).toString("utf8")); } catch { throw fail(400, "That is not Figma layer data."); }
    if (!snapshot || typeof snapshot.type !== "string" || !Number.isFinite(snapshot.width) || !Number.isFinite(snapshot.height)) throw fail(400, "That is not Figma layer data.");
    return { gz, snapshot };
}

export const dropUpload = (userId, uploadId) => FigmaChunk.deleteMany({ userId, uploadId });

/** The server's conversion of layer data: the newest rules this server has, which the plugin's own copy may not have yet. */
export async function convertOnServer(snapshot, { title, base }) {
    const result = convertDesign(snapshot, { title, rules: DEFAULT_RULES });
    return { ...result, html: await withFonts(result.html, base) };
}

/**
 * Saves one page in a project (a new name creates the project). A page with the same name already there is not touched unless `mode`
 * says what to do: "replace" saves it as the page's next version, "copy" keeps both under a numbered name. Otherwise the answer is
 * { status: 409, conflict: true } with the choice to make. Resolves to { status, body } for the route to send.
 */
export async function savePage(userId, { title, html, project, mode, width, base }) {
    const baseTitle = String(title).trim().slice(0, 110);
    let name = baseTitle;
    for (let n = 2; n < 12; n++) {
        const args = { title: name, html, project: project.trim(), note: "From Figma", ...(Number.isFinite(width) && width >= 200 && width <= 10000 ? { width } : {}) };
        let out = await callTool(userId, "save_design", mode === "replace" ? { ...args, force: true } : args);
        const raw = out?.content?.[0]?.text || "";
        const clash = out?.isError && /already exists \(id ([a-f0-9]{24}), v(\d+)\)/.exec(raw);
        if (clash && mode === "replace") out = await callTool(userId, "save_design", { ...args, id: clash[1], force: true, baseVersion: Number(clash[2]) });
        else if (clash && mode === "copy") { name = `${baseTitle} (${n})`; continue; }
        else if (clash) return { status: 409, body: { ok: false, conflict: true, title: baseTitle, message: `"${baseTitle}" is already in this project.` } };
        const text = out?.content?.[0]?.text || "";
        let data = null;
        try { data = JSON.parse(text); } catch { /* a plain message */ }
        if (out?.isError) return { status: 422, body: { ok: false, message: text || "Could not save" } };
        return { status: 200, body: { ok: true, message: data?.message || text, url: data?.page?.id ? `${base}/design/${data.page.id}` : `${base}/library`, id: data?.page?.id || null, project: data?.project?.name || null } };
    }
    return { status: 409, body: { ok: false, message: "Too many pages with that name in this project." } };
}

/** The layout grids of the design's top frame that are switched on, trimmed to what the editor draws. */
export const gridsOf = (snapshot) => ((snapshot.meta && snapshot.meta.layoutGrids) || [])
    .filter((g) => g && g.visible !== false && ["COLUMNS", "ROWS", "GRID"].includes(g.pattern))
    .slice(0, 4)
    .map(({ pattern, color, alignment, gutterSize, count, sectionSize, offset }) => ({ pattern, color, alignment, gutterSize, count, sectionSize, offset }));

/** Keeps the layer data (as received, gzipped) next to a saved page: one per page, a new save replaces it. */
export async function keepSource(userId, componentId, gz, snapshot, result) {
    await FigmaSource.findOneAndUpdate({ component: componentId }, {
        userId, converter: result.converter, rulesVersion: result.rulesVersion, width: snapshot.width, height: snapshot.height, grids: gridsOf(snapshot), snapshotGz: gz,
    }, { upsert: true });
}
