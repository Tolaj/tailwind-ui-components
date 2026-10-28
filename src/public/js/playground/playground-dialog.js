// The Add component dialog: the code on the left, Windcraft's design editor on the right (embedded: canvas and its tools only), and a
// details form that comes over the editor when the first save needs a name. The editor does the saving; this page answers its questions.
import { embedEditor } from "@windcraft/editor/index.js";
import { appHost } from "../app-host.js";
import { updateSourceBadge } from "./playground-badge.js";
import { setCode, codeHasFocus } from "./playground-code.js";

const $ = (id) => document.getElementById(id);
const TOOLS = ["move", "hand", "interact", "frame", "shape", "text", "add"];
let ed = null;
let resume = null; // details to start from when the dialog comes back from the full editor

// the dialog is not a page of its own: nothing here changes the address bar or the project board
const host = { ...appHost, showDesign() {}, openDesign() {}, saveLayout: async () => {}, saveLayoutOnExit() {} };

/** A title to start from: the first heading of the code. */
function guessTitle(html) {
    try {
        const h = new DOMParser().parseFromString(html, "text/html").querySelector("h1, h2, h3, title");
        return h ? h.textContent.trim().slice(0, 80) : "";
    } catch { return ""; }
}

/** A loading message over the editor's place until the editor has painted. */
function showEditorLoader() {
    const host_ = $("editorHost");
    const el = document.createElement("div");
    el.id = "editorLoader";
    el.setAttribute("role", "status");
    el.className = "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-100 text-[13px] text-neutral-500";
    el.innerHTML = '<span class="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800"></span><span>Opening the editor…</span>';
    host_.append(el);
    return el;
}

function openEditor() {
    if (ed) return;
    const loader = showEditorLoader();
    ed = embedEditor($("editorHost"), {
        host, data: { htmlCode: $("htmlEditor").value, ...(resume || {}) }, ui: { panels: false, nav: false, tools: TOOLS }, onDetails: showDetails,
    });
    // a change made on the canvas (drag, resize, text) writes the code; one typed in the box is not written back over it
    ed.onChange(({ html, source }) => {
        if (source !== "editor" || codeHasFocus()) return;
        setCode(html);
        updateSourceBadge(html);
    });
    ed.ready.then(() => loader.remove());
    resume = null;
}

function closeEditor() {
    if (ed) ed.destroy();
    ed = null;
    $("editorHost").innerHTML = "";
}

/** The code box changed: the editor shows it. */
export const pushCode = (value) => { if (ed) ed.setHtml(value); };

