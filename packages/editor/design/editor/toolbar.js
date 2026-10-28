import { host } from "../host.js";
import { $, S, data, send } from "./base.js";
import { assembleDoc, loadFrame, step, updateChrome } from "./docs.js";
import { applyView, canvas, canvasSize, fitTo, handleWheel, layout, view, zoomAt } from "./plane.js";
import { activate, anyDirty, boardPayload, docDirty, docs, loadActiveFromStash, remapKey, saveBoard } from "./designs.js";
import { openDetails } from "./add-menu.js";

// ── Toolbar ──────────────────────────────────────────────────────────────────
/**
 * Editing, or the live page ("preview"): the Interact tool (P, or the play button) shows the page as it runs on a device, at the
 * device's width and height, with its hover, focus, clicks, typing, scrolling and JavaScript; any other tool, V or Esc edits again.
 */
function setMode(next) {
    if (next === S.mode) return;
    S.mode = next;
    $("playBtn").classList.toggle("on", S.mode === "preview");
    $("inspector").style.opacity = $("layers").style.opacity = S.mode === "edit" ? "" : "0.4";
    $("inspector").style.pointerEvents = $("layers").style.pointerEvents = S.mode === "edit" ? "" : "none";
    $("canvasHint").textContent = S.mode === "edit" ? "Click to select. Double-click text to edit it. Alt-drag to place freely. Scroll to pan, Ctrl/Cmd + scroll to zoom." : "Interact: hover, click, type and scroll as on the device. Press Esc or V to edit again.";
    updateShield();
    loadFrame();
    layout(); // the frame takes the device's height while it is live, and its content's height again when editing
}

export const DEFAULT_CATEGORY = "apps-general";

/** Writes one design: creates it the first time, a new version after that. */
async function persist(d) {
    const m = d.meta;
    const body = { htmlCode: assembleDoc(d.parsed, d.markup) };
    if (d.isNew) {
        const saved = await host.createComponent({
            ...body, title: m.title || "Untitled page", category: m.category || DEFAULT_CATEGORY, description: m.description || "A page on the canvas.",
            tags: (m.tags || []).join(","), isPublished: String(m.isPublished), project: m.project ? m.project.id : "",
            ...(S.draftKey && d.key === S.draftKey ? { draftId: data.draftId } : {}), // a draft from Figma: its Figma data moves to this page
        });
        m.id = saved._id;
        m.version = saved.version || 1;
        d.isNew = false;
        const old = d.key;
        remapKey(old, m.id);
        if (S.draftKey && old === S.draftKey) { S.draftKey = null; if (saved.figmaSource) setupFigmaButton(saved.figmaSource, m.id); } // after the key moved: the button shows for the design being edited
        if (d.board && m.project) saveBoard([boardPayload([m.id, d.board])]);
        if (m.id === S.curKey) host.showDesign(m.id);
    } else {
        const saved = await host.updateComponent(m.id, { ...body, note: "Edited in design canvas" });
        m.version = saved.version;
    }
    d.savedMarkup = d.markup;
}

async function save() {
    if (!anyDirty()) return;
    const dirty = [...docs.values()].filter(docDirty);
    const needsDetails = dirty.find((d) => d.isNew && !d.meta.category);
    $("saveBtn").disabled = true;
    $("saveState").textContent = "Saving...";
    try {
        for (const d of dirty) if (d !== needsDetails) await persist(d);
    } catch (err) {
        loadActiveFromStash();
        updateChrome();
        $("saveState").textContent = "Save failed";
        return alert(err.message || "Could not save");
    }
    loadActiveFromStash();
    if (needsDetails) { if (needsDetails.key !== S.curKey) activate(needsDetails.key); updateChrome(); return openDetails(); }
    updateChrome();
    $("saveState").textContent = dirty.length > 1 ? `Saved ${dirty.length} designs` : `Saved as v${data.version}`;
}

// The save button carries the save status itself ("Save", "Saving…", "Saved", "Retry"); the full message is its tooltip.
const SAVE_LABELS = [[/^saving/i, "Saving…"], [/failed/i, "Retry"], [/^saved/i, "Saved"]];
function syncSaveButton() {
    const text = $("saveState").textContent.trim();
    const hit = SAVE_LABELS.find(([re]) => re.test(text));
    $("saveBtn").textContent = hit ? hit[1] : "Save";
    $("saveBtn").title = text || "Save (Ctrl/Cmd+S)";
}

