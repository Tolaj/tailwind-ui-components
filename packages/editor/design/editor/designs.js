import { parseComponentSource, buildPreviewDocument } from "../../playground/component-source.js";
import { host } from "../host.js";
import { normalizeGroup } from "@windcraft/core/pages.js";
import { GAP_X } from "@windcraft/core/board-layout.js";
import { DEVICES } from "../float-toolbar.js";
import { $, S, collapsed, data, esc, frame, model, send } from "./base.js";
import { MIN_H, applyView, canvas, fitTo, heightOfDoc, layout, pageGroupOf, placePills, positions, view, widthOf } from "./plane.js";
import { PAGE_EDIT, groupHeading, headingState, renderPagesList } from "./pages-panel.js";
import { loadFrame, updateChrome } from "./docs.js";
import { renderLayers } from "./layers.js";
import { renderFloat } from "./frame-handles.js";
import { renderInspector } from "./inspector.js";
import { updateCodeHighlight } from "./code-panel.js";
import { DEFAULT_CATEGORY, setTool } from "./toolbar.js";

// ── Many designs on one plane ────────────────────────────────────────────────
// One design is live (the iframe you edit). The others are previews in the same project; click one to switch to it.
// Each design keeps its own history, so switching never loses edits. Save writes every changed design.
const META_KEYS = ["id", "title", "version", "category", "description", "tags", "isPublished", "project", "group"];
const takeMeta = () => Object.fromEntries(META_KEYS.map((k) => [k, data[k]]));
const applyMeta = (m) => META_KEYS.forEach((k) => { data[k] = m[k]; });

export const docs = new Map();
export const wraps = new Map();
let draftCount = 0;
let planeProject = data.project || null;

function stashActive() {
    const d = docs.get(S.curKey);
    Object.assign(d, { meta: takeMeta(), parsed: S.parsed, markup: model.markup, history: S.history, hIndex: S.hIndex, isNew: S.isNew, savedMarkup: S.savedMarkup, height: S.frameHeight, loaded: true });
}
export function loadActiveFromStash() {
    const d = docs.get(S.curKey);
    applyMeta(d.meta);
    S.isNew = d.isNew;
    S.savedMarkup = d.savedMarkup;
}
function ensureLoaded(d) {
    if (d.loaded) return;
    d.parsed = parseComponentSource(d.source);
    d.markup = d.parsed.markup;
    d.history = [];
    d.hIndex = -1;
    d.savedMarkup = d.markup;
    d.loaded = true;
}

export const docDirty = (d) => d.loaded && (d.isNew ? d.markup.trim() !== "" : d.markup !== d.savedMarkup);
export function anyDirty() {
    stashActive();
    return [...docs.values()].some(docDirty);
}

export function remapKey(oldKey, newKey) {
    if (oldKey === newKey) return;
    const d = docs.get(oldKey);
    if (!d) return;
    d.key = newKey;
    docs.delete(oldKey);
    docs.set(newKey, d);
    const en = wraps.get(oldKey);
    if (en) { wraps.delete(oldKey); wraps.set(newKey, en); en.wrap.dataset.key = newKey; }
    if (S.curKey === oldKey) S.curKey = newKey;
}

// frames
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) mountGhost(e.target.dataset.key);
}), { root: canvas, rootMargin: "600px" });

function makeWrap(key) {
    const wrap = document.createElement("div");
    wrap.className = "fwrap";
    wrap.dataset.key = key;
    wrap.innerHTML = '<div class="flabel drag" data-label></div><div class="frame"></div>';
    $("frames").appendChild(wrap);
    const en = { wrap, box: wrap.querySelector(".frame"), label: wrap.querySelector(".flabel"), ghost: null, shield: null };
    wraps.set(key, en);
    io.observe(wrap);
    return en;
}

function mountGhost(key, force) {
    const en = wraps.get(key);
    const d = docs.get(key);
    if (!en || !d || key === S.curKey || (en.ghost && !force)) return;
    const p = d.loaded ? { ...d.parsed, markup: d.markup } : parseComponentSource(d.source);
    if (!en.ghost) {
        en.ghost = document.createElement("iframe");
        en.ghost.setAttribute("sandbox", "allow-scripts");
        en.ghost.setAttribute("tabindex", "-1");
        en.ghost.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;border:0;pointer-events:none;background:#fff;";
        en.box.prepend(en.ghost);
    }
    en.ghost.title = d.meta.title || "Design";
    en.ghost.srcdoc = buildPreviewDocument(p, { width: widthOf(d) });
}

