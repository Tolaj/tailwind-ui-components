import { parseComponentSource, buildPreviewDocument } from "../playground/component-source.js";
import { computeLayout } from "../shared/board-layout.js";
import { createDescriptionFromElement } from "../element-description/index.js";
import { agentMain } from "./agent.js";
import { BREAKPOINT_WIDTH, setGroup } from "./class-groups.js";
import { ui, variant, val, renderInspectorHtml, mountDatalists, modeFor } from "./inspector.js";
import { toolbarHtml, TEXT_TAGS, FAMILY_STACKS, DEVICES } from "./float-toolbar.js";
import { selectionHtml } from "./selection-overlay.js";
import { CSS_PROP_LIST, normalizeValue } from "./css-props.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const data = JSON.parse($("designData").textContent);

// Coming from the quick Add Component dialog: pick up the code and details it handed over.
if (!data.id && new URLSearchParams(window.location.search).has("draft")) {
    try {
        const d = JSON.parse(sessionStorage.getItem("wc:draft") || "null");
        if (d) {
            Object.assign(data, {
                htmlCode: d.html || "", title: d.title || "", category: d.category || "", description: d.description || "",
                tags: String(d.tags || "").split(",").map((t) => t.trim()).filter(Boolean), isPublished: d.isPublished !== "false",
            });
            sessionStorage.removeItem("wc:draft");
        }
    } catch { /* ignore a bad draft */ }
    window.history.replaceState({}, "", "/design/new");
}

// Back returns to wherever the editor was opened from (the Library link is the fallback).
try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith("/design")) {
        $("backLink").href = ref.href;
        $("backLink").title = "Back";
        $("backLabel").textContent = "Back";
    }
} catch { /* keep the Library link */ }
let parsed = parseComponentSource(data.htmlCode);
const model = { markup: parsed.markup };
const isTailwindScript = (s) => s.src && /tailwindcss/i.test(s.src);

// ── State ────────────────────────────────────────────────────────────────────
let mode = "edit";
const DEFAULT_W = 1280;
let frameHeight = 600;
let selected = null;
let tree = null;
let history = [];
let hIndex = -1;
let isNew = !data.id;
let savedMarkup = isNew ? "" : parsed.markup;
let lastKey = "";
let lastTime = 0;
const collapsed = new Set();

const frame = $("frame");
const send = (msg) => frame.contentWindow && frame.contentWindow.postMessage(msg, "*");

// ── Documents ────────────────────────────────────────────────────────────────
const scriptTag = (s) =>
    `<script${s.src ? ` src="${esc(s.src)}"` : ""}${s.type ? ` type="${esc(s.type)}"` : ""}${s.defer ? " defer" : ""}>${s.src ? "" : s.text.replace(/<\/script/gi, "<\\/script")}<\/script>`;
const styleTag = (s) => `<style${s.type ? ` type="${esc(s.type)}"` : ""}>${s.text.replace(/<\/style/gi, "<\\/style")}</style>`;

let loadSeq = 0;

function editDocument() {
    const head = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">'];
    if (!parsed.hasTailwindScript) head.push('<script src="https://cdn.tailwindcss.com"><\/script>');
    else head.push(...parsed.scripts.filter(isTailwindScript).map(scriptTag));
    head.push(...parsed.links, ...parsed.styles.map(styleTag), "<style>html,body{margin:0}</style>");
    const attrs = Object.entries(parsed.bodyAttrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
    return `<!DOCTYPE html><html><head>${head.join("\n")}</head><body${attrs}>${model.markup}<script data-wc-agent>window.__wcLoad=${loadSeq};(${agentMain.toString()})()<\/script></body></html>`;
}

/** Rebuilds the component source: original head assets and scripts around the edited markup. */
function assembleDoc(p, markup) {
    const css = [...p.links, ...p.styles.map(styleTag)].join("\n");
    const js = p.scripts.map(scriptTag).join("\n");
    const bodyAttrs = Object.entries(p.bodyAttrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
    if (bodyAttrs) return `<!DOCTYPE html>\n<html>\n<head>\n${css}\n</head>\n<body${bodyAttrs}>\n${markup}\n${js}\n</body>\n</html>\n`;
    return [css, markup, js].filter(Boolean).join("\n") + "\n";
}
const assemble = () => assembleDoc(parsed, model.markup);

function loadFrame() {
    loadSeq++;
    selected = null;
    editingInfo = null;
    gestureOn = false;
    ftMenu = false;
    selData = null;
    renderSel();
    renderInspector();
    renderFloat();
    frame.srcdoc = mode === "edit" ? editDocument() : buildPreviewDocument(parseComponentSource(assemble()), { width: curWidth() });
}

// ── History, dirty state, layout ─────────────────────────────────────────────
/** Does this design use Tailwind utility classes? Decides which style panel opens by default. */
function refreshDocFlag() {
    const tokens = [];
    String(model.markup).replace(/\bclass\s*=\s*"([^"]*)"|\bclass\s*=\s*'([^']*)'/g, (_, a, b) => { tokens.push(...(a ?? b).split(/\s+/).filter(Boolean)); return ""; });
    const hit = tokens.some((t) => /^(?:flex|grid|block|hidden|inline-flex|rounded)$/.test(t) || /^-?(?:p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml|w|h|gap)-(?:\d|px|auto|full)/.test(t) || /^(?:text|bg|border)-(?:xs|sm|base|lg|xl|\d?xl|[a-z]+-\d{2,3}|black|white)$/.test(t));
    ui.docTailwind = Boolean(parsed.hasTailwindScript || hit);
}

function updateChrome() {
    refreshDocFlag();
    $("undoBtn").disabled = hIndex <= 0;
    $("redoBtn").disabled = hIndex >= history.length - 1;
    const dirty = anyDirty();
    $("saveBtn").disabled = !dirty;
    $("saveState").textContent = dirty ? (isNew && docs.size === 1 ? "Not saved yet" : "Unsaved changes") : isNew ? "" : "Saved";
    $("versionBadge").textContent = isNew ? "new" : `v${data.version}`;
    $("titleText").textContent = data.title || "Untitled component";
    document.title = `${data.title || "New component"} | Windcraft design`;
    const pl = $("projLink");
    pl.classList.toggle("hidden", !data.project);
    pl.classList.toggle("inline-flex", Boolean(data.project));
    $("projSep").classList.toggle("hidden", !data.project);
    if (data.project) { pl.textContent = data.project.name; pl.href = `/projects/${data.project.id}`; }
    const empty = model.markup.trim() === "";
    $("startCard").classList.toggle("hidden", !empty || mode !== "edit");
    $("startCard").classList.toggle("flex", empty && mode === "edit");
    if (!codeFocused()) syncCode();
    renderDesigns();
    refreshLabels();
}

function commit(html, key) {
    model.markup = html;
    const now = Date.now();
    if (key && key === lastKey && now - lastTime < 800 && hIndex === history.length - 1) {
        history[hIndex] = html;
    } else {
        history = history.slice(0, hIndex + 1);
        history.push(html);
        hIndex = history.length - 1;
    }
    lastKey = key || "";
    lastTime = now;
    updateChrome();
}

function step(delta) {
    const next = hIndex + delta;
    if (next < 0 || next >= history.length) return;
    hIndex = next;
    model.markup = history[hIndex];
    send({ cmd: "load", html: model.markup, selectPath: selected ? selected.path : null });
    updateChrome();
}

// ── The plane: every design in the project on one infinite surface ───────────
const MIN_Z = 0.02, MAX_Z = 256; // 2% to 25600%
const GRID_FROM = 4; // the pixel grid appears at 400%
const view = { x: 0, y: 0, z: 1 };
let viewTouched = false;
let sentZoom = 0;
const canvas = $("canvas");

const MIN_H = 720;
// a frame has its own width, and a height that follows its content unless it was set by hand
const widthOf = (d) => (d.board && d.board.w) || DEFAULT_W;
const curWidth = () => widthOf(docs.get(curKey));
const heightOfDoc = (d) => (d.board && d.board.h) || (d.key === curKey ? Math.max(MIN_H, frameHeight) : Math.max(MIN_H, d.height || 0));
const canvasSize = () => [canvas.clientWidth, canvas.clientHeight];

function positions() {
    return computeLayout([...docs.values()].map((d) => ({ id: d.key, kind: d.kind, parent: d.parent, board: d.board })), { frameW: DEFAULT_W, widthOf: (it) => widthOf(docs.get(it.id)), heightOf: (it) => heightOfDoc(docs.get(it.id)) });
}

function applyView() {
    $("plane").style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
    $("plane").style.setProperty("--iz", String(1 / view.z));
    // dot grid: always about 16-32 screen pixels apart (the spacing doubles or halves as you zoom), and whole pixels so the dots stay crisp
    let dot = 24 * view.z;
    while (dot < 16) dot *= 2;
    while (dot >= 32) dot /= 2;
    dot = Math.round(dot);
    canvas.style.backgroundSize = `${dot}px ${dot}px`;
    canvas.style.backgroundPosition = `${Math.round(view.x)}px ${Math.round(view.y)}px`;
    updatePixelGrid();
    if (sentZoom !== view.z) { sentZoom = view.z; send({ cmd: "view", zoom: view.z }); }
    renderFrameSel(); // the selection is in screen pixels, so it is redrawn on every pan and zoom
    syncZoomSel();
    placeFloat();
}

/** From 400% every design pixel gets a hairline, over the designs and under the selection, like Figma's pixel grid. */
function updatePixelGrid() {
    const g = $("pgrid");
    if (view.z < GRID_FROM) return g.classList.add("hidden");
    g.classList.remove("hidden");
    // cover just what is on screen, in the plane's own units, snapped to whole pixels
    const x0 = Math.floor(-view.x / view.z), y0 = Math.floor(-view.y / view.z);
    Object.assign(g.style, { left: `${x0}px`, top: `${y0}px`, width: `${Math.ceil(canvas.clientWidth / view.z) + 2}px`, height: `${Math.ceil(canvas.clientHeight / view.z) + 2}px` });
}

function syncZoomSel() {
    const sel = $("zoomSel");
    const hit = [...sel.options].find((o) => Number(o.value) && Math.abs(Number(o.value) - view.z) < 0.005);
    if (hit) { sel.value = hit.value; return; }
    let custom = [...sel.options].find((o) => o.value === "custom");
    if (!custom) { custom = new Option("", "custom"); sel.add(custom); }
    custom.textContent = `${Math.round(view.z * 100)}%`;
    sel.value = "custom";
}

function zoomAt(factor, cx, cy) {
    const z = Math.min(MAX_Z, Math.max(MIN_Z, view.z * factor));
    const k = z / view.z;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.z = z;
    applyView();
}

function fitTo(keys, maxZ = 1) {
    const pos = positions();
    const list = keys.filter((k) => pos[k]);
    if (!list.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach((k) => {
        const p = pos[k];
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y - 30);
        x1 = Math.max(x1, p.x + widthOf(docs.get(k))); y1 = Math.max(y1, p.y + heightOfDoc(docs.get(k)));
    });
    const [W, H] = canvasSize();
    const z = Math.min(maxZ, Math.max(MIN_Z, Math.min((W - 120) / (x1 - x0), (H - 120) / (y1 - y0))));
    view.z = z;
    view.x = (W - (x1 - x0) * z) / 2 - x0 * z;
    view.y = (H - (y1 - y0) * z) / 2 - y0 * z;
    applyView();
}

/** Sizes and places every frame. The live frame and the previews all follow the same positions. */
function layout() {
    const pos = positions();
    docs.forEach((d, key) => {
        const en = wraps.get(key);
        const p = pos[key];
        if (!en || !p) return;
        const h = heightOfDoc(d);
        Object.assign(en.wrap.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${widthOf(d)}px`, height: `${h}px` });
        // the live iframe never changes parent (that would reload it); it just sits over the active frame
        if (key === curKey) Object.assign(frame.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${widthOf(d)}px`, height: `${h}px` });
    });
    $("pillR").style.top = canvas.clientWidth < 820 ? "60px" : "";
    applyView();
    renderFloat();
}