// ── Keyboard ─────────────────────────────────────────────────────────────────
const TOOL_KEYS = { v: "move", h: "hand", p: "interact", f: "frame", r: "rect", o: "ellipse", l: "line", t: "text", i: "image", b: "button" };

export function handleKey({ key, meta, shift, code }) {
    if (key === "escape" && S.mode === "preview") return setTool("move"); // Esc in the live page (it passes Esc on) or in the editor
    if (meta && key === "z") return step(shift ? 1 : -1);
    if (meta && key === "y") return step(1);
    if (meta && key === "s") return save();
    if (key === "!") { S.viewTouched = true; return fitTo([...docs.keys()]); }
    if (key === "@") { S.viewTouched = true; return fitTo([S.curKey]); }
    if (!meta && key === "l" && shift) return setTool("arrow");
    if (!meta && TOOL_KEYS[key]) return setTool(TOOL_KEYS[key]);
    if (!S.selected) return;
    // layer order (Ctrl/Cmd+] / [ one step, with Shift all the way), lock and hide, as in Figma
    if (meta && (code === "BracketRight" || code === "BracketLeft")) return send({ cmd: "order", mode: code === "BracketRight" ? (shift ? "front" : "forward") : (shift ? "back" : "backward") });
    if (meta && shift && key === "l") return send({ cmd: "lockSel" });
    if (meta && shift && key === "h") return send({ cmd: "hideSel" });
    if (meta && key === "d") return send({ cmd: "duplicateSel" });
    if (meta && key === "g") return send({ cmd: shift ? "ungroup" : "group" });
    if (!meta && shift && key === "a") return send({ cmd: "autoLayout" });
    if (!meta && shift && key === "g") return send({ cmd: "gridLayout" });
    if (S.selected.tag === "body") return;
    if (key === "delete" || key === "backspace") return send({ cmd: "deleteSel" });
}
/** Ctrl/Cmd + = / - zoom the plane around the middle of the canvas, Ctrl/Cmd + 0 back to 100% (the browser's own zoom is off). */
export function keyZoom(key) {
    const factor = key === "=" || key === "+" ? 1.25 : key === "-" || key === "_" ? 0.8 : key === "0" ? 1 / view.z : 0;
    if (!factor) return false;
    const [W, H] = canvasSize();
    S.viewTouched = true;
    zoomAt(factor, W / 2, H / 2);
    return true;
}

// ── Design tools: palette, panning, zoom ─────────────────────────────────────
const ICONS = {
    move: '<path d="M5 3l14 8-6 2-2 6z"/>',
    hand: '<path stroke-linecap="round" stroke-linejoin="round" d="M10 4v8m0-8a1.5 1.5 0 013 0v7m0-5.5a1.5 1.5 0 013 0V13m0-4.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L5 14a1.5 1.5 0 012.5-1.7L10 15"/>',
    interact: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 9l11 4.5-4.6 1.4L14 19.5z"/><path stroke-linecap="round" d="M6.5 3.5 7 6M3.5 6.5 6 7M4.5 10.5l2-1.5M10.5 4.5 9 6.5"/>',
    frame: '<path stroke-linecap="round" stroke-linejoin="round" d="M7 3v18M17 3v18M3 7h18M3 17h18"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
    ellipse: '<circle cx="12" cy="12" r="8"/>',
    line: '<path stroke-linecap="round" d="M5 19 19 5"/>',
    arrow: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M9 6h9v9"/>',
    text: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 6V4h14v2M12 4v16m-3 0h6"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 16l-5-5-8 8"/>',
    button: '<rect x="3" y="8" width="18" height="8" rx="4"/><path stroke-linecap="round" d="M9 12h6"/>',
};
const TOOLS = [["move", "Move", "V"], ["hand", "Hand (or hold Space)", "H"], ["interact", "Interact: use the page as on the device (hover, click, type, scroll)", "P"], ["frame", "Frame", "F"], ["shape"], ["text", "Text", "T"]]; // Image and Button live in the + (insert a block) menu; their I and B keys still draw them
// Rectangle, Oval, Arrow and Line share one button: it draws the shape you used last, the chevron picks another
const SHAPES = [["rect", "Rectangle", "R"], ["ellipse", "Oval", "O"], ["arrow", "Arrow", "⇧L"], ["line", "Line", "L"]];
let shape = "rect";
let spaceDown = false;

