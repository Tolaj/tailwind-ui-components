// The plugin: reads the selected frames, converts them (src/convert.js, in this sandbox: nothing leaves your computer) and
// hands the HTML to the window to copy.
import { snapshotDesign } from "./snapshot.js";
import { convertDesign, CONVERTER_VERSION } from "../src/convert.js";

const PAGE_TYPES = new Set(["FRAME", "COMPONENT", "INSTANCE", "SECTION"]);

figma.showUI(__html__, { width: 400, height: 660, themeColors: true });

// Shrinking a picture needs a canvas, which only the plugin window has: ask it, wait for the answer.
const pending = new Map();
let nextJob = 1;
const compress = (job) => new Promise((resolve) => {
    const id = nextJob++;
    pending.set(id, resolve);
    figma.ui.postMessage({ type: "compress", id, ...job });
    setTimeout(() => { if (pending.delete(id)) resolve(null); }, 20000);
});

const MAX_DESIGN_BYTES = 5000000; // what Windcraft saves per design

let rules = null; // the data rules from Windcraft (fonts, names...), when the window got them; the converter has its own copy otherwise
let lastRun = []; // what the last conversion read: { node, tree } per frame, kept so the window can share or download it on request

/** The layer data without its pictures (those are large, and a design's pictures are the user's to keep). */
const withoutPictures = (tree) => JSON.parse(JSON.stringify(tree, (k, v) => ((k === "png" || k === "dataUri") && typeof v === "string" ? "[picture]" : v)));

/** Layer names and text replaced by dummy ones, so the structure and styles can be shared without what the design says. */
function anonymized(tree) {
    const dummy = (s) => String(s).replace(/[\p{L}\p{N}]/gu, "x");
    const walk = (n) => {
        n.name = String(n.type || "node").toLowerCase();
        delete n.meta; // style, variable and component names say what the design is about
        if (typeof n.characters === "string") n.characters = dummy(n.characters);
        if (Array.isArray(n.segments)) n.segments.forEach((s) => { if (typeof s.characters === "string") s.characters = dummy(s.characters); if (s.hyperlink) s.hyperlink = { type: "URL", value: "https://example.com" }; });
        (n.children || []).forEach(walk);
    };
    walk(tree);
    return tree;
}

async function run() {
    const selection = figma.currentPage.selection.filter((n) => PAGE_TYPES.has(n.type));
    if (!selection.length) return figma.ui.postMessage({ type: "empty" });
    const pages = [];
    lastRun = [];
    for (const node of selection) {
        figma.ui.postMessage({ type: "progress", name: node.name });
        const { tree, warnings, count } = await snapshotDesign(node, (n) => figma.ui.postMessage({ type: "progress", name: node.name, count: n }), compress);
        const result = convertDesign(tree, { title: node.name, rules });
        lastRun.push({ node, tree });
        if (result.size > MAX_DESIGN_BYTES) warnings.push(`This page is ${Math.round(result.size / 1024)} KB; Windcraft saves up to 5 MB per design. The pictures are most of it: use fewer or smaller ones.`);
        let thumb = null; // a small picture of the frame for the window (the top of it, if it is tall)
        try { thumb = `data:image/png;base64,${figma.base64Encode(await node.exportAsync({ format: "PNG", constraint: { type: "WIDTH", value: 260 } }))}`; } catch (e) { /* the window shows a placeholder */ }
        pages.push({ converter: CONVERTER_VERSION, rulesVersion: result.rulesVersion, thumb, title: node.name, width: node.width, height: node.height, html: result.html, layers: count, stats: result.stats, fonts: result.fonts, missing: result.missing, size: result.size, warnings: [...warnings, ...result.warnings] });
    }
    figma.ui.postMessage({ type: "result", pages });
}

// where to send, remembered on this computer (the token is the user's own, made on Windcraft's Connect page)
const SETTINGS = "windcraft-send";
figma.clientStorage.getAsync(SETTINGS).then((saved) => figma.ui.postMessage({ type: "settings", saved: saved || {} })).catch(() => {});

figma.ui.onmessage = (msg) => {
    if (msg.type === "open" && /^https?:\/\//.test(msg.url)) { figma.openExternal(msg.url); return; }
    if (msg.type === "rules") { rules = msg.rules; return; }
    if (msg.type === "save-settings") { figma.clientStorage.setAsync(SETTINGS, msg.settings).catch(() => {}); return; }
    if (msg.type === "compressed") { const done = pending.get(msg.id); pending.delete(msg.id); if (done) done(msg.dataUri || null); return; }
    if (msg.type === "run") run().catch((e) => figma.ui.postMessage({ type: "error", message: String((e && e.message) || e) }));
    if (msg.type === "get-sample") { // the layer data of one converted frame, for sharing (no pictures, optionally anonymised) or a dev download (whole)
        const f = lastRun[msg.index];
        if (!f) return figma.ui.postMessage({ type: "sample", id: msg.id, snapshot: null });
        let snapshot = msg.full ? f.tree : withoutPictures(f.tree);
        if (msg.anonymize) snapshot = anonymized(msg.full ? JSON.parse(JSON.stringify(snapshot)) : snapshot);
        figma.ui.postMessage({ type: "sample", id: msg.id, snapshot, html: msg.full ? null : convertDesign(snapshot, { title: snapshot.name, rules }).html });
        return;
    }
    if (msg.type === "get-reference") { // Figma's own picture of the frame at 1x, to score the conversion against (dev downloads)
        const f = lastRun[msg.index];
        f.node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } })
            .then((bytes) => figma.ui.postMessage({ type: "reference", id: msg.id, png: figma.base64Encode(bytes) }))
            .catch(() => figma.ui.postMessage({ type: "reference", id: msg.id, png: null }));
        return;
    }
    if (msg.type === "close") figma.closePlugin();
};
// the window lists the frames that will be converted, and keeps the list up to date as the selection changes
const sendSelection = () => figma.ui.postMessage({ type: "selection", frames: figma.currentPage.selection.filter((n) => PAGE_TYPES.has(n.type)).map((n) => ({ name: n.name, width: n.width, height: n.height })) });
figma.on("selectionchange", sendSelection);
setTimeout(sendSelection, 50);
