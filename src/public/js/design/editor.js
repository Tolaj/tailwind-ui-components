import { parseComponentSource, buildPreviewDocument } from "../playground/component-source.js";
import { computeLayout } from "../shared/board-layout.js";
import { agentMain } from "./agent.js";
import { BREAKPOINT_WIDTH, BREAKPOINTS, setGroup, GROUPS, parseToken } from "./class-groups.js";
import { ui, variant, val, renderInspectorHtml, mountDatalists, modeFor, srcOf } from "./inspector.js";
import { groupOf, twValue, twShown, variantOf, fromPx, hasScale } from "./prop-tailwind.js";
import { toolbarHtml, TEXT_TAGS, FAMILY_STACKS, DEVICES } from "./float-toolbar.js";
import { selectionHtml } from "./selection-overlay.js";
import { openColorPicker, closeColorPicker, colorPickerOpener } from "./color-picker.js";
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
    // the design's own stylesheets are marked, so the panel can tell their rules from the ones Tailwind generates (agent.js sourcesOf)
    const mark = (tag) => tag.replace(/^<(style|link)\b/i, "<$1 data-wc-design");
    head.push(...parsed.links.map(mark), ...parsed.styles.map(styleTag).map(mark), "<style data-wc-editor>html,body{margin:0}</style>");
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
    ftPop = null;
    ftSides = {};
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
    if (data.project) { pl.innerHTML = `<span class="truncate">Project: ${esc(data.project.name)}</span><svg class="shrink-0 text-neutral-500" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5h5v5M9.5 2.5l-6 6"/></svg>`; pl.href = `/projects/${data.project.id}`; }
    if (!codeFocused()) syncCode();
    renderDesigns();
    refreshLabels();
}

function commit(html, key) {
    model.markup = html;
    const now = Date.now();
    if (html === history[hIndex]) { lastKey = key || ""; lastTime = now; return updateChrome(); } // nothing changed: no undo step
    // the same key merges into the last step: within 800 ms, or for a "live:" key (a picker being dragged) for as long as it lasts
    if (key && key === lastKey && (key.startsWith("live:") || now - lastTime < 800) && hIndex === history.length - 1) {
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
    placePills(); // the zoom label changes the right group's width
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
    if (!selected && !pageEditing()) setTimeout(renderInspector, 0); // the page panel (shown while no element is selected) follows its size and position
    const pos = positions();
    docs.forEach((d, key) => {
        const en = wraps.get(key);
        const p = pos[key];
        if (!en || !p) return;
        const h = heightOfDoc(d);
        Object.assign(en.wrap.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${widthOf(d)}px`, height: `${h}px` });
        // the live iframe never changes parent (that would reload it); it just sits over the active frame (over the page being
        // left, while a switch is under way)
        if (!switching) frameAt = curKey;
        if (key === frameAt) Object.assign(frame.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${widthOf(d)}px`, height: `${h}px` });
    });
    placePills();
    applyView();
    renderFloat();
}

/** The two tool groups share the top row; when the canvas is too narrow for both side by side, the right one drops under the left. */
function placePills() {
    const left = $("pillL"), right = $("pillR");
    right.style.top = "";
    left.style.maxWidth = "none";
    left.classList.remove("tight");
    const natural = left.offsetWidth; // the left group at its full width
    left.style.maxWidth = "calc(100% - 24px)"; // beyond that the design name shrinks...
    if (canvas.clientWidth < natural - 100) left.classList.add("tight"); // ...and finally disappears
    if (canvas.clientWidth < natural + right.offsetWidth + 12 * 3) right.style.top = "60px";
}

function handleWheel({ dx, dy, zoomKey, cx, cy }) {
    viewTouched = true;
    if (zoomKey) zoomAt(Math.exp(-dy * 0.01), cx, cy);
    else { view.x -= dx; view.y -= dy; applyView(); }
}

// ── Messages from the frame ──────────────────────────────────────────────────
const inspectorEditing = () => Boolean(document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-live], input[type="color"]') && $("inspector").contains(document.activeElement));

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
    if (handingOver) return; // the page being left, still in the frame for a moment (activate)
    // Pressing inside the page doesn't take focus from a field in the bar. Let that field commit (to the element it was showing)
    // before the selection moves on, so the bar then rebuilds for the new element instead of keeping a stale field.
    // An edit reports the same element back: that must not blur a field still in use (a colour picker being dragged).
    const otherElement = m.type === "selected" && !(selected && m.info && pathKey(selected.path) === pathKey(m.info.path));
    if (otherElement || (m.type === "gesture" && m.on)) {
        closeColorPicker(); // its colours belong to the element it was opened for
        const a = document.activeElement;
        if (a && ftb.contains(a) && a.matches("input, select")) a.blur();
    }
    if (m.type === "zoomKey") return keyZoom(m.key);
    if (m.type === "wheel") {
        const pos = positions()[curKey] || { x: 0, y: 0 };
        return handleWheel({ dx: m.dx, dy: m.dy, zoomKey: m.zoom, cx: view.x + (pos.x + m.x) * view.z, cy: view.y + (pos.y + m.y) * view.z });
    }
    if (m.type === "ready") {
        if (switching) {
            switching = false;
            // the frame moves over now (layout below) but shows a moment later, once Tailwind has styled the new design; the
            // snapshot is right in the meantime
            const key = curKey, token = switchToken;
            setTimeout(() => {
                if (token !== switchToken || key !== curKey) return;
                const en = wraps.get(key);
                if (en && en.ghost) { en.ghost.remove(); en.ghost = null; }
                frame.style.visibility = "";
            }, 120);
        }
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
        const newSelection = !(selected && m.info && pathKey(selected.path) === pathKey(m.info.path));
        if (newSelection) { ftMenu = false; ftPop = null; ftSides = {}; }
        selected = m.info;
        frameSel = null;
        updateCodeHighlight(newSelection); // find it in the code, and scroll there when it is a different element
        renderLayers();
        if (!inspectorEditing()) renderInspector();
        renderFloat();
    } else if (m.type === "frameClick") {
        selectFrame(); // the empty part of the design was clicked: the frame, with its handles and the page panel
    } else if (m.type === "hoverFrame") {
        const en = wraps.get(curKey);
        if (en) en.wrap.classList.toggle("bodyhover", Boolean(m.on));
    } else if (m.type === "convert") {
        convertGesture(m.items || []);
    } else if (m.type === "key") {
        handleKey(m);
    }
});

let pendingKey = "";
const cmd = (msg, key = "") => { pendingKey = key; send(key ? { key, ...msg } : msg); };

// ── Layers ───────────────────────────────────────────────────────────────────
const pathKey = (p) => (p || []).join(".");
// A small page icon: the Pages section and the page rows use it instead of repeating the word "page"
const PAGE_ICON = '<svg class="shrink-0 text-neutral-500" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="3" y="2" width="10" height="12" rx="1.5"/></svg>';
// Figma-style chevron: points right when closed, down when open
const chevron = (open) => `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="${open ? "transform:rotate(90deg);" : ""}"><path d="M4.5 2.5 8 6 4.5 9.5"/></svg>`;

