import { parseComponentSource, buildPreviewDocument } from "./playground/component-source.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const data = JSON.parse($("projectData").textContent);
const project = data.project;
let items = data.items;

const PAGE_W = 1280, PAGE_H = 900, SEC_H = 560;
const ZOOMS = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1];
let zoomIdx = 3;
let selectedId = null;

const byId = (id) => items.find((i) => i.id === id);
const pages = () => items.filter((i) => i.kind !== "section" || !items.some((p) => p.id === i.parent));
const sectionsOf = (id) => items.filter((i) => i.kind === "section" && i.parent === id);

// ── Header ───────────────────────────────────────────────────────────────────
function renderHeader() {
    $("projName").textContent = project.name;
    document.title = `${project.name} | Windcraft`;
    const pg = pages();
    const sec = items.filter((i) => i.kind === "section").length;
    $("projStats").textContent = `${pg.length} page${pg.length === 1 ? "" : "s"} · ${sec} section${sec === 1 ? "" : "s"}`;
    $("newPageBtn").href = `/design/new?project=${project.id}`;
    $("zoomLabel").textContent = `${Math.round(ZOOMS[zoomIdx] * 100)}%`;
    $("boardEmpty").classList.toggle("hidden", items.length > 0);
}

// ── Frames (lazy live previews) ──────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (!e.isIntersecting) return;
        observer.unobserve(e.target);
        mount(e.target);
    });
}, { root: $("board"), rootMargin: "300px" });

function mount(frame) {
    const item = byId(frame.dataset.id);
    if (!item || frame.querySelector("iframe")) return;
    const f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-scripts");
    f.setAttribute("tabindex", "-1");
    f.title = item.title;
    f.style.cssText = `position:absolute;left:0;top:0;width:${PAGE_W}px;height:${frame.dataset.kind === "section" ? SEC_H : PAGE_H}px;border:0;transform-origin:0 0;pointer-events:none;background:#fff;`;
    f.srcdoc = buildPreviewDocument(parseComponentSource(item.htmlCode), { width: PAGE_W });
    frame.appendChild(f);
    sizeFrame(frame);
}

function sizeFrame(frame) {
    const col = frame.closest("[data-col]");
    const colW = PAGE_W * ZOOMS[zoomIdx];
    const isSection = frame.dataset.kind === "section";
    const w = isSection ? (colW - 12) / 2 : colW;
    const scale = w / PAGE_W;
    const h = (isSection ? SEC_H : PAGE_H) * scale;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    const f = frame.querySelector("iframe");
    if (f) f.style.transform = `scale(${scale})`;
    if (col) col.style.width = `${colW}px`;
}

const frameHtml = (item, kind) => `<div><div class="mb-1 flex items-center justify-between gap-2 text-[11px] text-neutral-600"><span class="truncate font-medium">${esc(item.title)}</span><span class="shrink-0 text-neutral-400">${kind === "section" ? "" : `v${item.version}`}</span></div><div class="frame${item.id === selectedId ? " sel" : ""}" data-id="${item.id}" data-kind="${kind}" title="Double-click to open in the editor"></div></div>`;

function renderBoard() {
    $("columns").innerHTML = pages().map((p) => {
        const secs = sectionsOf(p.id);
        return `<div data-col="${p.id}" class="shrink-0">${frameHtml(p, p.kind)}${secs.length ? `<div class="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Sections ${secs.length}</div><div class="grid grid-cols-2 gap-3">${secs.map((s) => frameHtml(s, "section")).join("")}</div>` : ""}</div>`;
    }).join("");
    document.querySelectorAll("#columns .frame").forEach((f) => { sizeFrame(f); observer.observe(f); });
}

function applyZoom() {
    document.querySelectorAll("#columns .frame").forEach(sizeFrame);
    $("zoomLabel").textContent = `${Math.round(ZOOMS[zoomIdx] * 100)}%`;
}

// ── Outline and details ──────────────────────────────────────────────────────
function renderOutline() {
    $("outline").innerHTML = pages().map((p) => {
        const row = (it, depth) => `<div class="layer-row cursor-pointer gap-1 px-1 ${it.id === selectedId ? "is-selected" : ""}" style="padding-left:${depth * 14 + 6}px" data-pick="${it.id}"><span class="shrink-0 font-mono text-[10px] text-neutral-500">${it.kind === "section" ? "sec" : "page"}</span><span class="truncate">${esc(it.title)}</span></div>`;
        return row(p, 0) + sectionsOf(p.id).map((s) => row(s, 1)).join("");
    }).join("") || '<div class="p-3 text-neutral-500">No pages yet.</div>';
}

