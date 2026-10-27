import { parseComponentSource, buildPreviewDocument } from "./playground/component-source.js";
import { computeLayout as layoutItems, PAGE_H, SEC_H } from "@windcraft/core/board-layout.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const data = JSON.parse($("projectData").textContent);
const project = data.project;
let items = data.items;

// ── Model ────────────────────────────────────────────────────────────────────
const FRAME_W = 1280, SNAP = 8;
const MIN_Z = 0.03, MAX_Z = 2;

const heights = {};
const pos = {};
const view = { x: 40, y: 60, z: 0.2 };
let selectedId = null;
const wraps = new Map();

const byId = (id) => items.find((i) => i.id === id);
const pages = () => items.filter((i) => i.kind !== "section" || !items.some((p) => p.id === i.parent));
const sectionsOf = (id) => items.filter((i) => i.kind === "section" && i.parent === id);
const widthOf = (it) => (it.board && it.board.w) || FRAME_W;
const heightOf = (it) => (it.board && it.board.h) || heights[it.id] || (it.kind === "section" ? SEC_H : PAGE_H);

function computeLayout() {
    Object.assign(pos, layoutItems(items, { frameW: FRAME_W, heightOf, widthOf }));
}

// ── View (pan and zoom) ──────────────────────────────────────────────────────
const board = $("board");
const world = $("world");

function applyView() {
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
    world.style.setProperty("--iz", String(1 / view.z));
    $("zoomLabel").textContent = `${Math.round(view.z * 100)}%`;
}

function zoomAt(factor, cx, cy) {
    const z = Math.min(MAX_Z, Math.max(MIN_Z, view.z * factor));
    const k = z / view.z;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.z = z;
    applyView();
}

function fitTo(list, maxZ = 1) {
    if (!list.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach((it) => {
        const p = pos[it.id];
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y - 30);
        x1 = Math.max(x1, p.x + widthOf(it)); y1 = Math.max(y1, p.y + heightOf(it));
    });
    const W = board.clientWidth, H = board.clientHeight;
    const z = Math.min(maxZ, Math.max(MIN_Z, Math.min((W - 120) / (x1 - x0), (H - 120) / (y1 - y0))));
    view.z = z;
    view.x = (W - (x1 - x0) * z) / 2 - x0 * z;
    view.y = (H - (y1 - y0) * z) / 2 - y0 * z;
    applyView();
}

const fitAll = () => fitTo(items);
const focusItem = (id) => { const it = byId(id); if (it) fitTo([it], 0.8); };

board.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = board.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    else { view.x -= e.deltaX; view.y -= e.deltaY; applyView(); }
}, { passive: false });

const center = () => [board.clientWidth / 2, board.clientHeight / 2];
$("zoomIn").addEventListener("click", () => zoomAt(1.25, ...center()));
$("zoomOut").addEventListener("click", () => zoomAt(0.8, ...center()));
$("zoomLabel").addEventListener("click", () => zoomAt(1 / view.z, ...center()));
$("fitBtn").addEventListener("click", fitAll);

// ── Frames ───────────────────────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (!e.isIntersecting) return;
        observer.unobserve(e.target);
        mount(e.target.dataset.id);
    });
}, { root: board, rootMargin: "600px" });

function mount(id) {
    const entry = wraps.get(id);
    const it = byId(id);
    if (!entry || !it || entry.iframe) return;
    const f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-scripts");
    f.setAttribute("tabindex", "-1");
    f.title = it.title;
    f.style.cssText = `position:absolute;left:0;top:0;width:${widthOf(it)}px;height:100%;border:0;pointer-events:none;background:#fff;`;
    f.srcdoc = buildPreviewDocument(parseComponentSource(it.htmlCode), { width: widthOf(it) });
    entry.frame.appendChild(f);
    entry.iframe = f;
}

window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "preview-height") return;
    for (const [id, entry] of wraps) {
        if (entry.iframe && entry.iframe.contentWindow === e.source) {
            heights[id] = Math.max(120, Math.min(6000, e.data.height));
            scheduleLayout();
            return;
        }
    }
});

let layoutQueued = false;
function scheduleLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => { layoutQueued = false; placeFrames(); });
}