function layerNode(n, depth) {
    const key = pathKey(n.path);
    const has = n.children.length > 0;
    const isCollapsed = collapsed.has(key);
    const isSel = selected && pathKey(selected.path) === key;
    const row = `<div class="layer-row cursor-pointer gap-1 px-1 ${isSel ? "is-selected" : ""}" style="padding-left:${depth * 12 + 4}px" data-path="${key}" ${n.tag === "body" ? "" : 'draggable="true"'}>
        <span data-caret="${key}" class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200">${has ? chevron(!isCollapsed) : ""}</span>
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
    if (!leftOpen) return;
    const pane = $("leftBody");
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
    // Pages are their own section above, so Layers is just the current page's element tree.
    $("layers").innerHTML = tree ? layerNode(tree, 0) : '<div class="px-2 py-2 text-[11px] text-neutral-500">Loading…</div>';
    revealLayer();
}

const parsePath = (s) => (s === "" ? [] : s.split(".").map(Number));

// ── Pages section (left panel) ───────────────────────────────────────────────
/** The project and the current page, always visible above the Pages list. */
function renderDetailsBlock() {
    const pr = $("leftProject");
    const ARROW = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5h5v5M9.5 2.5l-6 6"/></svg>';
    if (data.project) {
        pr.href = `/projects/${data.project.id}`;
        pr.innerHTML = `<span class="truncate">${esc(data.project.name)}</span><span class="sub2">${ARROW}</span>`;
    } else {
        pr.href = "#";
        pr.innerHTML = '<span class="mut truncate">No project</span>';
    }
}
$("pagesList").addEventListener("click", (e) => {
    if (!e.target.closest("[data-pedit]")) return;
    e.stopImmediatePropagation();
    $("detailsBtn").click();
}, true);
$("leftProject").addEventListener("click", (e) => { if (!data.project) { e.preventDefault(); $("detailsBtn").click(); } });

const PAGE_EDIT = '<button type="button" data-pedit class="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-white/70" title="Page details: name, category, tags, visibility"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>';
function renderPagesList() {
    const el = $("pagesList");
    if (!leftOpen) return;
    renderDetailsBlock();
    if (el.querySelector(".frename")) return; // not while a name is being typed
    const list = [...docs.values()];
    const tops = list.filter((d) => d.kind !== "section" || !list.some((p) => p.key === d.parent));
    const row = (d, depth) => {
        const active = d.key === curKey;
        const title = (active ? data.title : d.meta.title) || "Untitled page";
        return `<div class="layer-row cursor-pointer gap-1.5 px-1 ${active ? "is-selected" : ""}" style="padding-left:${depth * 12 + 8}px" data-page="${d.key}" title="Double-click to rename">${d.kind === "section" ? '<span class="shrink-0 font-mono text-[11px] text-neutral-500">section</span>' : PAGE_ICON}<span class="truncate">${esc(title)}</span>${docDirty(d) ? '<i class="dirty-dot" title="Unsaved changes"></i>' : ""}${active ? PAGE_EDIT : ""}</div>`;
    };
    el.innerHTML = tops.map((d) => row(d, 0) + list.filter((c) => c.kind === "section" && c.parent === d.key).map((c) => row(c, 1)).join("")).join("");
}
$("pagesList").addEventListener("click", (e) => {
    const row = e.target.closest("[data-page]");
    if (!row || e.target.closest(".frename")) return;
    viewTouched = true;
    activate(row.dataset.page);
    fitTo([row.dataset.page], Math.max(view.z, 0.5));
});
$("pagesList").addEventListener("dblclick", (e) => {
    const row = e.target.closest("[data-page]");
    if (!row || e.target.closest(".frename, [data-pedit]")) return;
    const key = row.dataset.page;
    const d = docs.get(key);
    const current = (key === curKey ? data.title : d.meta.title) || "";
    const label = row.querySelector("span.truncate");
    const input = document.createElement("input");
    input.className = "frename";
    input.style.cssText = "min-width:0;width:100%;height:20px;font-size:12px";
    input.value = current;
    input.maxLength = 80;
    label.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
        if (done) return;
        done = true;
        const name = input.value.trim();
        input.remove();
        renderPagesList();
        if (save && name && name !== current) renameFrame(key, name, current);
    };
    input.addEventListener("keydown", (ev) => { ev.stopPropagation(); if (ev.key === "Enter") { ev.preventDefault(); finish(true); } if (ev.key === "Escape") { ev.preventDefault(); finish(false); } });
    input.addEventListener("blur", () => finish(true));
});
$("pagesAdd").addEventListener("click", () => $("newDesignBtn").click());

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
$("layers").addEventListener("dragstart", (e) => {
    const row = e.target.closest("[data-path]");
    if (!row) return;
    dragPath = row.dataset.path;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragPath);
    // a small label follows the pointer (not a smeared copy of the row), and the row itself dims so it is clear what is moving
    const chip = document.createElement("div");
    chip.textContent = row.textContent.replace(/\s+/g, " ").trim();
    chip.style.cssText = "position:fixed;top:-100px;left:-100px;padding:3px 10px;border-radius:6px;background:rgba(17,17,17,.7);color:#fff;font:12px system-ui,sans-serif;white-space:nowrap";
    document.body.appendChild(chip);
    e.dataTransfer.setDragImage(chip, -14, -10); // offset to the lower right, so the pointer and the drop line stay visible
    setTimeout(() => { chip.remove(); row.classList.add("is-dragging"); }, 0);
});
const clearDrop = () => document.querySelectorAll(".drop-before,.drop-after,.drop-inside").forEach((r) => r.classList.remove("drop-before", "drop-after", "drop-inside"));
const dropZone = (e, row) => { const r = row.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height; return y < 0.28 ? "before" : y > 0.72 ? "after" : "inside"; };
// an element can't be dropped on itself or inside what it contains
const badDrop = (target) => dragPath === target || (dragPath !== "" && target.startsWith(`${dragPath}.`));
$("layers").addEventListener("dragover", (e) => {
    const row = e.target.closest("[data-path]");
    if (!row || dragPath === null) return;
    clearDrop();
    if (badDrop(row.dataset.path)) return;
    e.preventDefault();
    const zone = dropZone(e, row);
    if (row.dataset.path === "" && zone !== "inside") return;
    row.style.setProperty("--ind", row.style.paddingLeft || "0px"); // the insertion line starts at the row's own indent, so the new depth is readable
    row.classList.add(`drop-${zone}`);
});
$("layers").addEventListener("dragleave", (e) => { if (!e.relatedTarget || !$("layers").contains(e.relatedTarget)) clearDrop(); });
$("layers").addEventListener("drop", (e) => {
    const row = e.target.closest("[data-path]");
    if (!row || dragPath === null || badDrop(row.dataset.path)) return;
    e.preventDefault();
    const zone = row.dataset.path === "" ? "inside" : dropZone(e, row);
    clearDrop();
    cmd({ cmd: "moveTo", path: parsePath(dragPath), targetPath: parsePath(row.dataset.path), position: zone });
    dragPath = null;
});
$("layers").addEventListener("dragend", () => { clearDrop(); dragPath = null; document.querySelectorAll(".is-dragging").forEach((r) => r.classList.remove("is-dragging")); });

// ── Inspector (see inspector.js for the controls) ───────────────────────────
const insp = $("inspector");

/** The selected page's own properties, for the panel. */
function pageInfo() {
    const d = docs.get(curKey), p = positions()[curKey] || { x: 0, y: 0 };
    return { name: data.title || "", w: widthOf(d), h: heightOfDoc(d), auto: !(d.board && d.board.h), empty: model.markup.trim() === "", x: Math.round(p.x), y: Math.round(p.y), version: data.version, isNew, project: data.project && data.project.name };
}
function setPageBox(patch) {
    const d = docs.get(curKey), p = positions()[curKey];
    d.board = { x: p.x, y: p.y, ...(d.board || {}), ...patch };
    rememberCustom(d);
    queueBoardSave(curKey);
    layout();
}
const pageEditing = () => Boolean(document.activeElement && document.activeElement.matches && document.activeElement.matches("[data-pg], #pageAi") && $("inspector").contains(document.activeElement));
function renderInspector() {
    ui.frameBp = frameBp();
    const top = insp.scrollTop;
    insp.innerHTML = renderInspectorHtml(selected, selected ? null : pageInfo());
    insp.scrollTop = top;
}

function applyValue(key, value, undoKey = "") {
    if (!selected) return;
    const next = setGroup(selected.classes, key, value, variant());
    if (next === null) return renderInspector();
    selected.classes = next;
    cmd({ cmd: "setClasses", path: selected.path, value: next }, undoKey);
}

function applyColor(key, name, op, undoKey = "") {
    const o = op === undefined ? (val(selected, key).match(/\/(\d+)$/) || [])[1] || "" : op;
    const base = /^(#|rgb|hsl)/.test(name) ? `[${name.replace(/\s+/g, "_")}]` : name;
    applyValue(key, base ? base + (o && o !== "100" ? `/${o}` : "") : "", undoKey);
}

// ── Colour pickers apply as they are dragged ─────────────────────────────────
// Every pick, from opening a picker to closing it, is one undo step: a "live:" key (merged by commit without the time limit)
// that moves on once the picker closes. The picker field is blurred then, so the bar and panel show the final value.
let liveSession = 0;
const liveKey = (field) => `live:${field}:${liveSession}`;
const pickerClosed = (t) => { liveSession++; t.blur(); };

// ── Which breakpoint a new class gets ────────────────────────────────────────
// Sizes, position and spacing follow the frame's width, mobile-first: Desktop (1280) writes xl:, Tablet (768) md:, Mobile the
// base class, so each screen size is designed by switching the frame. Colours, type and borders stay plain classes.
const RESPONSIVE = new Set(["w", "h", "minW", "maxW", "minH", "maxH", "gap", "gapX", "gapY", "inset", "top", "right", "bottom", "left", "p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml"]);
const familyOf = (g) => (/^p[xytrbl]?$/.test(g) ? ["p", "px", "py", "pt", "pr", "pb", "pl"] : /^m[xytrbl]?$/.test(g) ? ["m", "mx", "my", "mt", "mr", "mb", "ml"] : ["inset", "top", "right", "bottom", "left"].includes(g) ? ["inset", "top", "right", "bottom", "left"] : [g]);
/** "xl:" for a 1280 frame, "md:" for 768, "" for a phone-sized one: the largest breakpoint the frame's width reaches. */
function frameBp() {
    const w = curWidth();
    let bp = "";
    BREAKPOINTS.forEach((b) => { if (b && BREAKPOINT_WIDTH[b] <= w) bp = b; });
    return bp ? `${bp}:` : "";
}
/**
 * The variant for a new class of `group`: the one picked by hand in the panel, if any; else, for sizes and spacing, the frame's
 * breakpoint, unless the element has no class of that kind yet: then the base class, so smaller screens keep the value too.
 */
function newVariant(classes, group) {
    if (ui.bp || ui.st) return variant();
    if (!RESPONSIVE.has(group)) return "";
    const fam = familyOf(group).map((k) => GROUPS[k]);
    const has = String(classes || "").split(/\s+/).filter(Boolean).some((t) => fam.some((g) => g.re.test(parseToken(t).base)));
    return has ? frameBp() : "";
}

/**
 * A property edited in the panel is written where its value comes from: a Tailwind class is replaced (at the same md: / hover:
 * variant), an inline style or the design's own CSS gets an inline style. A property nothing sets yet becomes a Tailwind class,
 * unless the element is styled only by its design's CSS. The frame checks the result and falls back to CSS when a class can't win.
 */
function setProp(prop, raw, cssOverride, key) {
    if (!selected) return;
    const s = selected, src = srcOf(s, prop), v = String(raw ?? "").trim();
    const group = groupOf(prop);
    const onTw = src.source === "tailwind";
    const winning = onTw ? variantOf(src.token) : "";
    const vp = winning || newVariant(s.classes, group); // a md:/xl: class that gives the value is edited where it is
    const send = (m) => cmd({ cmd: "setProp", path: s.path, prop, key, ...m }, key);
    if (v === "") {
        if (onTw && group) { const next = setGroup(s.classes, group, "", winning); if (next !== null) { s.classes = next; return send({ route: "tw", classes: next }); } }
        if (src.source === "inline") return send({ route: "css", css: null });
        return renderInspector();
    }
    // "500" means 500px, except on a row showing a Tailwind value (64 from w-64), where a bare number is Tailwind's scale
    const scale = onTw && twShown(prop, src.token) !== null && hasScale(group);
    const candidate = scale && /^-?\d*\.?\d+$/.test(v) ? v : normalizeValue(prop, v);
    const css = cssOverride !== undefined ? cssOverride : CSS.supports(prop, candidate) ? candidate : null;
    const tv = group ? twValue(prop, v, scale) : null;
    let token = null;
    if (tv !== null) { const built = GROUPS[group].build(tv); if (GROUPS[group].re.test(built)) token = built; }
    const toTw = onTw || src.source === "tie" || (src.source !== "inline" && src.source !== "design" && modeFor(s) === "tailwind");
    if (toTw && token) {
        const next = setGroup(s.classes, group, tv, vp);
        // kept here at once, so an edit sent right after this one (a line style, then a width) builds on it
        if (next !== null) { s.classes = next; return send({ route: "tw", classes: next, token: vp + token, css }); }
    }
    if (css === null && !token) return renderInspector(); // neither valid CSS nor a Tailwind value: put the old value back
    send({ route: "css", css, token }); // a Tailwind value on a CSS row (red-500): the frame measures what it means
}

/**
 * One value for several properties at once (all four paddings, the two sides of padding-h, every border width or corner), written
 * like setProp: as the `group` class when they are Tailwind's or unset on a Tailwind element (clearing the per-side classes in
 * `clear`, which would otherwise win), and as inline CSS on every one of them when any comes from CSS.
 */
function setProps(props, raw, group, clear = [], cssOverride, key) {
    if (!selected) return;
    const s = selected, srcs = props.map((p) => srcOf(s, p));
    const v = String(raw ?? "").trim();
    const px = /^-?\d*\.?\d+(px)?$/.test(v);
    const n = parseFloat(v);
    const css = cssOverride !== undefined ? cssOverride : px ? `${n}px` : CSS.supports(props[0], v) ? v : null;
    const own = srcs.find((x) => x.source === "tailwind");
    const vp = (own && variantOf(own.token)) || newVariant(s.classes, group);
    const fromCss = srcs.some((x) => x.source === "inline" || x.source === "design");
    const tv = group ? (px ? fromPx(group, n) : twValue(props[0], v, false) ?? v) : null;
    let token = null;
    if (tv !== null) { const built = GROUPS[group].build(tv); if (GROUPS[group].re.test(built)) token = built; }
    if (!fromCss && token && (own || modeFor(s) === "tailwind")) {
        let classes = s.classes;
        for (const k of clear) { const next = setGroup(classes, k, "", vp); if (next !== null) classes = next; }
        const next = setGroup(classes, group, tv, vp);
        if (next !== null) { s.classes = next; return cmd({ cmd: "setProp", path: s.path, props, route: "tw", classes: next, token: vp + token, css, key }, key); }
    }
    cmd({ cmd: "setProp", path: s.path, props, route: "css", css, token, key }, key);
}

/**
 * A drag, resize or new shape has ended and its pixels are inline. Each value becomes a Tailwind class (at its own md: / hover:
 * variant if a class set it before) when the element is Tailwind's: made here, or the value came from a class, or nothing set it
 * on an element that uses Tailwind. A value that came from CSS stays CSS, and so does everything on an element styled only by its
 * design's CSS. The frame puts the classes on, checks them and saves the result as one undo step (agent.js applyGesture).
 */
function convertGesture(items) {
    const blocked = items.find((it) => it.blocked);
    if (blocked) flashHint(`This element's ${blocked.blocked} is set by its flex layout. Use "Size it myself" in the panel to size it by hand.`);
    send({ cmd: "applyGesture", items: items.map((it) => {
        const tw = it.made || modeFor({ classes: it.classes }) === "tailwind";
        let classes = it.classes;
        const tokens = {};
        Object.entries(it.values).forEach(([prop, value]) => {
            const pre = it.pre[prop] || { source: "default" };
            if (!it.made && (pre.source === "inline" || pre.source === "design")) return; // it was CSS: it stays CSS
            if (!tw && pre.source !== "tailwind") return;
            const group = groupOf(prop);
            if (!group) return;
            const tv = /^-?[\d.]+px$/.test(value) ? fromPx(group, Math.round(parseFloat(value))) : twValue(prop, value, false); // a size, or a word (flex, column, absolute)
            if (tv === null) return;
            const built = GROUPS[group].build(tv);
            if (!GROUPS[group].re.test(built)) return;
            // judged on the classes from before this gesture: a left-[..] written a moment ago must not make top an xl: class
            const vp = (pre.source === "tailwind" && variantOf(pre.token)) || newVariant(it.classes, group);
            const next = setGroup(classes, group, tv, vp);
            if (next === null) return;
            classes = next;
            tokens[prop] = vp + built;
        });
        return { path: it.path, classes, tokens };
    }) });
}

