import { $, S, collapsed, data, esc, send } from "./base.js";
import { fitTo, pageGroupOf, view } from "./plane.js";
import { activate, docDirty, docs, renameFrame, selectFrame } from "./designs.js";
import { PAGE_ICON, parsePath, renderLayers } from "./layers.js";
import { cmd } from "./frame-messages.js";

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

export const PAGE_EDIT = '<button type="button" data-pedit class="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-white/70" title="Page details: name, category, tags, visibility"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>';
/** A heading in a list of pages where the group changes ("Public site", then "Customer area"). `state.prev` is the group of the page before. */
export const headingState = { prev: "" };
export function groupHeading(d) {
    const g = pageGroupOf(d.key);
    const html = g !== headingState.prev && (g || headingState.prev) ? `<div class="group-head">${esc(g || "No group")}</div>` : "";
    headingState.prev = g;
    return html;
}
export function renderPagesList() {
    const el = $("pagesList");
    if (!S.leftOpen) return;
    renderDetailsBlock();
    if (el.querySelector(".frename")) return; // not while a name is being typed
    const list = [...docs.values()];
    const tops = list.filter((d) => d.kind !== "section" || !list.some((p) => p.key === d.parent));
    headingState.prev = "";
    const row = (d, depth) => {
        const active = d.key === S.curKey;
        const title = (active ? data.title : d.meta.title) || "Untitled page";
        return `<div class="layer-row cursor-pointer gap-1.5 px-1 ${active ? "is-selected" : ""}" style="padding-left:${depth * 12 + 8}px" data-page="${d.key}" title="Double-click to rename">${d.kind === "section" ? '<span class="shrink-0 font-mono text-[11px] text-neutral-500">section</span>' : PAGE_ICON}<span class="truncate">${esc(title)}</span>${docDirty(d) ? '<i class="dirty-dot" title="Unsaved changes"></i>' : ""}${active ? PAGE_EDIT : ""}</div>`;
    };
    el.innerHTML = tops.map((d) => groupHeading(d) + row(d, 0) + list.filter((c) => c.kind === "section" && c.parent === d.key).map((c) => row(c, 1)).join("")).join("");
}

let dragPath = null;
const clearDrop = () => document.querySelectorAll(".drop-before,.drop-after,.drop-inside").forEach((r) => r.classList.remove("drop-before", "drop-after", "drop-inside"));
const dropZone = (e, row) => { const r = row.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height; return y < 0.28 ? "before" : y > 0.72 ? "after" : "inside"; };
// an element can't be dropped on itself or inside what it contains
const badDrop = (target) => dragPath === target || (dragPath !== "" && target.startsWith(`${dragPath}.`));

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {
    $("pagesList").addEventListener("click", (e) => {
        if (!e.target.closest("[data-pedit]")) return;
        e.stopImmediatePropagation();
        $("detailsBtn").click();
    }, true);
    $("leftProject").addEventListener("click", (e) => { if (!data.project) { e.preventDefault(); $("detailsBtn").click(); } });
    $("pagesList").addEventListener("click", (e) => {
        const row = e.target.closest("[data-page]");
        if (!row || e.target.closest(".frename")) return;
        S.viewTouched = true;
        activate(row.dataset.page);
        fitTo([row.dataset.page], Math.max(view.z, 0.5));
    });
    $("pagesList").addEventListener("dblclick", (e) => {
        const row = e.target.closest("[data-page]");
        if (!row || e.target.closest(".frename, [data-pedit]")) return;
        const key = row.dataset.page;
        const d = docs.get(key);
        const current = (key === S.curKey ? data.title : d.meta.title) || "";
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
            if (fr.dataset.frame !== S.curKey) activate(fr.dataset.frame);
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
}