function setRole(key) {
    const en = wraps.get(key);
    if (!en) return;
    const active = key === S.curKey;
    en.wrap.classList.toggle("active", active);
    en.wrap.classList.toggle("ghost", !active);
    if (active) {
        if (en.ghost && !S.switching) { en.ghost.remove(); en.ghost = null; } // while switching it stays until the live frame is ready
        if (en.shield) { en.shield.remove(); en.shield = null; }
    } else if (!en.shield) {
        en.shield = document.createElement("div");
        en.shield.className = "gshield";
        en.shield.dataset.shield = "";
        en.shield.style.cursor = "pointer";
        en.box.appendChild(en.shield);
    }
}

export function refreshLabels() {
    docs.forEach((d, key) => {
        const en = wraps.get(key);
        if (!en || en.renaming) return;
        const active = key === S.curKey;
        const title = active ? data.title : d.meta.title;
        const ver = active ? data.version : d.meta.version;
        const state = (active ? S.isNew : d.isNew) ? "new" : d.kind === "section" ? "section" : `v${ver}`;
        const group = pageGroupOf(key);
        en.label.innerHTML = `${group ? `<i class="fgroup">${esc(group)} / </i>` : ""}${esc(title || "Untitled page")}<span>${state}</span>${docDirty(d) ? '<i class="dirty-dot" title="Unsaved changes"></i>' : ""}`;
    });
}

let layoutQueued = false;
export function scheduleLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => { layoutQueued = false; layout(); });
}

export function buildWraps() {
    docs.forEach((_, key) => makeWrap(key));
    docs.forEach((_, key) => setRole(key));
    refreshLabels();
}

// the designs list
export function renderDesigns() {
    headingState.prev = "";
    const list = [...docs.values()];
    const pages = list.filter((d) => d.kind !== "section" || !list.some((p) => p.key === d.parent));
    const row = (d, depth) => {
        const active = d.key === S.curKey;
        const title = (active ? data.title : d.meta.title) || "Untitled page";
        return `<div class="layer-row cursor-pointer gap-1 px-1 ${active ? "is-selected" : ""}" style="padding-left:${depth * 14 + 6}px" data-design="${d.key}">
            <span class="shrink-0 font-mono text-[10px] ${active ? "" : "text-neutral-500"}">${d.kind === "section" ? "sec" : "page"}</span>
            <span class="truncate">${esc(title)}</span>${docDirty(d) ? '<i class="dirty-dot"></i>' : ""}${active ? PAGE_EDIT : ""}</div>`;
    };
    renderPagesList();
    $("designsCount").textContent = String(list.length);
    $("designsName").textContent = (data.project && data.project.name) || data.title || "Untitled page";
    placePills();
    $("designs").innerHTML = pages.map((p) => groupHeading(p) + row(p, 0) + list.filter((s) => s.kind === "section" && s.parent === p.key).map((s) => row(s, 1)).join("")).join("");
}