/** A flex child that grows to fill its row: stop flex from sizing it (flex-none, or flex: none in CSS), so a width or height set on it applies. */
function sizeItMyself() {
    if (!selected) return;
    if (modeFor(selected) !== "tailwind") return cmd({ cmd: "setStyleProps", path: selected.path, props: { flex: "none" } });
    let classes = setGroup(selected.classes, "grow", "", variant()) ?? selected.classes;
    classes = setGroup(classes, "flexNum", "flex-none", variant()) ?? classes;
    setClassString(classes);
}
/** A short note in the hint under the canvas, back to the usual text after a few seconds. */
let hintTimer = 0;
function flashHint(text) {
    const h = $("canvasHint");
    clearTimeout(hintTimer);
    h.textContent = text;
    hintTimer = setTimeout(() => { h.textContent = mode === "edit" ? "Click to select. Double-click text to edit it. Alt-drag to place freely. Scroll to pan, Ctrl/Cmd + scroll to zoom." : h.textContent; }, 4000);
}

/**
 * Row / Column / Grid for a box whose children are stacked in the flow, in one undo step: Tailwind classes (flex, flex-col,
 * grid grid-cols-N, gap-*) unless its display comes from CSS or it is a CSS-only element, then the same as inline CSS. The gap
 * keeps the children's current spacing (agent.js arrangeOf).
 */