function handleWheel({ dx, dy, zoomKey, cx, cy }) {
    viewTouched = true;
    if (zoomKey) zoomAt(Math.exp(-dy * 0.01), cx, cy);
    else { view.x -= dx; view.y -= dy; applyView(); }
}

// ── Messages from the frame ──────────────────────────────────────────────────
const inspectorEditing = () => Boolean(document.activeElement && document.activeElement.matches && document.activeElement.matches("[data-live]") && $("inspector").contains(document.activeElement));

window.addEventListener("message", (e) => {
    const m = e.data || {};
    if (m.type === "preview-height" && e.source !== frame.contentWindow) {
        for (const [key, en] of wraps) {
            if (en.ghost && en.ghost.contentWindow === e.source) { docs.get(key).height = Math.max(120, Math.min(6000, m.height)); scheduleLayout(); return; }
        }
        return;
    }
    if (e.source !== frame.contentWindow) return;
    // a document that was replaced (switching designs reloads the frame) can still have messages in flight
    if (m.load !== undefined && m.load !== loadSeq) return;
    if (m.type === "wheel") {
        const pos = positions()[curKey] || { x: 0, y: 0 };
        return handleWheel({ dx: m.dx, dy: m.dy, zoomKey: m.zoom, cx: view.x + (pos.x + m.x) * view.z, cy: view.y + (pos.y + m.y) * view.z });
    }
    if (m.type === "ready") {
        if (!history.length) { history = [m.html]; hIndex = 0; model.markup = m.html; if (!isNew) savedMarkup = m.html; }
        tree = m.tree;
        renderLayers();
        updateChrome();
        layout();
        if (!viewTouched) fitTo([curKey]);
        sentZoom = 0;
        applyView();
        send({ cmd: "tool", tool });
        send({ cmd: "cssProps", props: CSS_PROP_LIST });
        renderFloat();
    } else if (m.type === "height" || m.type === "preview-height") {
        frameHeight = m.height;
        layout();
        if (!viewTouched) fitTo([curKey]);
    } else if (m.type === "changed") {
        tree = m.tree;
        if (m.silent) model.markup = m.html;
        else commit(m.html, m.key || pendingKey);
        pendingKey = "";
        if (m.info) selected = m.info;
        renderLayers();
        if (!inspectorEditing()) renderInspector();
        renderFloat();
    } else if (m.type === "radius") {
        // a corner dot was dragged: apply the radius the same way the toolbar does (class in Tailwind mode, style otherwise)
        if (selected && pathKey(selected.path) === pathKey(m.path)) FLOAT_ACTIONS.radius(m.value);
    } else if (m.type === "info") {
        // the same element with fresh numbers (styles finished loading): update quietly
        if (selected && m.info && pathKey(selected.path) === pathKey(m.info.path)) {
            selected = m.info;
            if (!inspectorEditing()) renderInspector();
            renderFloat();
        }
    } else if (m.type === "typing") {
        model.markup = m.html;
        updateChrome();
    } else if (m.type === "overlay") {
        selData = m;
        renderSel();
    } else if (m.type === "editing") {
        editingInfo = m;
        renderFloat();
    } else if (m.type === "gesture") {
        gestureOn = m.on;
        renderFloat();
    } else if (m.type === "tool") {
        setTool(m.tool, true);
    } else if (m.type === "space") {
        setSpace(m.down);
    } else if (m.type === "selected") {
        // the same element reporting again (after an edit) keeps its open menu; a different one starts fresh
        if (!(selected && m.info && pathKey(selected.path) === pathKey(m.info.path))) ftMenu = false;
        selected = m.info;
        frameSel = null;
        renderLayers();
        if (!inspectorEditing()) renderInspector();
        renderFloat();
    } else if (m.type === "key") {
        handleKey(m);
    }
});

let pendingKey = "";
const cmd = (msg, key = "") => { pendingKey = key; send(msg); };

// ── Layers ───────────────────────────────────────────────────────────────────
const pathKey = (p) => (p || []).join(".");

function layerNode(n, depth) {
    const key = pathKey(n.path);
    const has = n.children.length > 0;
    const isCollapsed = collapsed.has(key);
    const isSel = selected && pathKey(selected.path) === key;
    const row = `<div class="layer-row cursor-pointer gap-1 px-1 ${isSel ? "is-selected" : ""}" style="padding-left:${depth * 12 + 4}px" data-path="${key}" ${n.tag === "body" ? "" : 'draggable="true"'}>
        <span data-caret="${key}" class="inline-flex h-4 w-4 shrink-0 items-center justify-center text-neutral-400">${has ? (isCollapsed ? "▸" : "▾") : ""}</span>
        <span class="shrink-0 font-mono text-[11px] text-neutral-500">${n.tag}</span>
        <span class="truncate text-neutral-800">${esc(n.label)}</span></div>`;
    return row + (has && !isCollapsed ? n.children.map((c) => layerNode(c, depth + 1)).join("") : "");
}

let revealedKey = null;
/** Scrolls the Layers panel to the selected row (opening its collapsed parents first). Only when the selection changed, so scrolling by hand isn't undone. */
function revealLayer(force) {
    const key = selected ? pathKey(selected.path) : null;
    if (!key && key !== "") { revealedKey = null; return; }
    if (!force && key === revealedKey) return;
    const pane = $("layersPane");
    if (pane.classList.contains("hidden") || $("panel").classList.contains("hidden")) return;
    const row = $("layers").querySelector(".layer-row.is-selected");
    if (!row) return;
    revealedKey = key;
    const pr = pane.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (rr.top < pr.top + 8 || rr.bottom > pr.bottom - 8) pane.scrollTop += (rr.top + rr.height / 2) - (pr.top + pr.height / 2);
}