function placeFrames() {
    computeLayout();
    items.forEach((it) => {
        const entry = wraps.get(it.id);
        if (!entry) return;
        const p = pos[it.id];
        Object.assign(entry.wrap.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${widthOf(it)}px`, height: `${heightOf(it)}px` });
    });
}

function buildFrames() {
    observer.disconnect();
    wraps.clear();
    world.innerHTML = "";
    items.forEach((it) => {
        const wrap = document.createElement("div");
        wrap.className = `fwrap${it.id === selectedId ? " sel" : ""}`;
        wrap.dataset.id = it.id;
        wrap.innerHTML = `<div class="flabel">${it.group ? `<i class="fgroup">${esc(it.group)} / </i>` : ""}${esc(it.title)}<span>${it.kind === "section" ? "section" : `v${it.version}`}</span></div><div class="frame"></div>`;
        world.appendChild(wrap);
        wraps.set(it.id, { wrap, frame: wrap.querySelector(".frame"), iframe: null });
        observer.observe(wrap);
    });
    placeFrames();
}

// ── Selecting, panning and dragging frames ───────────────────────────────────
let spaceDown = false;
document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { spaceDown = true; board.style.cursor = "grab"; e.preventDefault(); }
    if (e.shiftKey && e.key === "!") fitAll();
    if (e.shiftKey && e.key === "@" && selectedId) focusItem(selectedId);
});
document.addEventListener("keyup", (e) => { if (e.code === "Space") spaceDown = false; });

let gesture = null;
board.addEventListener("pointerdown", (e) => {
    const wrap = e.target.closest(".fwrap");
    board.setPointerCapture(e.pointerId);
    if (wrap && e.button === 0 && !spaceDown) {
        const id = wrap.dataset.id;
        gesture = { type: "frame", id, wrap, sx: e.clientX, sy: e.clientY, ox: pos[id].x, oy: pos[id].y, moved: false };
    } else {
        gesture = { type: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, onFrame: Boolean(wrap) };
        board.style.cursor = "grabbing";
    }
});

board.addEventListener("pointermove", (e) => {
    if (!gesture) return;
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
    gesture.moved = true;
    if (gesture.type === "pan") {
        view.x = gesture.vx + dx;
        view.y = gesture.vy + dy;
        applyView();
        return;
    }
    gesture.wrap.classList.add("dragging");
    const p = { x: Math.round((gesture.ox + dx / view.z) / SNAP) * SNAP, y: Math.round((gesture.oy + dy / view.z) / SNAP) * SNAP };
    pos[gesture.id] = p;
    gesture.wrap.style.left = `${p.x}px`;
    gesture.wrap.style.top = `${p.y}px`;
});

board.addEventListener("pointerup", () => {
    const g = gesture;
    gesture = null;
    board.style.cursor = spaceDown ? "grab" : "grab";
    if (!g) return;
    if (g.type === "frame") {
        g.wrap.classList.remove("dragging");
        if (g.moved) { byId(g.id).board = { ...byId(g.id).board, ...pos[g.id] }; queueSave(g.id); }
        else select(g.id);
    } else if (!g.moved && !g.onFrame) {
        select(null);
    }
});

board.addEventListener("dblclick", (e) => {
    // pointer capture retargets the event to the board, so find the frame under the cursor
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const wrap = under && under.closest(".fwrap");
    if (wrap) location.href = `/design/${wrap.dataset.id}`;
});

// positions are saved a moment after the last drag
const pendingSave = new Map();
let saveTimer = null;
function queueSave(id) {
    pendingSave.set(id, byId(id).board);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 500);
}
async function flushSave() {
    if (!pendingSave.size) return;
    const positions = [...pendingSave].map(([id, p]) => ({ id, x: p ? p.x : null, y: p ? p.y : null }));
    pendingSave.clear();
    try {
        await fetch(`/api/projects/${project.id}/layout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positions }) });
    } catch { /* positions stay on screen; the next drag saves again */ }
}
window.addEventListener("beforeunload", () => {
    if (pendingSave.size) navigator.sendBeacon && navigator.sendBeacon(`/api/projects/${project.id}/layout`, new Blob([JSON.stringify({ positions: [...pendingSave].map(([id, p]) => ({ id, x: p ? p.x : null, y: p ? p.y : null })) })], { type: "application/json" }));
});

$("tidyBtn").addEventListener("click", () => {
    if (!confirm("Reset every frame to the automatic arrangement?")) return;
    items.forEach((it) => { it.board = null; pendingSave.set(it.id, null); });
    flushSave();
    placeFrames();
    fitAll();
});

// ── Header, outline, details ─────────────────────────────────────────────────
function renderHeader() {
    $("projName").textContent = project.name;
    document.title = `${project.name} | Windcraft`;
    const pg = pages();
    const sec = items.filter((i) => i.kind === "section").length;
    $("projStats").textContent = `${pg.length} page${pg.length === 1 ? "" : "s"} · ${sec} section${sec === 1 ? "" : "s"}`;
    $("newPageBtn").href = `/design/new?project=${project.id}`;
    const ab = $("activeBtn");
    ab.textContent = project.active ? "Active project ✓" : "Set as active";
    ab.className = project.active ? "h-7 rounded-md border border-[#0d99ff] bg-[#e5f4ff] px-2.5 text-xs font-medium text-[#0b6fc2]" : "h-7 rounded-md border border-neutral-200 px-2.5 text-xs hover:bg-neutral-50";
    $("boardEmpty").classList.toggle("hidden", items.length > 0);
    $("boardEmpty").classList.toggle("flex", items.length === 0);
}