function arrange(kind) {
    const a = selected && selected.arrange;
    if (!a) return;
    const gap = kind === "row" ? a.rowGap : a.colGap;
    const cols = Math.min(a.count, 3);
    const src = srcOf(selected, "display").source;
    if (src === "inline" || src === "design" || modeFor(selected) !== "tailwind") {
        return cmd({ cmd: "setStyleProps", path: selected.path, props: {
            display: kind === "grid" ? "grid" : "flex",
            "flex-direction": kind === "col" ? "column" : null,
            "grid-template-columns": kind === "grid" ? `repeat(${cols}, minmax(0, 1fr))` : null,
            gap: kind === "grid" ? `${a.colGap}px ${a.rowGap}px` : `${gap}px`, // row-gap column-gap
        } });
    }
    let c = selected.classes;
    const set = (k, v) => { const next = setGroup(c, k, v, ""); if (next !== null) c = next; };
    set("display", kind === "grid" ? "grid" : "flex");
    set("flexDir", kind === "col" ? "flex-col" : "");
    set("gridCols", kind === "grid" ? String(cols) : "");
    // a grid's columns get the spacing as gap-x; down the columns the children's own margins still space them (gap-y)
    if (kind === "grid") { set("gap", ""); set("gapX", a.rowGap ? fromPx("gapX", a.rowGap) : ""); set("gapY", a.colGap ? fromPx("gapY", a.colGap) : ""); } else set("gap", gap ? fromPx("gap", gap) : "");
    setClassString(c);
}

function setDevice(w) {
    // a preset is a whole size: its width, with the height following the content (a hand-set height belongs to Custom)
    setFrameSize({ w, h: null });
    if (mode === "preview") loadFrame();
}

const setClassString = (next) => { selected.classes = next; cmd({ cmd: "setClasses", path: selected.path, value: next }); };