let expandedFor = null;
function renderLayers() {
    // a new selection must be visible in the tree: open every parent of the selected element (once per selection, so you can still collapse one afterwards)
    const selKey = selected ? pathKey(selected.path) : null;
    if (selKey !== expandedFor) {
        expandedFor = selKey;
        if (selected && selected.path && selected.path.length) {
            let opened = false;
            for (let i = 0; i < selected.path.length; i++) { if (collapsed.delete(pathKey(selected.path.slice(0, i)))) opened = true; }
            if (opened) revealedKey = null;
        }
    }
    // The top level is the frames themselves. The live frame shows its element tree only while it, or something in it, is selected.
    const showTree = Boolean(tree) && (frameSel === curKey || Boolean(selected));
    const list = [...docs.values()];
    const tops = list.filter((d) => d.kind !== "section" || !list.some((p) => p.key === d.parent));
    const frameRow = (d, depth) => {
        const active = d.key === curKey;
        const title = (active ? data.title : d.meta.title) || "Untitled design";
        const on = active && frameSel === curKey;
        return `<div class="layer-row cursor-pointer gap-1 px-1 ${on ? "is-selected" : ""}" style="padding-left:${depth * 12 + 4}px" data-frame="${d.key}">
            <span class="inline-flex h-4 w-4 shrink-0 items-center justify-center text-neutral-400">${active && showTree ? "▾" : "▸"}</span>
            <span class="shrink-0 font-mono text-[11px] text-neutral-500">${d.kind === "section" ? "section" : "frame"}</span>
            <span class="truncate font-medium text-neutral-800">${esc(title)}</span></div>` + (active && showTree ? layerNode(tree, depth + 1) : "");
    };
    $("layers").innerHTML = tops.map((d) => frameRow(d, 0) + list.filter((c) => c.kind === "section" && c.parent === d.key).map((c) => frameRow(c, 1)).join("")).join("");
    revealLayer();
}

const parsePath = (s) => (s === "" ? [] : s.split(".").map(Number));

$("layers").addEventListener("click", (e) => {
    const fr = e.target.closest("[data-frame]");
    if (fr) {
        if (fr.dataset.frame !== curKey) activate(fr.dataset.frame);
        return selectFrame();
    }
    const caret = e.target.closest("[data-caret]");
    if (caret) {
        const k = caret.dataset.caret;
        collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k);
        return renderLayers();
    }
    const row = e.target.closest("[data-path]");
    if (row) { send({ cmd: "select", path: parsePath(row.dataset.path) }); send({ cmd: "scrollTo", path: parsePath(row.dataset.path) }); }
});
$("layers").addEventListener("mouseover", (e) => { const row = e.target.closest("[data-path]"); if (row) send({ cmd: "hover", path: parsePath(row.dataset.path) }); });
$("layers").addEventListener("mouseleave", () => send({ cmd: "hover", path: null }));

let dragPath = null;
$("layers").addEventListener("dragstart", (e) => { const row = e.target.closest("[data-path]"); if (!row) return; dragPath = row.dataset.path; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragPath); });
const clearDrop = () => document.querySelectorAll(".drop-before,.drop-after,.drop-inside").forEach((r) => r.classList.remove("drop-before", "drop-after", "drop-inside"));
const dropZone = (e, row) => { const r = row.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height; return y < 0.28 ? "before" : y > 0.72 ? "after" : "inside"; };
$("layers").addEventListener("dragover", (e) => {
    const row = e.target.closest("[data-path]");
    if (!row || dragPath === null) return;
    e.preventDefault();
    clearDrop();
    const zone = dropZone(e, row);
    if (row.dataset.path === "" && zone !== "inside") return;
    row.classList.add(`drop-${zone}`);
});
$("layers").addEventListener("dragleave", (e) => { if (!e.relatedTarget || !$("layers").contains(e.relatedTarget)) clearDrop(); });
$("layers").addEventListener("drop", (e) => {
    const row = e.target.closest("[data-path]");
    if (!row || dragPath === null) return;
    e.preventDefault();
    const zone = row.dataset.path === "" ? "inside" : dropZone(e, row);
    clearDrop();
    cmd({ cmd: "moveTo", path: parsePath(dragPath), targetPath: parsePath(row.dataset.path), position: zone });
    dragPath = null;
});
$("layers").addEventListener("dragend", () => { clearDrop(); dragPath = null; });

// ── Inspector (see inspector.js for the controls) ───────────────────────────
const insp = $("inspector");

function renderInspector() {
    const top = insp.scrollTop;
    insp.innerHTML = renderInspectorHtml(selected);
    insp.scrollTop = top;
}

function applyValue(key, value) {
    if (!selected) return;
    const next = setGroup(selected.classes, key, value, variant());
    if (next === null) return renderInspector();
    selected.classes = next;
    cmd({ cmd: "setClasses", path: selected.path, value: next });
}

function applyColor(key, name, op) {
    const o = op === undefined ? (val(selected, key).match(/\/(\d+)$/) || [])[1] || "" : op;
    const base = /^(#|rgb|hsl)/.test(name) ? `[${name.replace(/\s+/g, "_")}]` : name;
    applyValue(key, base ? base + (o && o !== "100" ? `/${o}` : "") : "");
}

function setDevice(w) {
    // a preset is a whole size: its width, with the height following the content (a hand-set height belongs to Custom)
    setFrameSize({ w, h: null });
    if (mode === "preview") loadFrame();
}

const setClassString = (next) => { selected.classes = next; cmd({ cmd: "setClasses", path: selected.path, value: next }); };

insp.addEventListener("click", (e) => {
    const t = e.target;
    const sm = t.closest("[data-stylemode]");
    if (sm) { ui.styleMode = sm.dataset.stylemode; return renderInspector(); }
    const rst = t.closest("[data-cssreset]");
    if (rst && selected) return cmd({ cmd: "setStyleProp", path: selected.path, prop: rst.dataset.cssreset, value: null });
    const cseg = t.closest("[data-cssseg]");
    if (cseg && selected) return cmd({ cmd: "setStyleProp", path: selected.path, prop: cseg.dataset.cssseg, value: cseg.dataset.cssv });
    const tab = t.closest("[data-tab]");
    if (tab) { ui.tab = tab.dataset.tab; return renderInspector(); }
    const sec = t.closest("[data-sec]");
    if (sec) { ui.open.has(sec.dataset.sec) ? ui.open.delete(sec.dataset.sec) : ui.open.add(sec.dataset.sec); return renderInspector(); }
    const sg = t.closest("[data-seg]");
    if (sg) return applyValue(sg.dataset.seg, sg.dataset.v);
    const pal = t.closest("[data-pal]");
    if (pal) { ui.palette = ui.palette === pal.dataset.pal ? null : pal.dataset.pal; return renderInspector(); }
    const cv = t.closest("[data-cv]");
    if (cv && ui.palette) return applyColor(ui.palette, cv.dataset.cv);
    const crumb = t.closest("[data-crumb]");
    if (crumb) return send({ cmd: "select", path: parsePath(crumb.dataset.crumb) });
    const rm = t.closest("[data-rm]");
    if (rm && selected) return setClassString(selected.classes.split(/\s+/).filter(Boolean).filter((_, i) => i !== Number(rm.dataset.rm)).join(" "));
    const free = t.closest("[data-free]");
    if (free && selected) return cmd({ cmd: "freePosition", path: selected.path, on: free.dataset.free === "on" });
    const al = t.closest("[data-align]");
    if (al) return send({ cmd: "align", mode: al.dataset.align });
    const d = t.closest("[data-do]");
    if (!d || !selected) return;
    if (d.dataset.do === "group") return send({ cmd: "group" });
    if (d.dataset.do === "ungroup") return send({ cmd: "ungroup" });
    const path = selected.path;
    if (d.dataset.do === "up") cmd({ cmd: "move", path, dir: -1 });
    if (d.dataset.do === "down") cmd({ cmd: "move", path, dir: 1 });
    if (d.dataset.do === "duplicate") cmd({ cmd: "duplicate", path });
    if (d.dataset.do === "remove") cmd({ cmd: "remove", path });
    if (d.dataset.do === "ai") askAI();
});

insp.addEventListener("change", (e) => {
    const t = e.target;
    if (!selected) return;
    if (t.dataset.csscolor) return cmd({ cmd: "setStyleProp", path: selected.path, prop: t.dataset.csscolor, value: t.value });
    if (t.dataset.css !== undefined) { const v = t.value.trim(); return cmd({ cmd: "setStyleProp", path: selected.path, prop: t.dataset.css, value: v === "" ? null : normalizeValue(t.dataset.css, v) }); }
    if (t.dataset.geom) { const n = Number(t.value); if (t.value.trim() === "" || !Number.isFinite(n)) return renderInspector(); return cmd({ cmd: "setGeom", path: selected.path, [t.dataset.geom]: n }); }
    if (t.matches("[data-g]")) return applyValue(t.dataset.g, t.value.trim());
    if (t.dataset.cname !== undefined) return applyColor(t.dataset.cname, t.value.trim());
    if (t.dataset.cop !== undefined) {
        const name = val(selected, t.dataset.cop).replace(/\/\d+$/, "");
        return name ? applyColor(t.dataset.cop, name, t.value.trim()) : renderInspector();
    }
    if (t.dataset.ccustom !== undefined) return applyColor(t.dataset.ccustom, t.value);
    if (t.matches("[data-bp]")) { ui.bp = t.value; setDevice(BREAKPOINT_WIDTH[ui.bp]); return renderInspector(); }
    if (t.matches("[data-st]")) { ui.st = t.value; return renderInspector(); }
    const stRow = t.closest("[data-stylerow]");
    if (stRow) {
        const css = [...insp.querySelectorAll("[data-stylerow]")]
            .map((r) => { const [k, v] = r.querySelectorAll("input"); return k.value.trim() && v.value.trim() ? `${k.value.trim()}: ${v.value.trim()}` : ""; })
            .filter(Boolean).join("; ");
        return cmd({ cmd: "setAttr", path: selected.path, name: "style", value: css ? css + ";" : null });
    }
    const aRow = t.closest("[data-arow]");
    if (aRow) {
        const [k, v] = aRow.querySelectorAll("input");
        const old = aRow.dataset.old;
        if (old && old !== k.value.trim()) cmd({ cmd: "setAttr", path: selected.path, name: old, value: null });
        if (k.value.trim()) cmd({ cmd: "setAttr", path: selected.path, name: k.value.trim(), value: v.value });
    }
});

insp.addEventListener("input", (e) => {
    if (!selected) return;
    const t = e.target;
    if (t.dataset.field === "text") cmd({ cmd: "setText", path: selected.path, text: t.value }, "text");
    else if (t.dataset.field === "classes") { selected.classes = t.value.trim(); cmd({ cmd: "setClasses", path: selected.path, value: selected.classes }, "classes"); }
    else if (t.dataset.attr) cmd({ cmd: "setAttr", path: selected.path, name: t.dataset.attr, value: t.value === "" ? null : t.value }, `attr-${t.dataset.attr}`);
});

insp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("[data-addclass]") && selected) {
        e.preventDefault();
        const add = e.target.value.split(/\s+/).filter(Boolean);
        if (!add.length) return;
        const cur = selected.classes.split(/\s+/).filter(Boolean);
        setClassString([...cur, ...add.filter((c) => !cur.includes(c))].join(" "));
        e.target.value = "";
    }
});