const toolIcon = (id) => `<svg class="h-[18px] w-[18px]" fill="${id === "move" ? "currentColor" : "none"}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${ICONS[id]}</svg>`;
const CHEVRON = '<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
function renderTools() {
    const menu = $("shapeMenu");
    const open = Boolean(menu) && !menu.classList.contains("hidden");
    const sh = SHAPES.find(([id]) => id === shape);
    $("toolbar").innerHTML = TOOLS.map(([id, label, key], i) => {
        const sep = i === 3 ? '<span class="mx-1 h-5 w-px bg-neutral-200"></span>' : "";
        if (id === "shape") {
            return `<div class="relative flex items-center"><button type="button" data-tool="${shape}" data-shapebtn title="${sh[1]} (${sh[2]})" class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100">${toolIcon(shape)}</button><button type="button" id="shapeMore" title="More shapes" class="flex h-8 w-5 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100">${CHEVRON}</button>
                <div id="shapeMenu" class="pop absolute left-0 top-10 z-50 ${open ? "" : "hidden"} w-48 p-1">${SHAPES.map(([sid, sl, sk], j) => `${j === 2 ? '<div class="my-1 h-px bg-neutral-100"></div>' : ""}<button type="button" data-shape="${sid}" class="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[12px] hover:bg-neutral-100">${toolIcon(sid)}<span>${sl}</span><span class="ml-auto text-neutral-400">${sk}</span></button>`).join("")}</div></div>`;
        }
        return `${sep}<button type="button" data-tool="${id}" title="${label} (${key})" class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100">${toolIcon(id)}</button>`;
    }).join("");
    paintTools();
}
function paintTools() {
    $("toolbar").querySelectorAll("[data-tool]").forEach((b) => {
        const on = b.dataset.tool === S.tool;
        b.classList.toggle("bg-[#111]", on);
        b.classList.toggle("text-white", on);
        b.classList.toggle("text-neutral-600", !on);
    });
}

export function setTool(t, fromAgent) {
    S.tool = t;
    setMode(t === "interact" ? "preview" : "edit");
    if (SHAPES.some(([id]) => id === t) && shape !== t) { shape = t; renderTools(); } else paintTools();
    updateShield();
    if (!fromAgent) send({ cmd: "tool", tool: t });
}
export function setSpace(down) { spaceDown = down; updateShield(); }
function updateShield() { $("panShield").classList.toggle("hidden", !(S.mode === "edit" && (S.tool === "hand" || spaceDown))); }

// the shield catches drags over the canvas so panning uses real pointer coordinates
let pan = null;

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
/**
 * A design converted from Figma keeps its layer data: it can be converted again with the latest rules (a new version; the old code stays
 * in its history). The button belongs to one design (the page the editor opened with, or the draft once it is saved) and shows while
 * that design is the one being edited.
 */
let figmaButtonReady = false;
function setupFigmaButton(info, designId) {
    if (!host.updateFromFigma) return;
    const btn = $("figmaBtn");
    const label = info.outdated ? "Update from Figma · new" : "Update from Figma";
    btn.textContent = label;
    btn.title = info.outdated ? "A newer converter is available: convert this design again from its Figma data" : "Convert this design again from the Figma data kept with it";
    btn.dataset.design = designId;
    // the layout grid the design has in Figma, drawn over the page as guides while the button is on
    const grid = $("gridBtn"), hasGrid = Array.isArray(info.grids) && info.grids.length > 0;
    grid.dataset.design = designId; grid.dataset.on = "";
    grid.onclick = () => {
        const on = grid.dataset.on !== "1";
        grid.dataset.on = on ? "1" : "";
        grid.classList.toggle("bg-neutral-900", on); grid.classList.toggle("text-white", on); grid.classList.toggle("hover:bg-neutral-900", on);
        send({ cmd: "layoutGrids", on, grids: info.grids });
    };
    const show = () => { btn.classList.toggle("hidden", S.curKey !== btn.dataset.design); grid.classList.toggle("hidden", !hasGrid || S.curKey !== grid.dataset.design); };
    show();
    if (figmaButtonReady) return; // the listeners are set once; a later save only changes which design the button belongs to
    figmaButtonReady = true;
    document.addEventListener("design-switched", show);
    btn.addEventListener("click", async () => {
        if (!confirm("Convert this design again from its Figma data with the latest converter?\n\nThe new conversion replaces the current code, including edits made in Windcraft since it was saved. The current code stays in the version history.")) return;
        btn.disabled = true; btn.textContent = "Updating…";
        try {
            const done = await host.updateFromFigma(btn.dataset.design);
            if (done && done.changed === false) { btn.disabled = false; btn.textContent = label; return alert("Already up to date: converting this design again gives exactly the same code, so no new version was made."); }
            host.openDesign(btn.dataset.design);
        }
        catch (err) { btn.disabled = false; btn.textContent = label; alert((err && err.message) || "Could not update this design."); }
    });
}