insp.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-closepanel]")) return setPanel(false);
    const pw = t.closest("[data-pgw]");
    if (pw) return setDevice(Number(pw.dataset.pgw));
    const pa = t.closest("[data-pgact]");
    if (pa) return pa.dataset.pgact === "fit" ? (viewTouched = true, fitTo([curKey])) : pa.dataset.pgact === "draft" ? draftPage(pa) : $("detailsBtn").click();
    const arr = t.closest("[data-arrange]");
    if (arr && selected) return arrange(arr.dataset.arrange);
    const rst = t.closest("[data-propreset]");
    if (rst && selected) return setProp(rst.dataset.propreset, "");
    const pseg = t.closest("[data-propseg]");
    if (pseg && selected) return setProp(pseg.dataset.propseg, pseg.dataset.v);
    const tab = t.closest("[data-tab]");
    if (tab) { ui.tab = tab.dataset.tab; return renderInspector(); }
    const sec = t.closest("[data-sec]");
    if (sec) {
        const id = sec.dataset.sec;
        // data-open is what is shown (a section can open by itself), so a click always flips what you see
        if (sec.dataset.open === "true" || (sec.dataset.open === undefined && ui.open.has(id))) { ui.open.delete(id); ui.closed.add(id); } else { ui.open.add(id); ui.closed.delete(id); }
        return renderInspector();
    }
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
    if (d.dataset.do === "flexnone") return sizeItMyself();
    if (d.dataset.do === "autolayout") return send({ cmd: "autoLayout" });
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
    if (t.dataset.pg) {
        const k = t.dataset.pg, v = t.value.trim();
        if (k === "name") { const prev = data.title; return v && v !== prev ? renameFrame(curKey, v, prev) : renderInspector(); }
        if (k === "h" && v === "") { const d = docs.get(curKey); const b = { ...(d.board || {}) }; delete b.h; d.board = { x: positions()[curKey].x, y: positions()[curKey].y, ...b }; queueBoardSave(curKey); layout(); return renderInspector(); }
        const n = Number(v);
        if (v === "" || !Number.isFinite(n)) return renderInspector();
        setPageBox({ [k]: k === "w" ? clampSize(n, 8000) : k === "h" ? clampSize(n, 20000) : Math.round(n) });
        return renderInspector();
    }
    if (!selected) return;
    if (t.dataset.tag !== undefined) return cmd({ cmd: "setTag", path: selected.path, tag: t.value });
    if (t.dataset.propcolor) { setProp(t.dataset.propcolor, t.value, undefined, liveKey(`p-${t.dataset.propcolor}`)); return pickerClosed(t); }
    if (t.dataset.prop) return setProp(t.dataset.prop, t.value);
    if (t.dataset.geom) {
        const n = Number(t.value);
        if (t.value.trim() === "" || !Number.isFinite(n)) return renderInspector();
        const prop = { w: "width", h: "height", x: "left", y: "top" }[t.dataset.geom];
        return prop ? setProp(prop, `${Math.round(prop === "width" || prop === "height" ? Math.max(1, n) : n)}px`) : cmd({ cmd: "setGeom", path: selected.path, [t.dataset.geom]: n });
    }
    if (t.matches("[data-g]")) return applyValue(t.dataset.g, t.value.trim());
    if (t.dataset.cname !== undefined) return applyColor(t.dataset.cname, t.value.trim());
    if (t.dataset.cop !== undefined) {
        const name = val(selected, t.dataset.cop).replace(/\/\d+$/, "");
        return name ? applyColor(t.dataset.cop, name, t.value.trim()) : renderInspector();
    }
    if (t.dataset.ccustom !== undefined) { applyColor(t.dataset.ccustom, t.value, undefined, liveKey(`c-${t.dataset.ccustom}`)); return pickerClosed(t); }
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
    if (t.dataset.propcolor) return setProp(t.dataset.propcolor, t.value, undefined, liveKey(`p-${t.dataset.propcolor}`));
    if (t.dataset.ccustom !== undefined) return applyColor(t.dataset.ccustom, t.value, undefined, liveKey(`c-${t.dataset.ccustom}`));
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
    $("canvasHint").textContent = mode === "edit" ? "Click to select. Double-click text to edit it. Alt-drag to place freely. Scroll to pan, Ctrl/Cmd + scroll to zoom." : "Preview: running with its JavaScript. Press play again to go back to editing.";
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
    const body = { htmlCode: assembleDoc(d.parsed, d.markup) };
    if (d.isNew) {
        const res = await fetch("/api/components", {
            method: "POST", headers: JSON_HEADERS,
            body: JSON.stringify({
                ...body, title: m.title || "Untitled page", category: m.category || DEFAULT_CATEGORY, description: m.description || "A page on the canvas.",
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

// The save button carries the save status itself ("Save", "Saving…", "Saved", "Retry"); the full message is its tooltip.
const SAVE_LABELS = [[/^saving/i, "Saving…"], [/failed/i, "Retry"], [/^saved/i, "Saved"]];
function syncSaveButton() {
    const text = $("saveState").textContent.trim();
    const hit = SAVE_LABELS.find(([re]) => re.test(text));
    $("saveBtn").textContent = hit ? hit[1] : "Save";
    $("saveBtn").title = text || "Save (Ctrl/Cmd+S)";
}
new MutationObserver(syncSaveButton).observe($("saveState"), { childList: true, characterData: true, subtree: true });
$("detailsBtn").addEventListener("click", () => $("designsMenu").classList.add("hidden"));

// ── Keyboard ─────────────────────────────────────────────────────────────────
const TOOL_KEYS = { v: "move", h: "hand", f: "frame", r: "rect", o: "ellipse", l: "line", t: "text", i: "image", b: "button" };

function handleKey({ key, meta, shift }) {
    if (meta && key === "z") return step(shift ? 1 : -1);
    if (meta && key === "y") return step(1);
    if (meta && key === "s") return save();
    if (key === "!") { viewTouched = true; return fitTo([...docs.keys()]); }
    if (key === "@") { viewTouched = true; return fitTo([curKey]); }
    if (!meta && key === "l" && shift) return setTool("arrow");
    if (!meta && TOOL_KEYS[key]) return setTool(TOOL_KEYS[key]);
    if (!selected) return;
    if (meta && key === "d") return send({ cmd: "duplicateSel" });
    if (meta && key === "g") return send({ cmd: shift ? "ungroup" : "group" });
    if (!meta && shift && key === "a") return send({ cmd: "autoLayout" });
    if (selected.tag === "body") return;
    if (key === "delete" || key === "backspace") return send({ cmd: "deleteSel" });
}
/** Ctrl/Cmd + = / - zoom the plane around the middle of the canvas, Ctrl/Cmd + 0 back to 100% (the browser's own zoom is off). */
function keyZoom(key) {
    const factor = key === "=" || key === "+" ? 1.25 : key === "-" || key === "_" ? 0.8 : key === "0" ? 1 / view.z : 0;
    if (!factor) return false;
    const [W, H] = canvasSize();
    viewTouched = true;
    zoomAt(factor, W / 2, H / 2);
    return true;
}
document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && keyZoom(e.key)) return e.preventDefault();
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    const meta = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (e.code === "Space") { e.preventDefault(); setSpace(true); return; }
    if (e.shiftKey && (e.key === "!" || e.key === "@")) { e.preventDefault(); handleKey({ key: e.key, meta: false, shift: true }); return; }
    if (["delete", "backspace"].includes(key) || (meta && ["z", "y", "d", "s", "g"].includes(key)) || (!meta && !e.altKey && TOOL_KEYS[key]) || (!meta && e.shiftKey && key === "a")) {
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
    line: '<path stroke-linecap="round" d="M5 19 19 5"/>',
    arrow: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M9 6h9v9"/>',
    text: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 6V4h14v2M12 4v16m-3 0h6"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 16l-5-5-8 8"/>',
    button: '<rect x="3" y="8" width="18" height="8" rx="4"/><path stroke-linecap="round" d="M9 12h6"/>',
};
const TOOLS = [["move", "Move", "V"], ["hand", "Hand (or hold Space)", "H"], ["frame", "Frame", "F"], ["shape"], ["text", "Text", "T"]]; // Image and Button live in the + (insert a block) menu; their I and B keys still draw them
// Rectangle, Oval, Arrow and Line share one button: it draws the shape you used last, the chevron picks another
const SHAPES = [["rect", "Rectangle", "R"], ["ellipse", "Oval", "O"], ["arrow", "Arrow", "⇧L"], ["line", "Line", "L"]];
let shape = "rect";
let tool = "move";
let spaceDown = false;

const toolIcon = (id) => `<svg class="h-[18px] w-[18px]" fill="${id === "move" ? "currentColor" : "none"}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${ICONS[id]}</svg>`;
const CHEVRON = '<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
function renderTools() {
    const menu = $("shapeMenu");
    const open = Boolean(menu) && !menu.classList.contains("hidden");
    const sh = SHAPES.find(([id]) => id === shape);
    $("toolbar").innerHTML = TOOLS.map(([id, label, key], i) => {
        const sep = i === 2 ? '<span class="mx-1 h-5 w-px bg-neutral-200"></span>' : "";
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
        const on = b.dataset.tool === tool;
        b.classList.toggle("bg-[#111]", on);
        b.classList.toggle("text-white", on);
        b.classList.toggle("text-neutral-600", !on);
    });
}
$("toolbar").addEventListener("click", (e) => {
    if (e.target.closest("#shapeMore")) { $("shapeMenu").classList.toggle("hidden"); return; }
    const pick = e.target.closest("[data-shape]");
    if (pick) { $("shapeMenu").classList.add("hidden"); setTool(pick.dataset.shape); return; }
    const b = e.target.closest("[data-tool]");
    if (b) setTool(b.dataset.tool);
});
document.addEventListener("pointerdown", (e) => { const m = $("shapeMenu"); if (m && !m.classList.contains("hidden") && !e.target.closest("#shapeMenu, #shapeMore")) m.classList.add("hidden"); }, true);

renderTools();

function setTool(t, fromAgent) {
    tool = t;
    if (SHAPES.some(([id]) => id === t) && shape !== t) { shape = t; renderTools(); } else paintTools();
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

// ── The selected element, highlighted in the code ───────────────────────────
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
/** Where the element at `path` (element indices from the body down) sits in the markup text: its whole source, and just its opening tag. */
function elementRange(markup, path) {
    const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    const key = path.join(".");
    const root = { kids: 0, path: [] }, stack = [];
    let m;
    while ((m = re.exec(markup))) {
        if (m[0].startsWith("<!--")) continue;
        const tag = m[2].toLowerCase();
        const end = m.index + m[0].length;
        if (m[1]) {
            const i = stack.map((n) => n.tag).lastIndexOf(tag);
            if (i < 0) continue;
            const node = stack[i];
            stack.length = i;
            if (node.path.join(".") === key) return { start: node.start, openEnd: node.openEnd, end };
            continue;
        }
        const parent = stack[stack.length - 1] || root;
        const node = { tag, start: m.index, openEnd: end, kids: 0, path: [...parent.path, parent.kids++] };
        const lone = VOID_TAGS.has(tag) || m[3].trim().endsWith("/");
        if (lone) { if (node.path.join(".") === key) return { start: node.start, openEnd: end, end }; continue; }
        if (["script", "style", "textarea", "title"].includes(tag)) { const close = markup.toLowerCase().indexOf(`</${tag}`, end); if (close >= 0) re.lastIndex = close; }
        stack.push(node);
    }
    return null;
}
const codeHl = $("codeHl");
const escHtml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Paints the selected element's source behind the code and, when the selection just changed, scrolls to it. */
function updateCodeHighlight(reveal) {
    if (!codeOpen()) return;
    const text = codeText.value;
    const base = model.markup ? text.indexOf(model.markup) : -1;
    const r = selected && selected.path && selected.path.length && base >= 0 ? elementRange(model.markup, selected.path) : null;
    if (!r) { codeHl.innerHTML = escHtml(text) + "\n"; return; }
    const s = base + r.start, o = base + r.openEnd, e = base + r.end;
    codeHl.innerHTML = `${escHtml(text.slice(0, s))}<mark>${`<mark class="tag">${escHtml(text.slice(s, o))}</mark>`}${escHtml(text.slice(o, e))}</mark>${escHtml(text.slice(e))}\n`;
    codeHl.scrollTop = codeText.scrollTop;
    if (reveal) revealInCode(text, s);
}
codeText.addEventListener("scroll", () => { codeHl.scrollTop = codeText.scrollTop; });

function syncCode() {
    if (!codeOpen()) return;
    const next = model.markup.trim() ? assemble() : "";
    const prev = codeText.value;
    if (prev === next) return updateCodeHighlight(false);
    const left = codeText.scrollLeft, top = codeText.scrollTop;
    codeText.value = next;
    codeText.scrollLeft = left;
    codeText.scrollTop = top;
    // show what changed: the first place the new code differs from the old
    let i = 0;
    while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
    if (prev) revealInCode(next, i);
    updateCodeHighlight(false);
}
function setCodePanel(open) {
    $("codePanel").classList.toggle("hidden", !open);
    $("codePanel").classList.toggle("flex", open);
    $("codeBtn").classList.toggle("on", open);
    if (open) { syncCode(); updateCodeHighlight(true); codeText.focus(); }
    layout();
}
$("codeBtn").addEventListener("click", () => setCodePanel(!codeOpen()));
$("codeClose").addEventListener("click", () => setCodePanel(false));
let codeTimer = null;
codeText.addEventListener("input", () => {
    updateCodeHighlight(false);
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

// ── An empty page: draft it with AI (the Page panel's Generate) ──────────────
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

async function draftPage(btn) {
    const input = $("pageAi"), note = $("pageAiNote");
    const prompt = input.value.trim();
    const say = (msg, bad) => { note.textContent = msg; note.className = `text-[11px] ${bad ? "text-red-700" : "text-neutral-500"}`; };
    if (!prompt) return say("Describe what you want first.", true);
    btn.disabled = true;
    say("Drafting...");
    try {
        const html = await streamAI({ prompt, useLibrary: true });
        if (!html.startsWith("<")) throw new Error("The AI didn't return HTML. Try rephrasing.");
        parsed = parseComponentSource(html);
        commit(parsed.markup);
        loadFrame();
        if (!data.title) data.title = prompt.slice(0, 60);
        updateChrome();
        renderInspector();
    } catch (err) {
        say(err.message, true);
        btn.disabled = false;
    }
}

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
            res = await fetch("/api/components", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fields, htmlCode: assemble() }),
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
        if (en.ghost && !switching) { en.ghost.remove(); en.ghost = null; } // while switching it stays until the live frame is ready
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
        en.label.innerHTML = `${esc(title || "Untitled page")}<span>${state}</span>${docDirty(d) ? '<i class="dirty-dot" title="Unsaved changes"></i>' : ""}`;
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
        const title = (active ? data.title : d.meta.title) || "Untitled page";
        return `<div class="layer-row cursor-pointer gap-1 px-1 ${active ? "is-selected" : ""}" style="padding-left:${depth * 14 + 6}px" data-design="${d.key}">
            <span class="shrink-0 font-mono text-[10px] ${active ? "" : "text-neutral-500"}">${d.kind === "section" ? "sec" : "page"}</span>
            <span class="truncate">${esc(title)}</span>${docDirty(d) ? '<i class="dirty-dot"></i>' : ""}${active ? PAGE_EDIT : ""}</div>`;
    };
    renderPagesList();
    $("designsCount").textContent = String(list.length);
    $("designsName").textContent = (data.project && data.project.name) || data.title || "Untitled page";
    placePills();
    $("designs").innerHTML = pages.map((p) => row(p, 0) + list.filter((s) => s.kind === "section" && s.parent === p.key).map((s) => row(s, 1)).join("")).join("");
}
$("designs").addEventListener("click", (e) => {
    if (e.target.closest("[data-pedit]")) { $("detailsBtn").click(); return; }
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
    mountGhost(key); // snapshots are made as pages scroll into view: one opened from the Pages list may not have one yet
    curKey = key;
    frameSel = null;
    // Switching pages never shows one page's design in another's place: the live frame stays over the page being left until its
    // snapshot has painted, then loads the new design out of sight while the new page shows its own snapshot; once the new
    // design reports ready, the frame moves over and the snapshot goes (see the "ready" message).
    const token = ++switchToken;
    switching = true;
    handingOver = true;
    setRole(key);
    setRole(oldKey);
    mountGhost(oldKey, true);
    window.history.replaceState({}, "", next.isNew ? "/design/new" : `/design/${next.meta.id}`);
    let started = false;
    const start = () => {
        if (started || token !== switchToken) return;
        started = true;
        handingOver = false;
        frame.style.visibility = "hidden";
        loadFrame();
    };
    const left = wraps.get(oldKey);
    if (left && left.ghost) left.ghost.addEventListener("load", () => setTimeout(start, 60), { once: true }); // a moment to paint
    setTimeout(start, 700); // a snapshot that is slow to load doesn't hold the switch up
    renderLayers();
    updateChrome();
    layout();
}
let switching = false, switchToken = 0, frameAt = null; // frameAt: the page the live frame sits over
let handingOver = false; // the old design is still in the frame, waiting for its snapshot: what it reports isn't the new page's

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
    const switched = g.key !== curKey;
    if (switched) activate(g.key);
    if (g.label || switched) selectFrame();
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
    updateCodeHighlight(false);
    send({ cmd: "deselect" });
    renderInspector();
    renderLayers();
    renderFloat();
}
function selectFrame() {
    selected = null;
    updateCodeHighlight(false);
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
        meta: { id: null, title: "Untitled page", version: 0, category: data.category || DEFAULT_CATEGORY, description: "A page on the canvas.", tags: [], isPublished: false, project },
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
let ftPop = null; // which of the bar's panels is open: border, radius or spacing
let ftSides = {}; // per group: true when its fields are shown one per side (your choice; unset means automatic)
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
    return { kind: text ? "text" : "shape", sel: selected, editing, fmt: editing ? editingInfo.fmt : null, menu: ftMenu, pop: ftPop, sides: ftSides };
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
    ftb.classList.toggle("popdown", top < 270); // a panel opens upward, unless the bar is too close to the top of the canvas
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
    if (frameSel !== curKey || mode !== "edit" || !p) { el.innerHTML = ""; linesFrame = ""; paintLines(); return; }
    const z = view.z;
    const box = `left:${Math.round((view.x + p.x * z) * 100) / 100}px;top:${Math.round((view.y + p.y * z) * 100) / 100}px;width:${Math.round(widthOf(d) * z * 100) / 100}px;height:${Math.round(heightOfDoc(d) * z * 100) / 100}px;`;
    const fx = view.x + p.x * z, fy = view.y + p.y * z;
    const outline = `<svg class="sout"><rect x="${fx - 0.75}" y="${fy - 0.75}" width="${widthOf(d) * z + 1.5}" height="${heightOfDoc(d) * z + 1.5}" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`;
    linesFrame = outline;
    paintLines();
    el.innerHTML = `<div class="fbox" style="${box}">` + FRAME_HANDLES.map(([n, css]) => `<div class="fh" data-fh="${n}" style="${css}"></div>`).join("") + FRAME_CORNERS.map(([n, css]) => `<div class="fh fc" data-fh="${n}" style="${css}transform:translate(-50%,-50%);"></div>`).join("") + "</div>";
}

/** The selection box and its handles, above the frame (see selection-overlay.js). */
let selData = null;
// the outlines of the selection and of the selected frame share one layer that inverts what is under it; handles and labels sit above it
let linesSel = "", linesFrame = "";
const paintLines = () => { $("lines").innerHTML = linesSel + linesFrame; };
function renderSel() {
    const el = $("sel");
    const p = positions()[curKey];
    if (mode !== "edit" || frameSel === curKey || !selData || !p) { el.innerHTML = ""; $("slbl").innerHTML = ""; linesSel = ""; paintLines(); return; }
    const parts = selectionHtml(selData, { zoom: view.z, ox: view.x + p.x * view.z, oy: view.y + p.y * view.z });
    linesSel = parts.lines;
    paintLines();
    el.innerHTML = parts.html;
    $("slbl").innerHTML = parts.label; // the size label keeps its own colours, so it sits outside the inverting layers
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
    if (b && FLOAT_ACTIONS[b.dataset.ft] && selected) FLOAT_ACTIONS[b.dataset.ft](b.dataset.arg, b);
});

const SIDES4 = ["top", "right", "bottom", "left"];
const CORNER = { tl: "top-left", tr: "top-right", bl: "bottom-left", br: "bottom-right" };
const SIDE_KEY = { top: "T", right: "R", bottom: "B", left: "L" };
const CORNER_KEY = { tl: "radiusTL", tr: "radiusTR", bl: "radiusBL", br: "radiusBR" };
const allSides = (f) => SIDES4.map(f);
/** A value typed into one of the bar's panels (a border width, a corner, a padding or margin side), written where that value lives (setProps). */
function applyPanel(key, raw) {
    const colors = allSides((d) => `border-${d}-color`);
    if (key === "border-color-hex") { const h = raw.trim().replace(/^#?/, "#"); return /^#[0-9a-f]{6}$/i.test(h) ? setProps(colors, h, "borderColor") : renderFloat(true); }
    if (key === "border-color") return setProps(colors, raw, "borderColor");
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) return renderFloat(true);
    const v = Math.round(n * 10) / 10; // margins may be negative
    const nn = Math.max(0, v); // everything else may not
    const c = selected.computed || {};
    const borderless = SIDES4.every((d) => !parseFloat(c[`border-${d}-width`]));
    // a border width on a box with no border style shows nothing: give it a solid one first (its own undo step)
    const one = `border-${Date.now()}`; // the style and the width below share it: one undo step
    const solid = () => { if (borderless && n > 0) setProps(allSides((d) => `border-${d}-style`), "solid", "borderStyle", [], undefined, one); };
    if (key === "bw-all") { solid(); return setProps(allSides((d) => `border-${d}-width`), nn, "borderWidth", ["borderT", "borderR", "borderB", "borderL"], undefined, one); }
    if (key.startsWith("bw-")) { solid(); const d = key.slice(3); return setProps([`border-${d}-width`], nn, `border${SIDE_KEY[d]}`, [], undefined, one); }
    if (key === "r-all") return FLOAT_ACTIONS.radius(nn);
    if (key.startsWith("r-")) return setProps([`border-${CORNER[key.slice(2)]}-radius`], nn, CORNER_KEY[key.slice(2)]);
    const [kind, side] = key.split("-"); // padding-h, margin-top ...
    const k = kind === "padding" ? "p" : "m";
    const val = kind === "padding" ? nn : v;
    if (side === "h") return setProps([`${kind}-left`, `${kind}-right`], val, `${k}x`, [`${k}l`, `${k}r`]);
    if (side === "v") return setProps([`${kind}-top`, `${kind}-bottom`], val, `${k}y`, [`${k}t`, `${k}b`]);
    return setProps([`${kind}-${side}`], val, `${k}${side[0]}`);
}
const FLOAT_ACTIONS = {
    bold() {
        if (editingInfo && editingInfo.on) return send({ cmd: "exec", name: "bold" });
        const on = parseInt(selected.computed["font-weight"], 10) >= 600;
        setProp("font-weight", on ? "400" : "700");
    },
    italic() {
        if (editingInfo && editingInfo.on) return send({ cmd: "exec", name: "italic" });
        const on = selected.computed["font-style"] === "italic";
        setProp("font-style", on ? "normal" : "italic");
    },
    underline() {
        if (editingInfo && editingInfo.on) return send({ cmd: "exec", name: "underline" });
        const on = /underline/.test(selected.computed["text-decoration-line"] || "");
        setProp("text-decoration-line", on ? "none" : "underline");
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
        setProp("text-align", next);
    },
    radius(n) {
        // every corner: one rounded-* class, or inline radius where a corner comes from CSS
        setProps(["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"], n, "radius", ["radiusTL", "radiusTR", "radiusBR", "radiusBL"]);
    },
    more() { ftMenu = !ftMenu; ftPop = null; renderFloat(true); },
    pop(key) { ftPop = ftPop === key ? null : key; ftMenu = false; renderFloat(true); },
    side(key, btn) { ftSides[key] = !btn.classList.contains("on"); renderFloat(true); },
    bstyle(kind) {
        const c = selected.computed || {};
        const none = ["top", "right", "bottom", "left"].every((d) => !parseFloat(c[`border-${d}-width`]));
        const one = `border-${Date.now()}`; // style and width: one undo step
        setProps(SIDES4.map((d) => `border-${d}-style`), kind, "borderStyle", [], undefined, one);
        if (kind !== "none" && none) setProps(SIDES4.map((d) => `border-${d}-width`), 1, "borderWidth", ["borderT", "borderR", "borderB", "borderL"], undefined, one); // a line style on a borderless box: make it visible
    },
    dup() { ftMenu = false; cmd({ cmd: "duplicate", path: selected.path }); },
    del() { ftMenu = false; cmd({ cmd: "remove", path: selected.path }); },
    up() { ftMenu = false; cmd({ cmd: "move", path: selected.path, dir: -1 }); },
    down() { ftMenu = false; cmd({ cmd: "move", path: selected.path, dir: 1 }); },
    free() { ftMenu = false; cmd({ cmd: "freePosition", path: selected.path, on: !selected.geom.abs }); },
    group() { ftMenu = false; send({ cmd: "group" }); },
    ungroup() { ftMenu = false; send({ cmd: "ungroup" }); },
    props() { ftMenu = false; setPanel(true); setPanelTab("props"); renderFloat(true); },
};

// pressing anywhere else in the editor (the canvas, a layer) also lets a focused bar field commit first
document.addEventListener("pointerdown", (e) => {
    const a = document.activeElement;
    if (a && ftb.contains(a) && a.matches("input, select") && !e.target.closest("#ftb")) a.blur();
}, true);
// The border colour follows the picker while it is dragged, not only once it closes. Everything from opening the picker to
// closing it is one undo step, however slowly it is dragged: a "live:" key, merged without the time limit (commit).
// ── Our colour picker instead of the browser's ───────────────────────────────
// The browser's picker opens on top of the element being coloured; ours opens beside the selection. A press on any colour
// field in the bar or the panel opens it and feeds that field as if it were being dragged: "input" while picking, "change" once
// it closes, so live updates and one undo step per pick work exactly as before. The field is found again each time, since the
// bar or panel may have been rebuilt meanwhile.
const COLOR_FIELDS = ["ftcol", "ftp", "propcolor", "ccustom"];
function fieldSelector(t) {
    const k = COLOR_FIELDS.find((d) => t.dataset[d] !== undefined);
    return k ? `${ftb.contains(t) ? "#ftb" : "#inspector"} input[type="color"][data-${k}="${CSS.escape(t.dataset[k])}"]` : null;
}
/** The selected element on screen: the outline drawn around it. */
function selectionRect() {
    const rs = [...$("sel").children].map((n) => n.getBoundingClientRect()).filter((r) => r.width > 8 && r.height > 8);
    if (!rs.length) return null;
    return { left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)), right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) };
}
document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest('input[type="color"]');
    if (!t || !(ftb.contains(t) || insp.contains(t)) || !selected) return;
    const sel = fieldSelector(t);
    if (!sel) return;
    e.preventDefault(); // not the browser's picker
    const opener = t.closest("label") || t;
    if (colorPickerOpener() === opener) return closeColorPicker(); // the same swatch again: done
    const feed = (type, hex) => { const f = document.querySelector(sel); if (f) { f.value = hex; f.dispatchEvent(new Event(type, { bubbles: true })); } };
    // from the Properties panel: just left of the panel, level with the swatch; from the floating bar: beside the selection
    const fromPanel = insp.contains(t);
    const p = insp.getBoundingClientRect(), o = opener.getBoundingClientRect();
    const near = fromPanel ? { left: p.left, right: p.right, top: o.top, bottom: o.bottom } : selectionRect();
    const bounds = fromPanel ? { left: 0, top: 0, right: innerWidth, bottom: innerHeight } : canvas.getBoundingClientRect();
    openColorPicker({ value: t.value, near, bounds, opener, onInput: (hex) => feed("input", hex), onClose: (hex) => feed("change", hex) });
}, true);