// ── Ask AI about the selected element ────────────────────────────────────────
async function askAI() {
    const input = $("aiInput");
    const note = $("aiNote");
    const prompt = input.value.trim();
    const say = (msg, bad) => { note.textContent = msg; note.className = `text-[11px] ${bad ? "text-red-700" : "text-neutral-500"}`; };
    if (!prompt) return say("Describe the change first.", true);
    const path = selected.path;
    say("Working...");
    try {
        const res = await fetch("/api/ai/generate-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: `${prompt}\n\nReturn ONLY the full modified HTML of this single element, keeping the same root tag. No explanation and no code fences.`,
                currentHtml: selected.outer,
                useLibrary: false,
            }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "AI request failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", out = "";
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop();
            for (const part of parts) {
                if (!part.startsWith("data:")) continue;
                let ev; try { ev = JSON.parse(part.slice(5)); } catch { continue; }
                if (ev.type === "delta") out += ev.text;
                if (ev.type === "error") throw new Error(ev.message);
            }
        }
        const html = out.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
        if (!html.startsWith("<")) throw new Error("The AI didn't return HTML. Try rephrasing.");
        cmd({ cmd: "replaceOuter", path, html });
        input.value = "";
        say("Applied. Undo with Ctrl/Cmd+Z.");
    } catch (err) {
        say(err.message, true);
    }
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
function setMode(next) {
    if (next === mode) return;
    mode = next;
    $("playBtn").classList.toggle("on", mode === "preview");
    $("inspector").style.opacity = $("layers").style.opacity = mode === "edit" ? "" : "0.4";
    $("inspector").style.pointerEvents = $("layers").style.pointerEvents = mode === "edit" ? "" : "none";
    $("canvasHint").textContent = mode === "edit" ? "Click to select. Double-click text to edit it. Scroll to pan, Ctrl/Cmd + scroll to zoom." : "Preview: running with its JavaScript. Press play again to go back to editing.";
    updateShield();
    loadFrame();
}
$("playBtn").addEventListener("click", () => setMode(mode === "edit" ? "preview" : "edit"));
$("zoomSel").addEventListener("change", (e) => {
    const v = e.target.value;
    if (v === "custom") return;
    viewTouched = true;
    if (v === "fit") return fitTo([...docs.keys()]);
    if (v === "frame") return fitTo([curKey]);
    const [W, H] = canvasSize();
    zoomAt(Number(v) / view.z, W / 2, H / 2);
});
$("undoBtn").addEventListener("click", () => step(-1));
$("redoBtn").addEventListener("click", () => step(1));
window.addEventListener("resize", layout);

const DEFAULT_CATEGORY = "apps-general";
const JSON_HEADERS = { "Content-Type": "application/json" };