/** Makes another design the live one. The current one stays on the plane as a preview with its edits. */
export function activate(key) {
    if (key === S.curKey || !docs.has(key)) return;
    stashActive();
    const prev = docs.get(S.curKey);
    const next = docs.get(key);
    ensureLoaded(next);
    applyMeta(next.meta);
    S.parsed = next.parsed;
    model.markup = next.markup;
    S.history = next.history;
    S.hIndex = next.hIndex;
    S.isNew = next.isNew;
    S.savedMarkup = next.savedMarkup;
    S.frameHeight = Math.max(MIN_H, next.height || 0);
    S.lastKey = "";
    S.selected = null;
    S.tree = null;
    collapsed.clear();
    const oldKey = S.curKey;
    mountGhost(key); // snapshots are made as pages scroll into view: one opened from the Pages list may not have one yet
    S.curKey = key;
    S.frameSel = null;
    // Switching pages never shows one page's design in another's place: the live frame stays over the page being left until its
    // snapshot has painted, then loads the new design out of sight while the new page shows its own snapshot; once the new
    // design reports ready, the frame moves over and the snapshot goes (see the "ready" message).
    const token = ++S.switchToken;
    S.switching = true;
    S.handingOver = true;
    setRole(key);
    setRole(oldKey);
    mountGhost(oldKey, true);
    host.showDesign(next.isNew ? null : next.meta.id);
    document.dispatchEvent(new CustomEvent("design-switched"));
    let started = false;
    const start = () => {
        if (started || token !== S.switchToken) return;
        started = true;
        S.handingOver = false;
        frame.style.visibility = "hidden";
        loadFrame();
    };
    const left = wraps.get(oldKey);
    if (left && left.ghost) left.ghost.addEventListener("load", () => setTimeout(start, 60), { once: true }); // a moment to paint
    setTimeout(start, 700); // a snapshot that is slow to load doesn't hold the switch up
    renderLayers();
    updateChrome();
    layout();
} // frameAt: the page the live frame sits over
 // the old design is still in the frame, waiting for its snapshot: what it reports isn't the new page's

// moving frames: drag a label, or drag a preview. A plain click on a preview opens it.
const SNAP = 8;
const pendingSave = new Map();
let saveTimer = null;
export async function saveBoard(positions) {
    if (!planeProject) return;
    try {
        await host.saveLayout(planeProject.id, positions);
    } catch { /* the position stays on screen; the next drag saves it again */ }
}
export function queueBoardSave(key) {
    const d = docs.get(key);
    if (!d || d.isNew) return;
    pendingSave.set(key, d.board);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushBoard, 500);
}
export const boardPayload = ([id, p]) => ({ id, x: p ? p.x : null, y: p ? p.y : null, w: p ? p.w ?? null : undefined, h: p ? p.h ?? null : undefined });
function flushBoard() {
    if (!pendingSave.size) return;
    const positions = [...pendingSave].map(boardPayload);
    pendingSave.clear();
    saveBoard(positions);
}

let gesture = null;
/** A pointer position in the live frame's own coordinates (what the in-frame agent works in). */
function frameEvent(e) {
    const r = canvas.getBoundingClientRect();
    const p = positions()[S.curKey] || { x: 0, y: 0 };
    return { clientX: (e.clientX - r.left - view.x) / view.z - p.x, clientY: (e.clientY - r.top - view.y) / view.z - p.y, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey };
}
let lastHoverClear = 0;

/** Empty canvas with the arrow: drag a box. Frames it touches get selected. */
function drawMarquee(g, e) {
    const r = canvas.getBoundingClientRect();
    const x0 = Math.min(g.sx, e.clientX) - r.left, y0 = Math.min(g.sy, e.clientY) - r.top;
    const m = $("marquee");
    Object.assign(m.style, { display: "block", left: `${x0}px`, top: `${y0}px`, width: `${Math.abs(e.clientX - g.sx)}px`, height: `${Math.abs(e.clientY - g.sy)}px` });
}
function finishMarquee(g, e) {
    $("marquee").style.display = "none";
    if (!g.moved) return clearSelection();
    const r = canvas.getBoundingClientRect();
    const toWorld = (cx, cy) => ({ x: (cx - r.left - view.x) / view.z, y: (cy - r.top - view.y) / view.z });
    const a = toWorld(Math.min(g.sx, e.clientX), Math.min(g.sy, e.clientY)), b = toWorld(Math.max(g.sx, e.clientX), Math.max(g.sy, e.clientY));
    const pos = positions();
    const hit = [...docs.keys()].filter((key) => {
        const p = pos[key], d = docs.get(key);
        return p && p.x < b.x && p.x + widthOf(d) > a.x && p.y < b.y && p.y + heightOfDoc(d) > a.y;
    });
    if (!hit.length) return clearSelection();
    const key = hit.includes(S.curKey) ? S.curKey : hit[0];
    if (key !== S.curKey) activate(key);
    selectFrame();
}