const FT_COLOR = { text: "color", fill: "background-color" };
ftb.addEventListener("input", (e) => {
    const t = e.target;
    if (!selected) return;
    const label = t.closest(".swatch");
    if (t.dataset.ftcol && FT_COLOR[t.dataset.ftcol]) {
        if (label) { label.style.background = t.value; label.style.backgroundImage = "none"; }
        return setProp(FT_COLOR[t.dataset.ftcol], t.value, undefined, liveKey(`ft-${t.dataset.ftcol}`));
    }
    if (t.dataset.ftp !== "border-color") return;
    const hex = ftb.querySelector('[data-ftp="border-color-hex"]');
    if (label) label.style.background = t.value;
    if (hex) hex.value = t.value.toUpperCase();
    setProps(SIDES4.map((d) => `border-${d}-color`), t.value, "borderColor", [], undefined, liveKey("ft-border"));
});
ftb.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.ftin === "fw") return setFrameSize({ w: Number(t.value) || curWidth() });
    if (t.dataset.ftin === "fh") return setFrameSize({ h: t.value.trim() === "" ? null : Number(t.value) || null });
    if (!selected) return;
    if (t.dataset.ftsel === "family") return setProp("font-family", t.value, FAMILY_STACKS[t.value]);
    if (t.dataset.ftin === "size") { const n = Number(t.value); return n > 0 ? setProp("font-size", `${n}px`) : renderFloat(); }
    if (t.dataset.ftp === "border-color") { // the picker closed: its last value joins the drag's undo step, and the next pick starts a new one
        if (selected) setProps(SIDES4.map((d) => `border-${d}-color`), t.value, "borderColor", [], undefined, liveKey("ft-border"));
        return pickerClosed(t);
    }
    if (t.dataset.ftp) return applyPanel(t.dataset.ftp, t.value);
    if (t.dataset.ftin === "radius") return FLOAT_ACTIONS.radius(Math.max(0, Number(t.value) || 0));
    if (t.dataset.ftcol && FT_COLOR[t.dataset.ftcol]) { setProp(FT_COLOR[t.dataset.ftcol], t.value, undefined, liveKey(`ft-${t.dataset.ftcol}`)); return pickerClosed(t); }
});

