import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";

// Builds the plugin and runs it against a pretend Figma (nodes shaped like the plugin API's), to catch mistakes in how it reads them.
const rgb = (r, g, b) => ({ r: r / 255, g: g / 255, b: b / 255 });
const abs = (x, y) => [[1, 0, x], [0, 1, y]];

function fakeNode(props) { return { visible: true, opacity: 1, children: undefined, ...props }; }

async function runPlugin(selection) {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wc-plugin-")), "code.js");
    await build({ entryPoints: [path.resolve(import.meta.dirname, "../plugin/code.js")], outfile: out, bundle: true, format: "iife", target: "es2019", logLevel: "silent" });
    const messages = [];
    const MIXED = Symbol("mixed");
    const handlers = {};
    const figma = {
        mixed: MIXED, currentPage: { selection },
        showUI() {}, closePlugin() {}, on() {}, openExternal() {}, clientStorage: { getAsync: async () => null, setAsync: async () => {} }, base64Encode: (b) => Buffer.from(b).toString("base64"),
        // the plugin window shrinks pictures: here, a stand-in that answers every job with a tiny WebP
        ui: { postMessage: (m) => { messages.push(m); if (m.type === "compress") setTimeout(() => handlers.onmessage({ type: "compressed", id: m.id, dataUri: `data:image/webp;base64,SHRUNK${m.width}x${m.height}${m.cover ? "c" : ""}` }), 0); }, set onmessage(fn) { handlers.onmessage = fn; } },
        getImageByHash: (hash) => ({ getBytesAsync: async () => new Uint8Array(900 * 1024).fill(hash.length) }),
    };
    vm.runInNewContext(fs.readFileSync(out, "utf8"), { figma, __html__: "", console, setTimeout, clearTimeout });
    handlers.onmessage({ type: "run" }); // the window asks for the conversion when the user presses the button
    for (let i = 0; i < 50 && !messages.some((m) => m.type === "result" || m.type === "error" || m.type === "empty"); i++) await new Promise((r) => setTimeout(r, 10));
    return messages.find((m) => m.type === "result" || m.type === "error" || m.type === "empty");
}

test("the plugin reads a frame, its group, text and a vector, and converts them", async () => {
    const title = fakeNode({
        type: "TEXT", name: "Title", id: "3", width: 80, height: 24, absoluteTransform: abs(130, 120), characters: "Hello", fontName: { family: "Inter", style: "Bold" },
        fontSize: 20, fontWeight: 700, lineHeight: { unit: "AUTO" }, letterSpacing: { unit: "PIXELS", value: 0 }, textAlignHorizontal: "LEFT", textAutoResize: "WIDTH_AND_HEIGHT",
        fills: [{ type: "SOLID", color: rgb(0, 0, 0), opacity: 1, visible: true }], getStyledTextSegments: () => [{ characters: "Hello", fontName: { family: "Inter", style: "Bold" }, fontSize: 20, fontWeight: 700, fills: [{ type: "SOLID", color: rgb(0, 0, 0), opacity: 1 }] }],
    });
    const group = fakeNode({ type: "GROUP", name: "Group", id: "2", width: 80, height: 24, absoluteTransform: abs(130, 120), children: [title] });
    const icon = fakeNode({ type: "VECTOR", name: "Icon", id: "4", width: 24, height: 24, absoluteTransform: abs(300, 140), absoluteRenderBounds: { x: 300, y: 140, width: 24, height: 24 }, exportAsync: async () => '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0"/></svg>' });
    const frame = fakeNode({
        type: "FRAME", name: "Page", id: "1", width: 400, height: 200, absoluteTransform: abs(100, 100), layoutMode: "NONE", clipsContent: true,
        fills: [{ type: "SOLID", color: rgb(255, 255, 255), opacity: 1, visible: true }], children: [group, icon],
    });
    const r = await runPlugin([frame]);
    assert.equal(r.type, "result", JSON.stringify(r));
    const [page] = r.pages;
    assert.equal(page.title, "Page");
    assert.equal(page.layers, 4);
    assert.equal(page.stats.text, 1);
    assert.equal(page.stats.assets, 1);
    assert.match(page.html, /<div class="[^"]*w-\[400px\][^"]*h-\[200px\][^"]*relative[^"]*overflow-hidden[^"]*bg-\[#ffffff\]/);
    // the group sits at (30, 20) in the frame; its text at (0, 0) inside the group
    assert.match(page.html, /<div class="absolute left-\[30px\] top-5 w-20 h-6"><p class="absolute left-0 top-0[^"]*font-bold[^"]*">Hello<\/p><\/div>/);
    assert.match(page.html, /<div class="absolute left-\[200px\] top-10 w-6 h-6"><svg /); // the vector sits at (200, 40) from the frame
    assert.deepEqual(Array.from(page.fonts), ["Inter"]); // (copied: the plugin ran in its own realm)
});

test("pictures are shrunk by the plugin window: a shape's render becomes an img, a frame's fill a background", async () => {
    const photo = fakeNode({ type: "RECTANGLE", name: "Photo", id: "2", width: 566, height: 720, absoluteTransform: abs(900, 100), absoluteRenderBounds: { x: 900, y: 100, width: 566, height: 720 },
        fills: [{ type: "IMAGE", imageHash: "h1", scaleMode: "FILL", visible: true }], exportAsync: async () => new Uint8Array(900 * 1024) }); // far over the old 300 KB limit
    const hero = fakeNode({ type: "FRAME", name: "Hero", id: "3", width: 1920, height: 600, absoluteTransform: abs(100, 100),
        fills: [{ type: "IMAGE", imageHash: "hero", scaleMode: "FILL", visible: true }],
        children: [fakeNode({ type: "RECTANGLE", name: "Tint", id: "5", width: 10, height: 10, absoluteTransform: abs(100, 100), fills: [{ type: "SOLID", color: rgb(0, 0, 0), opacity: 1, visible: true }] })] });
    const page = fakeNode({ type: "FRAME", name: "Page", id: "1", width: 1920, height: 1000, absoluteTransform: abs(100, 100), layoutMode: "NONE", children: [hero, photo] });
    const r = await runPlugin([page]);
    assert.equal(r.type, "result", JSON.stringify(r));
    const [p] = r.pages;
    assert.equal(p.warnings.length, 0, JSON.stringify(p.warnings));
    assert.match(p.html, /<img src="data:image\/webp;base64,SHRUNK566x720" /);
    assert.match(p.html, /style="background-image:url\(data:image\/webp;base64,SHRUNK1920x600c\)"/);
});

test("nothing selected is reported, not an error", async () => {
    assert.equal((await runPlugin([])).type, "empty");
});
