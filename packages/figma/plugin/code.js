// The plugin: reads the selected frames, converts them (src/convert.js, in this sandbox: nothing leaves your computer) and
// hands the HTML to the window to copy.
import { snapshotDesign } from "./snapshot.js";
import { convertDesign } from "../src/convert.js";

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

const MAX_DESIGN_BYTES = 1000000; // what Windcraft saves per design

async function run() {
    const selection = figma.currentPage.selection.filter((n) => PAGE_TYPES.has(n.type));
    if (!selection.length) return figma.ui.postMessage({ type: "empty" });
    const pages = [];
    for (const node of selection) {
        figma.ui.postMessage({ type: "progress", name: node.name });
        const { tree, warnings, count } = await snapshotDesign(node, (n) => figma.ui.postMessage({ type: "progress", name: node.name, count: n }), compress);
        const result = convertDesign(tree, { title: node.name });
        if (result.size > MAX_DESIGN_BYTES) warnings.push(`This page is ${Math.round(result.size / 1024)} KB; Windcraft saves up to 1 MB per design. The pictures are most of it: use fewer or smaller ones.`);
        pages.push({ title: node.name, width: node.width, height: node.height, html: result.html, layers: count, stats: result.stats, fonts: result.fonts, missing: result.missing, size: result.size, warnings: [...warnings, ...result.warnings] });
    }
    figma.ui.postMessage({ type: "result", pages });
}

// where to send, remembered on this computer (the token is the user's own, made on Windcraft's Connect page)
const SETTINGS = "windcraft-send";
figma.clientStorage.getAsync(SETTINGS).then((saved) => figma.ui.postMessage({ type: "settings", saved: saved || {} })).catch(() => {});

figma.ui.onmessage = (msg) => {
    if (msg.type === "open" && /^https?:\/\//.test(msg.url)) { figma.openExternal(msg.url); return; }
    if (msg.type === "save-settings") { figma.clientStorage.setAsync(SETTINGS, msg.settings).catch(() => {}); return; }
    if (msg.type === "compressed") { const done = pending.get(msg.id); pending.delete(msg.id); if (done) done(msg.dataUri || null); return; }
    if (msg.type === "run") run().catch((e) => figma.ui.postMessage({ type: "error", message: String((e && e.message) || e) }));
    if (msg.type === "close") figma.closePlugin();
};
// the window lists the frames that will be converted, and keeps the list up to date as the selection changes
const sendSelection = () => figma.ui.postMessage({ type: "selection", frames: figma.currentPage.selection.filter((n) => PAGE_TYPES.has(n.type)).map((n) => ({ name: n.name, width: n.width, height: n.height })) });
figma.on("selectionchange", sendSelection);
setTimeout(sendSelection, 50);