document.addEventListener("click", (e) => {
    $("designsMenu").classList.add("hidden");
    if ((ftMenu || ftPop) && !e.target.closest("#ftb")) { ftMenu = false; ftPop = null; renderFloat(true); }
});
const toggleDesignsMenu = (e) => { e.stopPropagation(); $("addMenu").classList.add("hidden"); $("designsMenu").classList.toggle("hidden"); };
$("designsBtn").addEventListener("click", toggleDesignsMenu);
$("navMoreBtn").addEventListener("click", toggleDesignsMenu);
$("designsMenu").addEventListener("click", (e) => e.stopPropagation());

// Layers live in the left panel, opened from the toggle in the tools.
ui.closeInTabs = true; // the right panel has no header of its own: its close button lives in the Design / Classes / AI row
let leftOpen = false;
function setLeft(open) {
    leftOpen = open;
    $("leftPanel").classList.toggle("hidden", !open);
    $("leftPanel").classList.toggle("flex", open);
    $("leftBtn").classList.toggle("on", open);
    // Back, the toggle and the page menu move into the panel's header while it is open, and back to the floating tools when it closes
    if (open) $("leftHead").appendChild($("navGroup")); else $("pillL").insertBefore($("navGroup"), $("navSep"));
    $("navSep").classList.toggle("hidden", open);
    renderPagesList();
    renderLayers();
    pref("wc:left", open ? "1" : "0");
    if (open) revealLayer(true);
    scheduleLayout();
}
$("leftBtn").addEventListener("click", () => setLeft(!leftOpen));

// side panel: closed until you want every property or the layer tree
let panelTab = "props";
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* storage is optional */ } return null; };
function setPanelTab(t) {
    panelTab = t;
    document.querySelectorAll("#panelTabs .ptab").forEach((b) => b.classList.toggle("is-on", b.dataset.ptab === t));
    $("inspector").classList.toggle("hidden", t !== "props");
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
setLeft(pref("wc:left") === "1");
setTool("move", true); // start on the arrow, highlighted in the toolbar
buildWraps();
updateChrome();
renderInspector();
layout();
loadFrame();