/** Writes one design: creates it the first time, a new version after that. */
async function persist(d) {
    const m = d.meta;
    const doc = new DOMParser().parseFromString(d.markup, "text/html");
    const body = { htmlCode: assembleDoc(d.parsed, d.markup), elementsDescription: [...doc.body.children].map((c) => createDescriptionFromElement(c)) };
    if (d.isNew) {
        const res = await fetch("/api/components", {
            method: "POST", headers: JSON_HEADERS,
            body: JSON.stringify({
                ...body, title: m.title || "Untitled design", category: m.category || DEFAULT_CATEGORY, description: m.description || "A design on the canvas.",
                tags: (m.tags || []).join(","), isPublished: String(m.isPublished), project: m.project ? m.project.id : "",
            }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        m.id = json.data._id;
        m.version = json.data.version || 1;
        d.isNew = false;
        const old = d.key;
        remapKey(old, m.id);
        if (d.board && m.project) saveBoard([boardPayload([m.id, d.board])]);
        if (m.id === curKey) window.history.replaceState({}, "", `/design/${m.id}`);
    } else {
        const res = await fetch(`/api/components/${m.id}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ ...body, note: "Edited in design canvas" }) });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        m.version = json.data.version;
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
    if (needsDetails) { if (needsDetails.key !== curKey) activate(needsDetails.key); updateChrome(); return openDetails(); }
    updateChrome();
    $("saveState").textContent = dirty.length > 1 ? `Saved ${dirty.length} designs` : `Saved as v${data.version}`;
}
$("saveBtn").addEventListener("click", save);

// ── Keyboard ─────────────────────────────────────────────────────────────────
const TOOL_KEYS = { v: "move", h: "hand", f: "frame", r: "rect", o: "ellipse", t: "text", i: "image", b: "button" };

function handleKey({ key, meta, shift }) {
    if (meta && key === "z") return step(shift ? 1 : -1);
    if (meta && key === "y") return step(1);
    if (meta && key === "s") return save();
    if (key === "!") { viewTouched = true; return fitTo([...docs.keys()]); }
    if (key === "@") { viewTouched = true; return fitTo([curKey]); }
    if (!meta && TOOL_KEYS[key]) return setTool(TOOL_KEYS[key]);
    if (!selected) return;
    if (meta && key === "d") return send({ cmd: "duplicateSel" });
    if (meta && key === "g") return send({ cmd: shift ? "ungroup" : "group" });
    if (selected.tag === "body") return;
    if (key === "delete" || key === "backspace") return send({ cmd: "deleteSel" });
}
document.addEventListener("keydown", (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    const meta = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (e.code === "Space") { e.preventDefault(); setSpace(true); return; }
    if (e.shiftKey && (e.key === "!" || e.key === "@")) { e.preventDefault(); handleKey({ key: e.key, meta: false, shift: true }); return; }
    if (["delete", "backspace"].includes(key) || (meta && ["z", "y", "d", "s", "g"].includes(key)) || (!meta && !e.altKey && TOOL_KEYS[key])) {
        e.preventDefault();
        handleKey({ key, meta, shift: e.shiftKey });
    }
});
document.addEventListener("keyup", (e) => { if (e.code === "Space") setSpace(false); });

// ── Design tools: palette, panning, zoom ─────────────────────────────────────
const ICONS = {
    move: '<path d="M5 3l14 8-6 2-2 6z"/>',
    hand: '<path stroke-linecap="round" stroke-linejoin="round" d="M10 4v8m0-8a1.5 1.5 0 013 0v7m0-5.5a1.5 1.5 0 013 0V13m0-4.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L5 14a1.5 1.5 0 012.5-1.7L10 15"/>',
    frame: '<path stroke-linecap="round" stroke-linejoin="round" d="M7 3v18M17 3v18M3 7h18M3 17h18"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
    ellipse: '<circle cx="12" cy="12" r="8"/>',
    text: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 6V4h14v2M12 4v16m-3 0h6"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 16l-5-5-8 8"/>',
    button: '<rect x="3" y="8" width="18" height="8" rx="4"/><path stroke-linecap="round" d="M9 12h6"/>',
};
const TOOLS = [["move", "Move", "V"], ["hand", "Hand (or hold Space)", "H"], ["frame", "Frame", "F"], ["rect", "Rectangle", "R"], ["ellipse", "Ellipse", "O"], ["text", "Text", "T"], ["image", "Image", "I"], ["button", "Button", "B"]];
let tool = "move";
let spaceDown = false;

$("toolbar").innerHTML = TOOLS.map(([id, label, key], i) =>
    `${i === 2 ? '<span class="mx-1 h-5 w-px bg-neutral-200"></span>' : ""}<button type="button" data-tool="${id}" title="${label} (${key})" class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"><svg class="h-[18px] w-[18px]" fill="${id === "move" ? "currentColor" : "none"}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${ICONS[id]}</svg></button>`).join("");
$("toolbar").addEventListener("click", (e) => { const b = e.target.closest("[data-tool]"); if (b) setTool(b.dataset.tool); });

function setTool(t, fromAgent) {
    tool = t;
    $("toolbar").querySelectorAll("[data-tool]").forEach((b) => {
        const on = b.dataset.tool === t;
        b.classList.toggle("bg-[#0d99ff]", on);
        b.classList.toggle("text-white", on);
        b.classList.toggle("text-neutral-600", !on);
    });
    updateShield();
    if (!fromAgent) send({ cmd: "tool", tool: t });
}
function setSpace(down) { spaceDown = down; updateShield(); }
function updateShield() { $("toolbar").classList.toggle("hidden", mode !== "edit"); $("panShield").classList.toggle("hidden", !(mode === "edit" && (tool === "hand" || spaceDown))); }

// the shield catches drags over the canvas so panning uses real pointer coordinates
let pan = null;
$("panShield").addEventListener("pointerdown", (e) => { viewTouched = true; pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; $("panShield").setPointerCapture(e.pointerId); $("panShield").style.cursor = "grabbing"; });
$("panShield").addEventListener("pointermove", (e) => { if (!pan) return; view.x = pan.vx + e.clientX - pan.x; view.y = pan.vy + e.clientY - pan.y; applyView(); });
$("panShield").addEventListener("pointerup", () => { pan = null; $("panShield").style.cursor = "grab"; });

// scroll pans, Ctrl/Cmd + scroll (or a pinch) zooms around the pointer
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    handleWheel({ dx: e.deltaX, dy: e.deltaY, zoomKey: e.ctrlKey || e.metaKey, cx: e.clientX - r.left, cy: e.clientY - r.top });
}, { passive: false });

window.addEventListener("beforeunload", (e) => { if (anyDirty()) { e.preventDefault(); e.returnValue = ""; } });


// ── Code panel (two-way with the canvas) ─────────────────────────────────────
const codeText = $("codeText");
const codeOpen = () => !$("codePanel").classList.contains("hidden");
const codeFocused = () => document.activeElement === codeText;
let codeMirror = null;
/** Scrolls the code box so the character at `index` is in view (measured with an offscreen copy, since a textarea can't be asked). */
function revealInCode(text, index) {
    if (!codeMirror) { codeMirror = document.createElement("div"); document.body.appendChild(codeMirror); }
    const cs = getComputedStyle(codeText);
    Object.assign(codeMirror.style, { position: "absolute", visibility: "hidden", left: "-9999px", top: "0", width: `${codeText.clientWidth}px`, font: cs.font, lineHeight: cs.lineHeight, padding: cs.padding, boxSizing: "border-box", whiteSpace: "pre-wrap", overflowWrap: "break-word", tabSize: cs.tabSize });
    codeMirror.textContent = text.slice(0, index) + "\u200b";
    const y = codeMirror.offsetHeight;
    const lineH = parseFloat(cs.lineHeight) || 20;
    if (y - lineH < codeText.scrollTop || y > codeText.scrollTop + codeText.clientHeight - lineH) codeText.scrollTop = Math.max(0, y - codeText.clientHeight / 2);
}

function syncCode() {
    if (!codeOpen()) return;
    const next = model.markup.trim() ? assemble() : "";
    const prev = codeText.value;
    if (prev === next) return;
    const left = codeText.scrollLeft, top = codeText.scrollTop;
    codeText.value = next;
    codeText.scrollLeft = left;
    codeText.scrollTop = top;
    // show what changed: the first place the new code differs from the old
    let i = 0;
    while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
    if (prev) revealInCode(next, i);
}
function setCodePanel(open) {
    $("codePanel").classList.toggle("hidden", !open);
    $("codePanel").classList.toggle("flex", open);
    $("codeBtn").classList.toggle("on", open);
    if (open) { syncCode(); codeText.focus(); }
    layout();
}
$("codeBtn").addEventListener("click", () => setCodePanel(!codeOpen()));
$("codeClose").addEventListener("click", () => setCodePanel(false));
let codeTimer = null;
codeText.addEventListener("input", () => {
    clearTimeout(codeTimer);
    codeTimer = setTimeout(() => {
        parsed = parseComponentSource(codeText.value);
        commit(parsed.markup, "code");
        loadFrame();
    }, 500);
});

// ── Add menu: build from blocks ──────────────────────────────────────────────
const BLOCKS = [
    ["Section", '<section class="p-10"><h2 class="text-2xl font-bold">Section title</h2><p class="mt-2 text-gray-600">Describe this section.</p></section>'],
    ["Container", '<div class="mx-auto max-w-5xl p-6"></div>'],
    ["Columns (2)", '<div class="grid grid-cols-1 gap-6 md:grid-cols-2"><div class="p-6">Column one</div><div class="p-6">Column two</div></div>'],
    ["Heading", '<h2 class="text-3xl font-bold">Heading</h2>'],
    ["Text", '<p class="text-gray-600">Write something here.</p>'],
    ["Button", '<a href="#" class="inline-block rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white">Button</a>'],
    ["Image", '<img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=60" alt="Image" class="rounded-lg">'],
    ["Card", '<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h3 class="font-semibold">Card title</h3><p class="mt-1 text-sm text-gray-600">Card text.</p></div>'],
    ["Input", '<input type="text" placeholder="Type here" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">'],
];
const CONTAINERS = new Set(["body", "div", "section", "header", "footer", "main", "nav", "ul", "ol", "form", "article", "aside"]);
$("addMenu").innerHTML = BLOCKS.map(([name], i) => `<button type="button" data-block="${i}" class="block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-neutral-100">${name}</button>`).join("");
$("addBtn").addEventListener("click", (e) => { e.stopPropagation(); $("addMenu").classList.toggle("hidden"); });
document.addEventListener("click", () => $("addMenu").classList.add("hidden"));
$("addMenu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-block]");
    if (!b) return;
    const html = BLOCKS[Number(b.dataset.block)][1];
    if (model.markup.trim() === "" || !selected) {
        if (model.markup.trim() === "") { addToEmpty(html); return; }
        return cmd({ cmd: "insert", path: [], html, position: "inside" });
    }
    cmd({ cmd: "insert", path: selected.path, html, position: CONTAINERS.has(selected.tag) ? "inside" : "after" });
});
function addToEmpty(html) {
    model.markup = html;
    commit(html);
    loadFrame();
}

// ── Start screen: AI draft, paste, or a section ──────────────────────────────
$("startBlank").addEventListener("click", () => addToEmpty(BLOCKS[0][1]));
$("startPaste").addEventListener("click", () => setCodePanel(true));

async function streamAI(body, onText) {
    const res = await fetch("/api/ai/generate-stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "AI request failed");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", out = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
            if (!part.startsWith("data:")) continue;
            let ev; try { ev = JSON.parse(part.slice(5)); } catch { continue; }
            if (ev.type === "delta") { out += ev.text; onText && onText(out); }
            if (ev.type === "error") throw new Error(ev.message);
        }
    }
    return out.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
}

$("startGo").addEventListener("click", async () => {
    const prompt = $("startPrompt").value.trim();
    const note = $("startNote");
    const say = (msg, bad) => { note.textContent = msg; note.className = `mt-2 text-xs ${bad ? "text-red-700" : "text-neutral-500"}`; };
    if (!prompt) return say("Describe what you want first.", true);
    $("startGo").disabled = true;
    say("Drafting...");
    try {
        const html = await streamAI({ prompt, useLibrary: true });
        if (!html.startsWith("<")) throw new Error("The AI didn't return HTML. Try rephrasing.");
        parsed = parseComponentSource(html);
        commit(parsed.markup);
        loadFrame();
        if (!data.title) { data.title = prompt.slice(0, 60); updateChrome(); }
        $("startPrompt").value = "";
        say("");
    } catch (err) {
        say(err.message, true);
    } finally {
        $("startGo").disabled = false;
    }
});

// ── Details dialog: name, category, tags, visibility ─────────────────────────
const dlg = $("detailsDlg");
$("dCategory").innerHTML += (data.categories || []).map((g) => `<optgroup label="${esc(g.group)}">${g.items.map((i) => `<option value="${i.slug}">${esc(i.name)}</option>`).join("")}</optgroup>`).join("");

function fillProjects() {
    const cur = data.project ? data.project.id : "";
    $("dProject").innerHTML = `<option value="">No project</option>` + (data.projects || []).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("") + `<option value="__new__">New project...</option>`;
    $("dProject").value = cur;
}
$("dProject").addEventListener("change", async (e) => {
    if (e.target.value !== "__new__") return;
    const name = prompt("Project name");
    if (!name || !name.trim()) { fillProjects(); return; }
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const json = await res.json();
    if (!json.success) { alert(json.message || "Could not create the project"); return fillProjects(); }
    (data.projects ||= []).push({ id: json.data.id, name: json.data.name });
    fillProjects();
    $("dProject").value = json.data.id;
});

function openDetails() {
    fillProjects();
    $("dTitle").value = data.title || "";
    $("dCategory").value = data.category || "";
    $("dDesc").value = data.description || "";
    $("dTags").value = (data.tags || []).join(", ");
    $("dVis").value = String(data.isPublished);
    $("detailsTitle").textContent = isNew ? "Name and save your component" : "Component details";
    $("detailsSave").textContent = isNew ? "Create component" : "Save details";
    $("detailsError").classList.add("hidden");
    dlg.showModal();
}
$("detailsBtn").addEventListener("click", openDetails);
$("detailsCancel").addEventListener("click", () => dlg.close());

$("detailsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fields = { title: $("dTitle").value.trim(), category: $("dCategory").value, description: $("dDesc").value.trim(), tags: $("dTags").value, isPublished: $("dVis").value, project: $("dProject").value };
    if (!fields.title || !fields.category || !fields.description) return;
    const err = $("detailsError");
    $("detailsSave").disabled = true;
    try {
        let res;
        if (isNew) {
            const doc = new DOMParser().parseFromString(model.markup, "text/html");
            res = await fetch("/api/components", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fields, htmlCode: assemble(), elementsDescription: [...doc.body.children].map((c) => createDescriptionFromElement(c)) }),
            });
        } else {
            res = await fetch(`/api/components/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
        }
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        const movedProject = (data.project ? data.project.id : "") !== fields.project;
        data.project = (data.projects || []).find((p) => p.id === fields.project) || null;
        Object.assign(data, { title: fields.title, category: fields.category, description: fields.description, tags: fields.tags.split(",").map((t) => t.trim()).filter(Boolean), isPublished: fields.isPublished === "true" });
        if (isNew) {
            data.id = json.data._id;
            data.version = json.data.version || 1;
            isNew = false;
            savedMarkup = model.markup;
            window.history.replaceState({}, "", `/design/${data.id}`);
            const d = docs.get(curKey);
            if (d.board && data.project) saveBoard([boardPayload([data.id, d.board])]);
            remapKey(curKey, data.id);
        }
        dlg.close();
        updateChrome();
        // the plane belongs to a project, so a design that moved to another one reloads onto that project's plane
        if (movedProject && !anyDirty()) window.location.href = `/design/${data.id}`;
    } catch (error) {
        err.textContent = error.message || "Could not save";
        err.classList.remove("hidden");
    } finally {
        $("detailsSave").disabled = false;
    }
});

// ── Many designs on one plane ────────────────────────────────────────────────
// One design is live (the iframe you edit). The others are previews in the same project; click one to switch to it.
// Each design keeps its own history, so switching never loses edits. Save writes every changed design.
const META_KEYS = ["id", "title", "version", "category", "description", "tags", "isPublished", "project"];
const takeMeta = () => Object.fromEntries(META_KEYS.map((k) => [k, data[k]]));
const applyMeta = (m) => META_KEYS.forEach((k) => { data[k] = m[k]; });

const docs = new Map();
const wraps = new Map();
let curKey = data.id || "draft-0";
let draftCount = 0;
let planeProject = data.project || null;

docs.set(curKey, { key: curKey, meta: takeMeta(), kind: data.kind || (data.project ? "page" : "component"), parent: data.parent || null, board: data.board || null, parsed, markup: model.markup, history, hIndex, isNew, savedMarkup, height: 0, loaded: true });
(data.plane || []).forEach((it) => {
    if (it.id === curKey) return;
    docs.set(it.id, {
        key: it.id, kind: it.kind, parent: it.parent, board: it.board, source: it.htmlCode, loaded: false, isNew: false, height: 0,
        meta: { id: it.id, title: it.title, version: it.version, category: it.category, description: it.description, tags: it.tags, isPublished: it.isPublished, project: data.project },
    });
});

function stashActive() {
    const d = docs.get(curKey);
    Object.assign(d, { meta: takeMeta(), parsed, markup: model.markup, history, hIndex, isNew, savedMarkup, height: frameHeight, loaded: true });
}
function loadActiveFromStash() {
    const d = docs.get(curKey);
    applyMeta(d.meta);
    isNew = d.isNew;
    savedMarkup = d.savedMarkup;
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

const docDirty = (d) => d.loaded && (d.isNew ? d.markup.trim() !== "" : d.markup !== d.savedMarkup);
function anyDirty() {
    stashActive();
    return [...docs.values()].some(docDirty);
}

function remapKey(oldKey, newKey) {
    if (oldKey === newKey) return;
    const d = docs.get(oldKey);
    if (!d) return;
    d.key = newKey;
    docs.delete(oldKey);
    docs.set(newKey, d);
    const en = wraps.get(oldKey);
    if (en) { wraps.delete(oldKey); wraps.set(newKey, en); en.wrap.dataset.key = newKey; }
    if (curKey === oldKey) curKey = newKey;
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
    if (!en || !d || key === curKey || (en.ghost && !force)) return;
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
    const active = key === curKey;
    en.wrap.classList.toggle("active", active);
    en.wrap.classList.toggle("ghost", !active);
    if (active) {
        if (en.ghost) { en.ghost.remove(); en.ghost = null; }
        if (en.shield) { en.shield.remove(); en.shield = null; }
    } else if (!en.shield) {
        en.shield = document.createElement("div");
        en.shield.className = "gshield";
        en.shield.dataset.shield = "";
        en.shield.style.cursor = "pointer";
        en.box.appendChild(en.shield);
    }
}

function refreshLabels() {
    docs.forEach((d, key) => {
        const en = wraps.get(key);
        if (!en || en.renaming) return;
        const active = key === curKey;
        const title = active ? data.title : d.meta.title;
        const ver = active ? data.version : d.meta.version;
        const state = (active ? isNew : d.isNew) ? "new" : d.kind === "section" ? "section" : `v${ver}`;
        en.label.innerHTML = `${esc(title || "Untitled design")}<span>${state}</span>${docDirty(d) ? '<i class="dirty-dot" title="Unsaved changes"></i>' : ""}`;
    });
}

let layoutQueued = false;
function scheduleLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => { layoutQueued = false; layout(); });
}

function buildWraps() {
    docs.forEach((_, key) => makeWrap(key));
    docs.forEach((_, key) => setRole(key));
    refreshLabels();
}

// the designs list
function renderDesigns() {
    const list = [...docs.values()];
    const pages = list.filter((d) => d.kind !== "section" || !list.some((p) => p.key === d.parent));
    const row = (d, depth) => {
        const active = d.key === curKey;
        const title = (active ? data.title : d.meta.title) || "Untitled design";
        return `<div class="layer-row cursor-pointer gap-1 px-1 ${active ? "is-selected" : ""}" style="padding-left:${depth * 14 + 6}px" data-design="${d.key}">
            <span class="shrink-0 font-mono text-[10px] ${active ? "" : "text-neutral-500"}">${d.kind === "section" ? "sec" : "page"}</span>
            <span class="truncate">${esc(title)}</span>${docDirty(d) ? '<i class="dirty-dot"></i>' : ""}</div>`;
    };
    $("designsCount").textContent = String(list.length);
    $("designsName").textContent = data.title || "Untitled design";
    $("designs").innerHTML = pages.map((p) => row(p, 0) + list.filter((s) => s.kind === "section" && s.parent === p.key).map((s) => row(s, 1)).join("")).join("");
}
$("designs").addEventListener("click", (e) => {
    const r = e.target.closest("[data-design]");
    if (!r) return;
    viewTouched = true;
    $("designsMenu").classList.add("hidden");
    activate(r.dataset.design);
    fitTo([r.dataset.design], Math.max(view.z, 0.5));
});

/** Makes another design the live one. The current one stays on the plane as a preview with its edits. */
function activate(key) {
    if (key === curKey || !docs.has(key)) return;
    stashActive();
    const prev = docs.get(curKey);
    const next = docs.get(key);
    ensureLoaded(next);
    applyMeta(next.meta);
    parsed = next.parsed;
    model.markup = next.markup;
    history = next.history;
    hIndex = next.hIndex;
    isNew = next.isNew;
    savedMarkup = next.savedMarkup;
    frameHeight = Math.max(MIN_H, next.height || 0);
    lastKey = "";
    selected = null;
    tree = null;
    collapsed.clear();
    const oldKey = curKey;
    curKey = key;
    frameSel = null;
    setRole(key);
    setRole(oldKey);
    mountGhost(oldKey, true);
    window.history.replaceState({}, "", next.isNew ? "/design/new" : `/design/${next.meta.id}`);
    loadFrame();
    renderLayers();
    updateChrome();
    layout();
}

// moving frames: drag a label, or drag a preview. A plain click on a preview opens it.
const SNAP = 8;
const pendingSave = new Map();
let saveTimer = null;
async function saveBoard(positions) {
    if (!planeProject) return;
    try {
        await fetch(`/api/projects/${planeProject.id}/layout`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ positions }) });
    } catch { /* the position stays on screen; the next drag saves it again */ }
}
function queueBoardSave(key) {
    const d = docs.get(key);
    if (!d || d.isNew) return;
    pendingSave.set(key, d.board);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushBoard, 500);
}
const boardPayload = ([id, p]) => ({ id, x: p ? p.x : null, y: p ? p.y : null, w: p ? p.w ?? null : undefined, h: p ? p.h ?? null : undefined });
function flushBoard() {
    if (!pendingSave.size) return;
    const positions = [...pendingSave].map(boardPayload);
    pendingSave.clear();
    saveBoard(positions);
}
window.addEventListener("beforeunload", () => {
    if (pendingSave.size && planeProject && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/projects/${planeProject.id}/layout`, new Blob([JSON.stringify({ positions: [...pendingSave].map(boardPayload) })], { type: "application/json" }));
    }
});

let gesture = null;
/** A pointer position in the live frame's own coordinates (what the in-frame agent works in). */
function frameEvent(e) {
    const r = canvas.getBoundingClientRect();
    const p = positions()[curKey] || { x: 0, y: 0 };
    return { clientX: (e.clientX - r.left - view.x) / view.z - p.x, clientY: (e.clientY - r.top - view.y) / view.z - p.y, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey };
}

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
    if (fh && frameSel === curKey) {
        const d = docs.get(curKey);
        const pos = positions()[curKey];
        gesture = { type: "fresize", key: curKey, h: fh.dataset.fh, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, ow: widthOf(d), oh: heightOfDoc(d), moved: false };
    } else if (wrap) {
        const key = wrap.dataset.key;
        const pos = positions()[key];
        gesture = { type: "frame", key, wrap, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false, label: Boolean(label) };
    } else if (e.target === canvas || e.target === $("plane") || e.target === $("frames")) {
        gesture = tool === "move"
            ? { type: "marquee", sx: e.clientX, sy: e.clientY, moved: false }
            : { type: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
    } else return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
});
let lastHoverClear = 0;
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
    viewTouched = true;
    if (gesture.type === "pan") { view.x = gesture.vx + dx; view.y = gesture.vy + dy; return applyView(); }
    if (gesture.type === "marquee") return drawMarquee(gesture, e);
    if (gesture.type === "fresize") return resizeFrame(gesture, dx / view.z, dy / view.z);
    gesture.wrap.classList.add("dragging");
    const d = docs.get(gesture.key);
    const p = { x: Math.round((gesture.ox + dx / view.z) / SNAP) * SNAP, y: Math.round((gesture.oy + dy / view.z) / SNAP) * SNAP };
    d.board = { ...(d.board || {}), ...p };
    gesture.wrap.style.left = `${p.x}px`;
    gesture.wrap.style.top = `${p.y}px`;
    if (gesture.key === curKey) { frame.style.left = `${p.x}px`; frame.style.top = `${p.y}px`; }
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
    if (g.key !== curKey) activate(g.key);
    if (g.label) selectFrame();
});

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
    const key = hit.includes(curKey) ? curKey : hit[0];
    if (key !== curKey) activate(key);
    selectFrame();
}

/** Double-click a frame's name to rename it. Enter or clicking away saves, Esc cancels. */
function startRename(key) {
    const en = wraps.get(key);
    const d = docs.get(key);
    if (!en || !d || en.renaming) return;
    en.renaming = true;
    const current = (key === curKey ? data.title : d.meta.title) || "";
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

async function renameFrame(key, name, previous) {
    const d = docs.get(key);
    const isNewDoc = key === curKey ? isNew : d.isNew;
    const apply = (t) => { d.meta.title = t; if (key === curKey) data.title = t; updateChrome(); };
    apply(name);
    if (isNewDoc || !d.meta.id) return; // a design that isn't saved yet takes its name when it is
    try {
        const res = await fetch(`/api/components/${d.meta.id}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ title: name }) });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
    } catch (err) {
        apply(previous);
        alert(err.message || "Could not rename it");
    }
}
canvas.addEventListener("dblclick", (e) => {
    // the canvas holds the pointer during a click, so look at what is really under the cursor
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const label = under && under.closest("[data-label]");
    if (label && !label.querySelector("input")) startRename(label.closest(".fwrap").dataset.key);
});