export function init() {
    $("playBtn").addEventListener("click", () => setTool(S.mode === "edit" ? "interact" : "move")); // the same as the Interact tool
    $("zoomSel").addEventListener("change", (e) => {
        const v = e.target.value;
        if (v === "custom") return;
        S.viewTouched = true;
        if (v === "fit") return fitTo([...docs.keys()]);
        if (v === "frame") return fitTo([S.curKey]);
        const [W, H] = canvasSize();
        zoomAt(Number(v) / view.z, W / 2, H / 2);
    });
    $("undoBtn").addEventListener("click", () => step(-1));
    $("redoBtn").addEventListener("click", () => step(1));
    window.addEventListener("resize", layout);
    $("saveBtn").addEventListener("click", save);
    if (data.figmaSource && data.id) setupFigmaButton(data.figmaSource, data.id);
    document.addEventListener("figma-source-ready", (e) => setupFigmaButton(e.detail.info, e.detail.id)); // from the details dialog's first save
    new MutationObserver(syncSaveButton).observe($("saveState"), { childList: true, characterData: true, subtree: true });
    $("detailsBtn").addEventListener("click", () => $("designsMenu").classList.add("hidden"));
    document.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && !e.altKey && keyZoom(e.key)) return e.preventDefault();
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
        const meta = e.metaKey || e.ctrlKey;
        const key = e.key.toLowerCase();
        if (e.key === "Escape" && S.mode === "preview") { e.preventDefault(); handleKey({ key: "escape" }); return; }
        if (e.code === "Space") { e.preventDefault(); setSpace(true); return; }
        if (e.shiftKey && (e.key === "!" || e.key === "@")) { e.preventDefault(); handleKey({ key: e.key, meta: false, shift: true }); return; }
        if (["delete", "backspace"].includes(key) || (meta && ["z", "y", "d", "s", "g"].includes(key)) || (meta && (e.code === "BracketLeft" || e.code === "BracketRight" || (e.shiftKey && (key === "l" || key === "h")))) || (!meta && !e.altKey && TOOL_KEYS[key]) || (!meta && e.shiftKey && (key === "a" || key === "g"))) {
            e.preventDefault();
            handleKey({ key, meta, shift: e.shiftKey, code: e.code });
        }
    });
    document.addEventListener("keyup", (e) => { if (e.code === "Space") setSpace(false); });
    $("toolbar").addEventListener("click", (e) => {
        if (e.target.closest("#shapeMore")) { $("shapeMenu").classList.toggle("hidden"); return; }
        const pick = e.target.closest("[data-shape]");
        if (pick) { $("shapeMenu").classList.add("hidden"); setTool(pick.dataset.shape); return; }
        const b = e.target.closest("[data-tool]");
        if (b) setTool(b.dataset.tool);
    });
    document.addEventListener("pointerdown", (e) => { const m = $("shapeMenu"); if (m && !m.classList.contains("hidden") && !e.target.closest("#shapeMenu, #shapeMore")) m.classList.add("hidden"); }, true);

    renderTools();
    $("panShield").addEventListener("pointerdown", (e) => { S.viewTouched = true; pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; $("panShield").setPointerCapture(e.pointerId); $("panShield").style.cursor = "grabbing"; });
    $("panShield").addEventListener("pointermove", (e) => { if (!pan) return; view.x = pan.vx + e.clientX - pan.x; view.y = pan.vy + e.clientY - pan.y; applyView(); });
    $("panShield").addEventListener("pointerup", () => { pan = null; $("panShield").style.cursor = "grab"; });

    // scroll pans, Ctrl/Cmd + scroll (or a pinch) zooms around the pointer
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        handleWheel({ dx: e.deltaX, dy: e.deltaY, zoomKey: e.ctrlKey || e.metaKey, cx: e.clientX - r.left, cy: e.clientY - r.top });
    }, { passive: false });

    window.addEventListener("beforeunload", (e) => { if (anyDirty()) { e.preventDefault(); e.returnValue = ""; } });
}