/** Double-click a frame's name to rename it. Enter or clicking away saves, Esc cancels. */
function startRename(key) {
    const en = wraps.get(key);
    const d = docs.get(key);
    if (!en || !d || en.renaming) return;
    en.renaming = true;
    const current = (key === S.curKey ? data.title : d.meta.title) || "";
    en.label.innerHTML = `<input class="frename" value="${esc(current)}" maxlength="80" aria-label="Frame name">`;
    const input = en.label.querySelector("input");
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
        if (done) return;
        done = true;
        en.renaming = false;
        const name = input.value.trim();
        refreshLabels();
        if (save && name && name !== current) renameFrame(key, name, current);
    };
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
}

/** Puts a design in a group of its project ("Public site"), or out of every group when empty. Saved designs keep it. */
export async function setPageGroup(key, text) {
    const d = docs.get(key);
    const next = normalizeGroup(text), prev = pageGroupOf(key);
    const apply = (g) => { d.meta.group = g; if (key === S.curKey) data.group = g; refreshLabels(); renderDesigns(); layout(); renderInspector(); };
    if (next === prev) return renderInspector();
    apply(next);
    const isNewDoc = key === S.curKey ? S.isNew : d.isNew;
    if (isNewDoc || !d.meta.id) return; // a design that isn't saved yet takes its group when it is saved
    try {
        await host.updateComponent(d.meta.id, { group: next });
    } catch (err) {
        apply(prev);
        alert(err.message || "Could not change the group");
    }
}
export async function renameFrame(key, name, previous) {
    const d = docs.get(key);
    const isNewDoc = key === S.curKey ? S.isNew : d.isNew;
    const apply = (t) => { d.meta.title = t; if (key === S.curKey) { data.title = t; renderInspector(); } updateChrome(); }; // the page panel shows the name
    apply(name);
    if (isNewDoc || !d.meta.id) return; // a design that isn't saved yet takes its name when it is
    try {
        await host.updateComponent(d.meta.id, { title: name });
    } catch (err) {
        apply(previous);
        alert(err.message || "Could not rename it");
    }
}

function clearSelection() {
    S.frameSel = null;
    S.selected = null;
    updateCodeHighlight(false);
    send({ cmd: "deselect" });
    renderInspector();
    renderLayers();
    renderFloat();
}
export function selectFrame() {
    S.selected = null;
    updateCodeHighlight(false);
    send({ cmd: "deselect" });
    S.frameSel = S.curKey;
    renderInspector();
    renderLayers();
    renderFloat();
}

export const clampSize = (n, max) => Math.min(max, Math.max(120, Math.round(n)));

/** Drag a frame handle: the frame changes size and the design inside reflows to fit. */
function resizeFrame(g, dx, dy) {
    let x = g.ox, y = g.oy, w = g.ow, h = g.oh;
    if (g.h.includes("e")) w = g.ow + dx;
    if (g.h.includes("s")) h = g.oh + dy;
    if (g.h.includes("w")) w = g.ow - dx;
    if (g.h.includes("n")) h = g.oh - dy;
    w = clampSize(w, 8000);
    h = clampSize(h, 20000);
    if (g.h.includes("w")) x = g.ox + g.ow - w;
    if (g.h.includes("n")) y = g.oy + g.oh - h;
    const d = docs.get(g.key);
    const vertical = g.h.includes("n") || g.h.includes("s");
    d.board = { x: Math.round(x), y: Math.round(y), w, ...(vertical || (d.board && d.board.h) ? { h } : {}) };
    rememberCustom(d);
    layout();
}

/** The last size set by hand (anything that isn't Desktop, Tablet or Mobile) stays available as the Custom button. */

export function rememberCustom(d) {
    const w = d.board && d.board.w;
    if (!w || DEVICES.some(([p]) => p === w)) return;
    S.lastCustom = { w, h: (d.board && d.board.h) || null };
    try { localStorage.setItem("wc:customSize", JSON.stringify(S.lastCustom)); } catch { /* storage is optional */ }
}