function renderDetails() {
    const el = $("details");
    const it = selectedId && byId(selectedId);
    if (!it) {
        el.innerHTML = `<p class="font-semibold text-neutral-900">${esc(project.name)}</p>
            <label class="mt-3 block text-neutral-500">Description</label>
            <textarea id="descInput" rows="3" class="fi area" placeholder="What is this project?">${esc(project.description)}</textarea>
            <button type="button" id="saveDesc" class="mt-2 h-7 w-full rounded-md border border-neutral-200 hover:bg-neutral-50">Save description</button>
            <p class="mt-4 text-neutral-500">Click a frame to see its details. Double-click a frame to open it in the editor.</p>`;
        return;
    }
    const secs = sectionsOf(it.id);
    el.innerHTML = `<div class="flex items-center gap-2"><span class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">${it.kind}</span><span class="font-mono text-[10px] text-neutral-400">v${it.version}</span></div>
        <p class="mt-2 text-sm font-semibold text-neutral-900">${esc(it.title)}</p>
        <p class="mt-1 text-neutral-500">${esc(it.description || "")}</p>
        ${it.tags.length ? `<div class="mt-2 flex flex-wrap gap-1">${it.tags.map((t) => `<span class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">${esc(t)}</span>`).join("")}</div>` : ""}
        ${secs.length ? `<p class="mb-1 mt-4 font-semibold text-neutral-700">Sections</p>${secs.map((s) => `<button type="button" data-pick="${s.id}" class="block w-full truncate rounded px-1.5 py-1 text-left hover:bg-neutral-100">${esc(s.title)}</button>`).join("")}` : ""}
        <a href="/design/${it.id}" class="mt-4 flex h-8 items-center justify-center rounded-md bg-[#0d99ff] text-xs font-semibold text-white hover:bg-[#0a84e0]">Open in editor</a>
        <button type="button" id="removeBtn" class="mt-2 h-8 w-full rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50">Remove from project</button>`;
}

function select(id) {
    selectedId = id;
    document.querySelectorAll("#columns .frame").forEach((f) => f.classList.toggle("sel", f.dataset.id === id));
    renderOutline();
    renderDetails();
}

// ── Events ───────────────────────────────────────────────────────────────────
$("columns").addEventListener("click", (e) => { const f = e.target.closest(".frame"); select(f ? f.dataset.id : null); });
$("columns").addEventListener("dblclick", (e) => { const f = e.target.closest(".frame"); if (f) location.href = `/design/${f.dataset.id}`; });
$("board").addEventListener("click", (e) => { if (e.target === $("board") || e.target === $("columns")) select(null); });

document.addEventListener("click", async (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) {
        select(pick.dataset.pick);
        const frame = document.querySelector(`#columns .frame[data-id="${pick.dataset.pick}"]`);
        if (frame) frame.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        return;
    }
    if (e.target.id === "removeBtn" && selectedId) {
        const it = byId(selectedId);
        if (!confirm(`Remove "${it.title}" from this project? It stays in your library.`)) return;
        const res = await fetch(`/api/components/${it.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: "" }) });
        if (!(await res.json()).success) return alert("Could not remove it");
        const ids = new Set([it.id, ...sectionsOf(it.id).map((s) => s.id)]);
        items = items.filter((i) => !ids.has(i.id));
        selectedId = null;
        renderHeader(); renderBoard(); renderOutline(); renderDetails();
    }
    if (e.target.id === "saveDesc") {
        const description = $("descInput").value;
        const res = await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description }) });
        if ((await res.json()).success) { project.description = description; e.target.textContent = "Saved"; setTimeout(() => (e.target.textContent = "Save description"), 1200); }
    }
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
$("zoomIn").addEventListener("click", () => { zoomIdx = Math.min(ZOOMS.length - 1, zoomIdx + 1); applyZoom(); });
$("zoomOut").addEventListener("click", () => { zoomIdx = Math.max(0, zoomIdx - 1); applyZoom(); });
$("board").addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomIdx = Math.min(ZOOMS.length - 1, Math.max(0, zoomIdx + (e.deltaY < 0 ? 1 : -1)));
    applyZoom();
}, { passive: false });

renderHeader();
renderBoard();
renderOutline();
renderDetails();