function renderOutline() {
    let prev = ""; // a heading where the group changes ("Public site", then "Customer area")
    $("outline").innerHTML = pages().map((p) => {
        const g = p.group || "";
        const heading = g !== prev && (g || prev) ? `<div class="group-head">${esc(g || "No group")}</div>` : "";
        prev = g;
        const row = (it, depth) => `<div class="layer-row cursor-pointer gap-1 px-1 ${it.id === selectedId ? "is-selected" : ""}" style="padding-left:${depth * 14 + 6}px" data-pick="${it.id}"><span class="shrink-0 font-mono text-[10px] text-neutral-500">${it.kind === "section" ? "sec" : "page"}</span><span class="truncate">${esc(it.title)}</span></div>`;
        return heading + row(p, 0) + sectionsOf(p.id).map((s) => row(s, 1)).join("");
    }).join("") || '<div class="p-3 text-neutral-500">No pages yet.</div>';
}

function renderDetails() {
    const el = $("details");
    const it = selectedId && byId(selectedId);
    if (!it) {
        el.innerHTML = `<p class="font-semibold text-neutral-900">${esc(project.name)}</p>
            <label class="mt-3 block text-neutral-500">Description</label>
            <textarea id="descInput" rows="2" class="fi area" placeholder="What is this project?">${esc(project.description)}</textarea>
            <label class="mt-3 block text-neutral-500">Brief for Claude and designers</label>
            <textarea id="briefInput" rows="7" class="fi area" placeholder="Brand, audience, tone, colors, navigation, rules. Claude reads this automatically when this is the active project.">${esc(project.brief || "")}</textarea>
            <button type="button" id="saveDesc" class="mt-2 h-7 w-full rounded-md border border-neutral-200 hover:bg-neutral-50">Save</button>
            <p class="mt-4 text-neutral-500">Click a frame to see its details. Drag frames to arrange them. Double-click a frame to open it in the editor.</p>`;
        return;
    }
    const secs = sectionsOf(it.id);
    el.innerHTML = `<div class="flex items-center gap-2"><span class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">${it.kind}</span><span class="font-mono text-[10px] text-neutral-400">v${it.version}</span></div>
        <p class="mt-2 text-sm font-semibold text-neutral-900">${esc(it.title)}</p>
        <p class="mt-1 text-neutral-500">${esc(it.description || "")}</p>
        ${it.tags.length ? `<div class="mt-2 flex flex-wrap gap-1">${it.tags.map((t) => `<span class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">${esc(t)}</span>`).join("")}</div>` : ""}
        ${secs.length ? `<p class="mb-1 mt-4 font-semibold text-neutral-700">Sections</p>${secs.map((s) => `<button type="button" data-pick="${s.id}" class="block w-full truncate rounded px-1.5 py-1 text-left hover:bg-neutral-100">${esc(s.title)}</button>`).join("")}` : ""}
        <button type="button" id="focusBtn" class="mt-4 h-8 w-full rounded-md border border-neutral-200 text-xs hover:bg-neutral-50">Zoom to this frame (Shift+2)</button>
        <a href="/design/${it.id}" class="mt-2 flex h-8 items-center justify-center rounded-md bg-[#0d99ff] text-xs font-semibold text-white hover:bg-[#0a84e0]">Open in editor</a>
        <button type="button" id="removeBtn" class="mt-2 h-8 w-full rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50">Remove from project</button>`;
}

function select(id) {
    selectedId = id;
    wraps.forEach((entry, key) => entry.wrap.classList.toggle("sel", key === id));
    renderOutline();
    renderDetails();
}

document.addEventListener("click", async (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) { select(pick.dataset.pick); focusItem(pick.dataset.pick); return; }
    if (e.target.id === "focusBtn" && selectedId) return focusItem(selectedId);
    if (e.target.id === "removeBtn" && selectedId) {
        const it = byId(selectedId);
        if (!confirm(`Remove "${it.title}" from this project? It stays in your library.`)) return;
        const res = await fetch(`/api/components/${it.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: "" }) });
        if (!(await res.json()).success) return alert("Could not remove it");
        const ids = new Set([it.id, ...sectionsOf(it.id).map((s) => s.id)]);
        items = items.filter((i) => !ids.has(i.id));
        selectedId = null;
        renderHeader(); buildFrames(); renderOutline(); renderDetails();
    }
    if (e.target.id === "saveDesc") {
        const description = $("descInput").value;
        const brief = $("briefInput").value;
        const res = await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description, brief }) });
        if ((await res.json()).success) { project.description = description; project.brief = brief; e.target.textContent = "Saved"; setTimeout(() => (e.target.textContent = "Save"), 1200); }
    }
});

$("activeBtn").addEventListener("click", async () => {
    const res = await fetch(`/api/projects/${project.id}/activate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !project.active }) });
    const json = await res.json();
    if (json.success) { project.active = json.active; renderHeader(); }
});

$("renameBtn").addEventListener("click", async () => {
    const name = prompt("Project name", project.name);
    if (!name || !name.trim() || name.trim() === project.name) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if ((await res.json()).success) { project.name = name.trim(); renderHeader(); renderDetails(); }
});
$("deleteProjBtn").addEventListener("click", async () => {
    if (!confirm(`Delete the project "${project.name}"? Its pages and sections stay in your library.`)) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if ((await res.json()).success) location.href = "/projects";
});

renderHeader();
buildFrames();
renderOutline();
renderDetails();
applyView();
fitAll();