// ── Projects: every component belongs to one ────────────────────────────────
// One field: type to filter the user's projects; a name that matches none is created when the component is published.
let projects = null;
let activeRow = -1;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
async function loadProjects() {
    if (!projects) {
        try { projects = (await (await fetch("/api/projects")).json()).data || []; } catch { projects = []; }
    }
    return projects;
}
function projectRows() {
    const q = $("project").value.trim(), list = projects || [];
    const rows = list.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).map((p) => ({ name: p.name, label: esc(p.name), hint: p.active ? "active" : "" }));
    if (q && !list.some((p) => same(p.name, q))) rows.push({ name: q, label: `Create <b>“${esc(q)}”</b>`, hint: "new project" });
    return rows;
}
/** The list sits on the details overlay, under the field, so the form's own scrolling and edges never clip it. */
function placeList(ul) {
    const panel = $("detailsPanel"), box = $("project").getBoundingClientRect(), at = panel.getBoundingClientRect();
    if (ul.parentElement !== panel) panel.append(ul);
    Object.assign(ul.style, { left: `${box.left - at.left}px`, top: `${box.bottom - at.top + 4}px`, width: `${box.width}px` });
}
function renderProjects(open = true) {
    const ul = $("projectList"), rows = projectRows();
    activeRow = Math.min(activeRow, rows.length - 1);
    ul.innerHTML = rows.map((r, i) => `<li role="option" data-name="${esc(r.name)}" class="flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 ${i === activeRow ? "bg-neutral-100" : "hover:bg-neutral-100"}"><span class="truncate">${r.label}</span><span class="ml-3 shrink-0 text-xs text-neutral-400">${r.hint}</span></li>`).join("")
        || `<li class="px-2.5 py-1.5 text-neutral-400">Type a name to create a project</li>`;
    const show = open && (rows.length > 0 || !(projects || []).length);
    if (show) placeList(ul);
    if (activeRow < 0) ul.scrollTop = 0;
    ul.classList.toggle("hidden", !show);
    $("project").setAttribute("aria-expanded", String(show));
}
const pickProject = (name) => { $("project").value = name; activeRow = -1; renderProjects(false); };
{
    const input = $("project"), ul = $("projectList");
    input?.addEventListener("focus", async () => { await loadProjects(); renderProjects(); });
    input?.addEventListener("input", () => { activeRow = -1; renderProjects(); });
    input?.addEventListener("keydown", (e) => {
        const rows = projectRows();
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); activeRow = (activeRow + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % Math.max(rows.length, 1); renderProjects(); }
        else if (e.key === "Enter" && activeRow >= 0 && rows[activeRow]) { e.preventDefault(); pickProject(rows[activeRow].name); }
        else if (e.key === "Escape" && !ul.classList.contains("hidden")) { e.stopPropagation(); e.preventDefault(); renderProjects(false); }
    });
    ul?.addEventListener("mousedown", (e) => { // before the field loses focus
        const li = e.target.closest("[data-name]");
        if (!li) return;
        e.preventDefault();
        pickProject(li.dataset.name);
    });
    input?.addEventListener("blur", () => renderProjects(false));
    input?.closest(".overflow-y-auto")?.addEventListener("scroll", () => renderProjects(false), { passive: true });
}
/** Starts the field on the active project (else the latest). */
async function fillProjects(current) {
    const list = await loadProjects();
    const pick = list.find((p) => p.id === current) || list.find((p) => p.active) || list[0];
    $("project").value = pick ? pick.name : "";
    renderProjects(false);
}

// ── Details: asked for by the editor's first save ───────────────────────────
function showDetails(f) {
    const panel = $("detailsPanel");
    $("title").value = f.title || guessTitle($("htmlEditor").value);
    $("category").value = f.category || "";
    $("description").value = f.description || "";
    $("tags").value = f.tags || "";
    $("isPublished").value = String(f.isPublished !== false);
    $("useAsReference").checked = f.useAsReference !== false;
    $("detailsError").classList.add("hidden");
    fillProjects(f.project);
    panel.classList.remove("hidden");
    panel.classList.add("flex");
    $(f.title || guessTitle($("htmlEditor").value) ? "category" : "title").focus();
}
export const handleBack = () => {
    $("detailsPanel").classList.add("hidden");
    $("detailsPanel").classList.remove("flex");
};

export const handleSave = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!ed) return;
    if (!form.reportValidity()) return;
    const err = $("detailsError"), btn = $("submitBtn");
    btn.disabled = true;
    btn.textContent = "Publishing…";
    err.classList.add("hidden");
    try {
        const typed = $("project").value.trim();
        const found = (await loadProjects()).find((p) => same(p.name, typed));
        let project = found ? found.id : "";
        if (!found) {
            project = (await appHost.createProject(typed)).id;
            projects = null;
        }
        await ed.saveDetails({
            title: $("title").value.trim(), category: $("category").value, description: $("description").value.trim(),
            tags: $("tags").value, isPublished: $("isPublished").value, useAsReference: $("useAsReference").checked, project,
        });
        btn.textContent = "Published";
        window.location.reload();
    } catch (error) {
        err.textContent = error.message || "Failed to publish component";
        err.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Publish";
    }
};

// ── Opening and closing ─────────────────────────────────────────────────────
const dialog = $("dialog");
export const handleClose = () => {
    if (ed && ed.isDirty() && $("htmlEditor").value.trim() && !confirm("Close without saving this component?")) return;
    dialog.close();
};
dialog.addEventListener("cancel", (e) => {
    if (ed && ed.isDirty() && $("htmlEditor").value.trim() && !confirm("Close without saving this component?")) e.preventDefault();
});
dialog.addEventListener("close", () => {
    projects = null;
    closeEditor();
    handleBack();
    setCode("");
    $("componentForm").reset();
    updateSourceBadge("");
});
// the dialog is opened by the page's own buttons (command="show-modal"): the editor starts with it
new MutationObserver(() => { if (dialog.open) openEditor(); }).observe(dialog, { attributes: true, attributeFilter: ["open"] });
if (dialog.open) openEditor();