function clearSelection() {
    frameSel = null;
    selected = null;
    send({ cmd: "deselect" });
    renderInspector();
    renderLayers();
    renderFloat();
}
function selectFrame() {
    selected = null;
    send({ cmd: "deselect" });
    frameSel = curKey;
    renderInspector();
    renderLayers();
    renderFloat();
}

const clampSize = (n, max) => Math.min(max, Math.max(120, Math.round(n)));

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
let lastCustom = null;
try { lastCustom = JSON.parse(localStorage.getItem("wc:customSize") || "null"); } catch { /* storage is optional */ }
function rememberCustom(d) {
    const w = d.board && d.board.w;
    if (!w || DEVICES.some(([p]) => p === w)) return;
    lastCustom = { w, h: (d.board && d.board.h) || null };
    try { localStorage.setItem("wc:customSize", JSON.stringify(lastCustom)); } catch { /* storage is optional */ }
}

/** Sets the live frame's width and/or height (null height = follow the content). Used by the frame toolbar. */
function setFrameSize(sz) {
    const d = docs.get(curKey);
    const p = positions()[curKey];
    const b = { x: p.x, y: p.y, ...(d.board || {}) };
    if ("w" in sz) b.w = clampSize(sz.w, 8000);
    if ("h" in sz) { if (sz.h === null) delete b.h; else b.h = clampSize(sz.h, 20000); }
    d.board = b;
    rememberCustom(d);
    queueBoardSave(curKey);
    layout();
}