/** Sets the live frame's width and/or height (null height = follow the content). Used by the frame toolbar. */
export function setFrameSize(sz) {
    const d = docs.get(S.curKey);
    const p = positions()[S.curKey];
    const b = { x: p.x, y: p.y, ...(d.board || {}) };
    if ("w" in sz) b.w = clampSize(sz.w, 8000);
    if ("h" in sz) { if (sz.h === null) delete b.h; else b.h = clampSize(sz.h, 20000); }
    d.board = b;
    rememberCustom(d);
    queueBoardSave(S.curKey);
    layout();
}

// a new design on the same plane
async function ensureProject() {
    if (planeProject) return planeProject;
    const name = prompt("Designs that share a canvas live in a project. Name this project:", data.title || "My project");
    if (!name || !name.trim()) return null;
    let project;
    try { project = await host.createProject(name); } catch (err) { alert(err.message || "Could not create the project"); return null; }
    if (!S.isNew) {
        try { await host.updateComponent(data.id, { project: project.id }); } catch { alert("Could not add this design to the project"); return null; }
    }
    planeProject = project;
    (data.projects ||= []).push(project);
    data.project = project;
    const d = docs.get(S.curKey);
    d.kind = "page";
    return project;
}

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {

    docs.set(S.curKey, { key: S.curKey, meta: takeMeta(), kind: data.kind || (data.project ? "page" : "component"), parent: data.parent || null, board: data.board || null, frameW: data.frameW || null, parsed: S.parsed, markup: model.markup, history: S.history, hIndex: S.hIndex, isNew: S.isNew, savedMarkup: S.savedMarkup, height: 0, loaded: true });
    (data.plane || []).forEach((it) => {
        if (it.id === S.curKey) return;
        docs.set(it.id, {
            key: it.id, kind: it.kind, parent: it.parent, board: it.board, frameW: it.frameW || null, source: it.htmlCode, loaded: false, isNew: false, height: 0,
            meta: { id: it.id, title: it.title, group: it.group || "", version: it.version, category: it.category, description: it.description, tags: it.tags, isPublished: it.isPublished, project: data.project },
        });
    });
    $("designs").addEventListener("click", (e) => {
        if (e.target.closest("[data-pedit]")) { $("detailsBtn").click(); return; }
        const r = e.target.closest("[data-design]");
        if (!r) return;
        S.viewTouched = true;
        $("designsMenu").classList.add("hidden");
        activate(r.dataset.design);
        fitTo([r.dataset.design], Math.max(view.z, 0.5));
    });
    window.addEventListener("beforeunload", () => {
        if (pendingSave.size && planeProject) host.saveLayoutOnExit(planeProject.id, [...pendingSave].map(boardPayload));
    });

    canvas.addEventListener("pointerdown", (e) => {
        if (e.target === $("panShield") || e.target.closest(".frename")) return;
        // the middle button always pans (the arrow tool uses empty space to draw a selection box instead)
        if (e.button === 1 && !e.target.closest("#ftb")) {
            e.preventDefault();
            gesture = { type: "pan", mid: true, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
            try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
            return;
        }
        if (e.button !== 0) return;
        const sh = e.target.closest("[data-sh]");
        if (sh) {
            // a selection handle: the agent runs the resize / rotate / radius, fed with this pointer
            gesture = { type: "sel", hd: sh.dataset.sh };
            canvas.style.cursor = getComputedStyle(sh).cursor;
            send({ cmd: "hstart", hd: sh.dataset.sh, e: frameEvent(e) });
            try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
            return;
        }
        const fh = e.target.closest("[data-fh]");
        const label = e.target.closest("[data-label]");
        const shield = e.target.closest("[data-shield]");
        const wrap = (label || shield) && e.target.closest(".fwrap");
        if (fh && S.frameSel === S.curKey) {
            const d = docs.get(S.curKey);
            const pos = positions()[S.curKey];
            gesture = { type: "fresize", key: S.curKey, h: fh.dataset.fh, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, ow: widthOf(d), oh: heightOfDoc(d), moved: false };
        } else if (wrap) {
            const key = wrap.dataset.key;
            const pos = positions()[key];
            gesture = { type: "frame", key, wrap, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false, label: Boolean(label) };
        } else if (e.target === canvas || e.target === $("plane") || e.target === $("frames")) {
            gesture = S.tool === "move"
                ? { type: "marquee", sx: e.clientX, sy: e.clientY, moved: false }
                : { type: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
        } else return;
        try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    });
canvas.addEventListener("pointermove", (e) => {
    if (!gesture) {
        // the pointer is over the canvas, not the live frame: the frame never hears it leave, so tell it to drop its hover highlight
        const now = Date.now();
        if (now - lastHoverClear > 100) { lastHoverClear = now; send({ cmd: "hover", path: null }); }
        return;
    }
    if (gesture.type === "sel") return send({ cmd: "hmove", e: frameEvent(e) });
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
    gesture.moved = true;
    S.viewTouched = true;
    if (gesture.type === "pan") { view.x = gesture.vx + dx; view.y = gesture.vy + dy; return applyView(); }
    if (gesture.type === "marquee") return drawMarquee(gesture, e);
    if (gesture.type === "fresize") return resizeFrame(gesture, dx / view.z, dy / view.z);
    gesture.wrap.classList.add("dragging");
    const d = docs.get(gesture.key);
    const p = { x: Math.round((gesture.ox + dx / view.z) / SNAP) * SNAP, y: Math.round((gesture.oy + dy / view.z) / SNAP) * SNAP };
    d.board = { ...(d.board || {}), ...p };
    gesture.wrap.style.left = `${p.x}px`;
    gesture.wrap.style.top = `${p.y}px`;
    if (gesture.key === S.curKey) { frame.style.left = `${p.x}px`; frame.style.top = `${p.y}px`; }
    renderFloat();
});
    canvas.addEventListener("pointerup", (e) => {
        const g = gesture;
        gesture = null;
        if (!g) return;
        if (g.type === "sel") { canvas.style.cursor = ""; return send({ cmd: "hend", e: frameEvent(e) }); }
        if (g.type === "pan") { if (!g.moved && !g.mid) clearSelection(); return; }
        if (g.type === "marquee") return finishMarquee(g, e);
        if (g.type === "fresize") { if (g.moved) queueBoardSave(g.key); return; }
        g.wrap.classList.remove("dragging");
        if (g.moved) { queueBoardSave(g.key); layout(); return; }
        const switched = g.key !== S.curKey;
        if (switched) activate(g.key);
        if (g.label || switched) selectFrame();
    });
    canvas.addEventListener("dblclick", (e) => {
        // the canvas holds the pointer during a click, so look at what is really under the cursor
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const label = under && under.closest("[data-label]");
        if (label && !label.querySelector("input")) startRename(label.closest(".fwrap").dataset.key);
    });
    try { S.lastCustom = JSON.parse(localStorage.getItem("wc:customSize") || "null"); } catch { /* storage is optional */ }

/**
 * Where a new page goes: in the row of the page being edited, just right of the furthest frame in that row, so it lands on nothing.
 * The spot is kept (a board position), so moving other pages later never moves it.
 */
function freeSpot() {
    const pos = positions(), cur = pos[S.curKey] || { x: 0, y: 0 };
    let right = null;
    docs.forEach((d, k) => {
        const p = pos[k];
        if (!p) return;
        const h = heightOfDoc(d);
        if (p.y < cur.y + MIN_H && cur.y < p.y + h) right = Math.max(right ?? -Infinity, p.x + widthOf(d)); // a frame beside that row
    });
    return { x: Math.round(right === null ? 0 : right + GAP_X), y: Math.round(cur.y) };
}

$("newDesignBtn").addEventListener("click", async () => {
    $("designsMenu").classList.add("hidden");
    const project = await ensureProject();
    if (!project) return;
    const key = `draft-${++draftCount}`;
    const spot = freeSpot();
    docs.set(key, {
        key, kind: "page", parent: null, board: spot, source: "", loaded: true, isNew: true, height: 0,
        parsed: parseComponentSource(""), markup: "", history: [], hIndex: -1, savedMarkup: "",
        meta: { id: null, title: "Untitled page", version: 0, category: data.category || DEFAULT_CATEGORY, description: "A page on the canvas.", tags: [], isPublished: false, project },
    });
    makeWrap(key);
    S.viewTouched = true;
    activate(key);
    layout();
    fitTo([key], 0.8);
    setTool("move");
});
}