// ── The full editor: the code and details go with you, and Back (unsaved) brings them back here ────────────
export const openFullEditor = () => {
    const draft = {
        html: ed ? ed.getHtml() : $("htmlEditor").value, title: $("title").value, category: $("category").value,
        description: $("description").value, tags: $("tags").value, isPublished: $("isPublished").value, useAsReference: $("useAsReference").checked,
    };
    try {
        sessionStorage.setItem("wc:draft", JSON.stringify(draft));
        sessionStorage.setItem("wc:return", window.location.href);
    } catch { /* storage unavailable: the full editor opens empty */ }
    closeEditor(); // the work goes with us (it is in the draft): the editor's "Leave site?" question must not appear, so it is removed first
    window.location.href = "/design/new?draft=1";
};

// back from the full editor without saving: the dialog opens again with what was there
try {
    const back = JSON.parse(sessionStorage.getItem("wc:resume") || "null");
    sessionStorage.removeItem("wc:resume");
    if (back) {
        setCode(back.html || "");
        updateSourceBadge(back.html || "");
        resume = { title: back.title || "", category: back.category || "", description: back.description || "", tags: Array.isArray(back.tags) ? back.tags : String(back.tags || "").split(",").map((t) => t.trim()).filter(Boolean), useAsReference: back.useAsReference !== false, isPublished: back.isPublished !== false };
        dialog.showModal();
    }
} catch { /* nothing to resume */ }

// ── The split between the code and the design: drag it to give the design more room (the code never gets wider than it starts) ──────────────
{
    const form = $("componentForm"), pane = $("codePane");
    const MAX = 0.42, MIN_PX = 240, KEY = "wc:dialogSplit";
    const set = (frac) => { if (!form.offsetWidth) return; pane.style.width = `${Math.round(Math.max(MIN_PX / form.offsetWidth, Math.min(MAX, frac)) * 1000) / 10}%`; };
    if (form && pane) {
        const handle = document.createElement("div");
        handle.title = "Drag to give the design more room, double-click to reset";
        handle.style.cssText = "position:absolute;top:0;bottom:0;right:-4px;width:8px;z-index:20;cursor:col-resize;touch-action:none";
        const line = document.createElement("div");
        line.style.cssText = "position:absolute;top:0;bottom:0;left:3px;width:1px;background:#0090f1;opacity:0;transition:opacity .12s";
        handle.append(line);
        handle.addEventListener("mouseenter", () => { line.style.opacity = ".7"; });
        handle.addEventListener("mouseleave", () => { if (!drag) line.style.opacity = "0"; });
        pane.append(handle);
        const restore = () => { try { const f = Number(localStorage.getItem(KEY)); if (f) set(f); } catch { /* storage is optional */ } };
        new MutationObserver(() => { if (dialog.open) restore(); }).observe(dialog, { attributes: true, attributeFilter: ["open"] }); // the width is known once the dialog shows
        restore();
        let drag = null;
        handle.addEventListener("pointerdown", (e) => { e.preventDefault(); drag = { x: e.clientX, w: pane.offsetWidth }; handle.setPointerCapture(e.pointerId); document.body.style.cursor = "col-resize"; });
        handle.addEventListener("pointermove", (e) => { if (drag) set((drag.w + e.clientX - drag.x) / form.offsetWidth); });
        const end = (e) => {
            if (!drag) return;
            drag = null;
            line.style.opacity = "0";
            document.body.style.cursor = "";
            try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
            try { localStorage.setItem(KEY, String(pane.offsetWidth / form.offsetWidth)); } catch { /* storage is optional */ }
        };
        ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => handle.addEventListener(t, end));
        handle.addEventListener("dblclick", () => { pane.style.width = ""; try { localStorage.removeItem(KEY); } catch { /* storage is optional */ } });
    }
}