// a new design on the same plane
async function ensureProject() {
    if (planeProject) return planeProject;
    const name = prompt("Designs that share a canvas live in a project. Name this project:", data.title || "My project");
    if (!name || !name.trim()) return null;
    const res = await fetch("/api/projects", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ name }) });
    const json = await res.json();
    if (!json.success) { alert(json.message || "Could not create the project"); return null; }
    const project = { id: json.data.id, name: json.data.name };
    if (!isNew) {
        const put = await fetch(`/api/components/${data.id}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ project: project.id }) });
        if (!(await put.json()).success) { alert("Could not add this design to the project"); return null; }
    }
    planeProject = project;
    (data.projects ||= []).push(project);
    data.project = project;
    const d = docs.get(curKey);
    d.kind = "page";
    return project;
}

$("newDesignBtn").addEventListener("click", async () => {
    $("designsMenu").classList.add("hidden");
    const project = await ensureProject();
    if (!project) return;
    const key = `draft-${++draftCount}`;
    docs.set(key, {
        key, kind: "page", parent: null, board: null, source: "", loaded: true, isNew: true, height: 0,
        parsed: parseComponentSource(""), markup: "", history: [], hIndex: -1, savedMarkup: "",
        meta: { id: null, title: "Untitled design", version: 0, category: data.category || DEFAULT_CATEGORY, description: "A design on the canvas.", tags: [], isPublished: false, project },
    });
    makeWrap(key);
    viewTouched = true;
    activate(key);
    layout();
    fitTo([key], 0.8);
    setTool("move");
});

// ── The floating toolbar, frame handles and the side panel ───────────────────
let editingInfo = null;
let gestureOn = false;
let frameSel = null;
let ftMenu = false;
const ftb = $("ftb");

function toolbarState() {
    if (mode !== "edit" || gestureOn || tool !== "move") return null;
    if (frameSel === curKey) {
        const d = docs.get(curKey);
        return { kind: "frame", frame: { w: widthOf(d), h: heightOfDoc(d), auto: !(d.board && d.board.h), custom: lastCustom } };
    }
    if (!selected || selected.tag === "body" || !selected.rect) return null;
    const editing = Boolean(editingInfo && editingInfo.on);
    const text = editing || TEXT_TAGS.has(selected.tag) || (selected.leaf && String(selected.text || "").trim() !== "");
    return { kind: text ? "text" : "shape", sel: selected, editing, fmt: editing ? editingInfo.fmt : null, menu: ftMenu };
}

/** Where the thing the toolbar belongs to sits inside the canvas element. */
function anchorRect(st) {
    const d = docs.get(curKey);
    const p = positions()[curKey];
    if (!p) return null;
    if (st.kind === "frame") return { x: view.x + p.x * view.z, y: view.y + p.y * view.z, w: widthOf(d) * view.z, h: heightOfDoc(d) * view.z, gap: 38 };
    const r = st.editing && editingInfo.rect ? editingInfo.rect : st.sel.rect;
    return { x: view.x + (p.x + r.x) * view.z, y: view.y + (p.y + r.y) * view.z, w: r.w * view.z, h: r.h * view.z, gap: 10 };
}

function placeFloat() {
    if (ftb.classList.contains("hidden")) return;
    const st = toolbarState();
    const a = st && anchorRect(st);
    if (!a) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const w = ftb.offsetWidth, h = ftb.offsetHeight;
    const left = Math.min(Math.max(8, a.x), Math.max(8, cw - w - 8));
    let top = a.y - h - a.gap;
    if (top < 56) top = a.y + a.h + 10;
    top = Math.min(Math.max(56, top), Math.max(56, ch - h - 8));
    ftb.style.left = `${Math.round(left)}px`;
    ftb.style.top = `${Math.round(top)}px`;
}

// the frame's handles, in screen pixels like the element selection (a handle must be 9px at any zoom)
const FRAME_HANDLES = [
    ["n", "left:0;top:0;width:100%;height:10px;transform:translateY(-50%);cursor:ns-resize;"], ["s", "left:0;top:100%;width:100%;height:10px;transform:translateY(-50%);cursor:ns-resize;"],
    ["w", "left:0;top:0;height:100%;width:10px;transform:translateX(-50%);cursor:ew-resize;"], ["e", "left:100%;top:0;height:100%;width:10px;transform:translateX(-50%);cursor:ew-resize;"],
];
const FRAME_CORNERS = [["nw", "left:0;top:0;cursor:nwse-resize;"], ["ne", "left:100%;top:0;cursor:nesw-resize;"], ["se", "left:100%;top:100%;cursor:nwse-resize;"], ["sw", "left:0;top:100%;cursor:nesw-resize;"]];

function renderFrameSel() {
    renderSel();
    // a frame's name is blue only while the frame, or something inside it, is selected
    wraps.forEach((en, key) => en.wrap.classList.toggle("sel", key === curKey && (frameSel === curKey || Boolean(selected && selected.tag !== "body"))));
    const el = $("fsel");
    const d = docs.get(curKey);
    const p = positions()[curKey];
    if (frameSel !== curKey || mode !== "edit" || !p) { el.innerHTML = ""; return; }
    const z = view.z;
    const box = `left:${Math.round((view.x + p.x * z) * 100) / 100}px;top:${Math.round((view.y + p.y * z) * 100) / 100}px;width:${Math.round(widthOf(d) * z * 100) / 100}px;height:${Math.round(heightOfDoc(d) * z * 100) / 100}px;`;
    const fx = view.x + p.x * z, fy = view.y + p.y * z;
    const outline = `<svg class="sout"><rect x="${fx - 0.75}" y="${fy - 0.75}" width="${widthOf(d) * z + 1.5}" height="${heightOfDoc(d) * z + 1.5}" fill="none" stroke="#0d99ff" stroke-width="1.5"/></svg>`;
    el.innerHTML = outline + `<div class="fbox" style="${box}">` + FRAME_HANDLES.map(([n, css]) => `<div class="fh" data-fh="${n}" style="${css}"></div>`).join("") + FRAME_CORNERS.map(([n, css]) => `<div class="fh fc" data-fh="${n}" style="${css}transform:translate(-50%,-50%);"></div>`).join("") + "</div>";
}

/** The selection box and its handles, above the frame (see selection-overlay.js). */
let selData = null;
function renderSel() {
    const el = $("sel");
    const p = positions()[curKey];
    if (mode !== "edit" || frameSel === curKey || !selData || !p) { el.innerHTML = ""; return; }
    el.innerHTML = selectionHtml(selData, { zoom: view.z, ox: view.x + p.x * view.z, oy: view.y + p.y * view.z });
}

function renderFloat(force) {
    renderFrameSel();
    const st = toolbarState();
    if (!st) { ftb.classList.add("hidden"); ftb.classList.remove("flex"); return; }
    // don't rebuild the bar under a number field someone is typing in, unless a button asked for it
    const typing = !force && document.activeElement && ftb.contains(document.activeElement) && document.activeElement.matches("input");
    if (!typing) ftb.innerHTML = toolbarHtml(st);
    ftb.classList.remove("hidden");
    ftb.classList.add("flex");
    placeFloat();
}

// The bar's buttons act on press, not on click: a value that was just typed makes the bar rebuild itself,
// which would swallow the click. Pressing also must not take focus from text being edited.
ftb.addEventListener("mousedown", (e) => {
    if (e.target.closest("select, input, label")) return;
    e.preventDefault();
    // a number field in the bar commits first
    const a = document.activeElement;
    if (a && ftb.contains(a) && a.matches("input")) a.blur();
    const dev = e.target.closest("[data-ftdev]");
    if (dev && dev.dataset.ftdev === "custom") return lastCustom && setFrameSize({ w: lastCustom.w, h: lastCustom.h });
    if (dev) return setDevice(Number(dev.dataset.ftdev));
    const b = e.target.closest("[data-ft]");
    if (b && FLOAT_ACTIONS[b.dataset.ft] && selected) FLOAT_ACTIONS[b.dataset.ft]();
});

const tw = () => selected && modeFor(selected) === "tailwind";
const styleProp = (prop, value) => cmd({ cmd: "setStyleProp", path: selected.path, prop, value });
const FLOAT_ACTIONS = {
    bold() {
        if (editingInfo && editingInfo.on) return send({ cmd: "exec", name: "bold" });
        const on = parseInt(selected.computed["font-weight"], 10) >= 600;
        tw() ? applyValue("fontWeight", on ? "font-normal" : "font-bold") : styleProp("font-weight", on ? "400" : "700");
    },
    italic() {
        if (editingInfo && editingInfo.on) return send({ cmd: "exec", name: "italic" });
        const on = selected.computed["font-style"] === "italic";
        tw() ? applyValue("fontStyle", on ? "not-italic" : "italic") : styleProp("font-style", on ? "normal" : "italic");
    },
    underline() {
        if (editingInfo && editingInfo.on) return send({ cmd: "exec", name: "underline" });
        const on = /underline/.test(selected.computed["text-decoration-line"] || "");
        tw() ? applyValue("textDecoration", on ? "no-underline" : "underline") : styleProp("text-decoration-line", on ? "none" : "underline");
    },
    link() {
        const url = prompt("Link address", "https://");
        if (!url) return;
        if (editingInfo && editingInfo.on) send({ cmd: "exec", name: "createLink", arg: url });
        else if (selected.tag === "a") cmd({ cmd: "setAttr", path: selected.path, name: "href", value: url });
        else alert("Select some text while editing it (double-click), then add the link.");
    },
    align() {
        const cur = selected.computed["text-align"];
        const next = { left: "center", start: "center", center: "right", right: "left", justify: "left" }[cur] || "center";
        tw() ? applyValue("textAlign", `text-${next}`) : styleProp("text-align", next);
    },
    radius(n) {
        // an inline border-radius would beat a Tailwind class, so edit it where it lives
        const inline = /border-(?:[a-z]+-)*radius/.test(selected.style || "");
        tw() && !inline ? applyValue("radius", n ? `${n}px` : "none") : styleProp("border-radius", n ? `${n}px` : "0");
    },
    more() { ftMenu = !ftMenu; renderFloat(true); },
    dup() { ftMenu = false; cmd({ cmd: "duplicate", path: selected.path }); },
    del() { ftMenu = false; cmd({ cmd: "remove", path: selected.path }); },
    up() { ftMenu = false; cmd({ cmd: "move", path: selected.path, dir: -1 }); },
    down() { ftMenu = false; cmd({ cmd: "move", path: selected.path, dir: 1 }); },
    free() { ftMenu = false; cmd({ cmd: "freePosition", path: selected.path, on: !selected.geom.abs }); },
    group() { ftMenu = false; send({ cmd: "group" }); },
    ungroup() { ftMenu = false; send({ cmd: "ungroup" }); },
    props() { ftMenu = false; setPanel(true); setPanelTab("props"); renderFloat(true); },
};

ftb.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.ftin === "fw") return setFrameSize({ w: Number(t.value) || curWidth() });
    if (t.dataset.ftin === "fh") return setFrameSize({ h: t.value.trim() === "" ? null : Number(t.value) || null });
    if (!selected) return;
    if (t.dataset.ftsel === "family") return tw() ? applyValue("fontFamily", `font-${t.value}`) : styleProp("font-family", FAMILY_STACKS[t.value]);
    if (t.dataset.ftin === "size") { const n = Number(t.value); return n > 0 ? (tw() ? applyValue("fontSize", `${n}px`) : styleProp("font-size", `${n}px`)) : renderFloat(); }
    if (t.dataset.ftin === "radius") return FLOAT_ACTIONS.radius(Math.max(0, Number(t.value) || 0));
    if (t.dataset.ftcol === "text") return tw() ? applyColor("textColor", t.value) : styleProp("color", t.value);
    if (t.dataset.ftcol === "fill") return tw() ? applyColor("bgColor", t.value) : styleProp("background-color", t.value);
});

document.addEventListener("click", (e) => {
    $("designsMenu").classList.add("hidden");
    if (ftMenu && !e.target.closest("#ftb")) { ftMenu = false; renderFloat(); }
});
$("designsBtn").addEventListener("click", (e) => { e.stopPropagation(); $("addMenu").classList.add("hidden"); $("designsMenu").classList.toggle("hidden"); });
$("designsMenu").addEventListener("click", (e) => e.stopPropagation());

// side panel: closed until you want every property or the layer tree
let panelTab = "props";
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* storage is optional */ } return null; };
function setPanelTab(t) {
    panelTab = t;
    document.querySelectorAll("#panelTabs .ptab").forEach((b) => b.classList.toggle("is-on", b.dataset.ptab === t));
    $("inspector").classList.toggle("hidden", t !== "props");
    $("layersPane").classList.toggle("hidden", t !== "layers");
    revealLayer(true);
}
function setPanel(open) {
    $("panel").classList.toggle("hidden", !open);
    $("panel").classList.toggle("flex", open);
    $("panelBtn").classList.toggle("on", open);
    pref("wc:panel", open ? "1" : "0");
    if (open) revealLayer(true);
    scheduleLayout();
}
$("panelBtn").addEventListener("click", () => setPanel($("panel").classList.contains("hidden")));
$("panelClose").addEventListener("click", () => setPanel(false));
$("panelTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-ptab]"); if (b) setPanelTab(b.dataset.ptab); });
new ResizeObserver(() => scheduleLayout()).observe(canvas);

// ── Go ───────────────────────────────────────────────────────────────────────
mountDatalists();
setPanelTab("props");
setPanel(pref("wc:panel") === "1");
setTool("move", true); // start on the arrow, highlighted in the toolbar
buildWraps();
updateChrome();
renderInspector();
layout();
loadFrame();
