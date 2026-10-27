import { $, S, collapsed, esc } from "./base.js";

// ── Layers ───────────────────────────────────────────────────────────────────
export const pathKey = (p) => (p || []).join(".");
// A small page icon: the Pages section and the page rows use it instead of repeating the word "page"
export const PAGE_ICON = '<svg class="shrink-0 text-neutral-500" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="3" y="2" width="10" height="12" rx="1.5"/></svg>';
// Figma-style chevron: points right when closed, down when open
const chevron = (open) => `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="${open ? "transform:rotate(90deg);" : ""}"><path d="M4.5 2.5 8 6 4.5 9.5"/></svg>`;

// the eye and the lock of a row: faint until the row is pointed at, solid while on (hidden or locked)
const EYE = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
const EYE_OFF = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l12 12M6.6 3.8A6 6 0 018 3.5c4 0 6.5 4.5 6.5 4.5a10 10 0 01-2 2.4M4.2 5.2A10 10 0 001.5 8S4 12.5 8 12.5a6 6 0 002.6-.6"/></svg>';
const LOCK = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>';
const UNLOCK = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 014.8-1"/></svg>';

function layerNode(n, depth) {
    const key = pathKey(n.path);
    const has = n.children.length > 0;
    const isCollapsed = collapsed.has(key);
    const isSel = S.selected && pathKey(S.selected.path) === key;
    const acts = n.tag === "body" ? "" : `<span class="layer-acts"><span data-eye="${key}" class="layer-act ${n.hidden ? "on" : ""}" title="${n.hidden ? "Show" : "Hide"} (Ctrl/Cmd+Shift+H)">${n.hidden ? EYE_OFF : EYE}</span><span data-lock="${key}" class="layer-act ${n.locked ? "on" : ""}" title="${n.locked ? "Unlock" : "Lock"} (Ctrl/Cmd+Shift+L)">${n.locked ? LOCK : UNLOCK}</span></span>`;
    const row = `<div class="layer-row cursor-pointer gap-1 px-1 ${isSel ? "is-selected" : ""} ${n.hidden ? "layer-hidden" : ""}" style="padding-left:${depth * 12 + 4}px" data-path="${key}" ${n.tag === "body" ? "" : 'draggable="true"'}>
        <span data-caret="${key}" class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200">${has ? chevron(!isCollapsed) : ""}</span>
        <span class="shrink-0 font-mono text-[11px] text-neutral-500">${n.tag}</span>
        <span class="truncate text-neutral-800">${esc(n.label)}</span>${acts}</div>`;
    return row + (has && !isCollapsed ? n.children.map((c) => layerNode(c, depth + 1)).join("") : "");
}

let revealedKey = null;
/** Scrolls the Layers panel to the selected row (opening its collapsed parents first). Only when the selection changed, so scrolling by hand isn't undone. */
export function revealLayer(force) {
    const key = S.selected ? pathKey(S.selected.path) : null;
    if (!key && key !== "") { revealedKey = null; return; }
    if (!force && key === revealedKey) return;
    if (!S.leftOpen) return;
    const pane = $("leftBody");
    const row = $("layers").querySelector(".layer-row.is-selected");
    if (!row) return;
    revealedKey = key;
    const pr = pane.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (rr.top < pr.top + 8 || rr.bottom > pr.bottom - 8) pane.scrollTop += (rr.top + rr.height / 2) - (pr.top + pr.height / 2);
}

let expandedFor = null;
export function renderLayers() {
    // a new selection must be visible in the tree: open every parent of the selected element (once per selection, so you can still collapse one afterwards)
    const selKey = S.selected ? pathKey(S.selected.path) : null;
    if (selKey !== expandedFor) {
        expandedFor = selKey;
        if (S.selected && S.selected.path && S.selected.path.length) {
            let opened = false;
            for (let i = 0; i < S.selected.path.length; i++) { if (collapsed.delete(pathKey(S.selected.path.slice(0, i)))) opened = true; }
            if (opened) revealedKey = null;
        }
    }
    // Pages are their own section above, so Layers is just the current page's element tree.
    $("layers").innerHTML = S.tree ? layerNode(S.tree, 0) : '<div class="px-2 py-2 text-[11px] text-neutral-500">Loading…</div>';
    revealLayer();
}

export const parsePath = (s) => (s === "" ? [] : s.split(".").map(Number));
