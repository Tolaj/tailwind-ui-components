import { config } from "../config.js";
import { agentMain } from "../agent.js";
import { buildPreviewDocument, parseComponentSource, themeMarkup } from "../../playground/component-source.js";
import { panelStore } from "../panel-state.js";
import { $, S, data, esc, frame, isTailwindScript, model, send } from "./base.js";
import { renderFloat, renderSel } from "./frame-handles.js";
import { renderInspector } from "./inspector.js";
import { curWidth } from "./plane.js";
import { anyDirty, docs, refreshLabels, renderDesigns } from "./designs.js";
import { codeFocused, syncCode } from "./code-panel.js";

// ── Documents ────────────────────────────────────────────────────────────────
const scriptTag = (s) =>
    `<script${s.src ? ` src="${esc(s.src)}"` : ""}${s.type ? ` type="${esc(s.type)}"` : ""}${s.defer ? " defer" : ""}>${s.src ? "" : s.text.replace(/<\/script/gi, "<\\/script")}<\/script>`;
const styleTag = (s) => `<style${s.type ? ` type="${esc(s.type)}"` : ""}>${s.text.replace(/<\/style/gi, "<\\/style")}</style>`;

function editDocument() {
    const head = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">'];
    if (!S.parsed.hasTailwindScript) head.push('<script src="https://cdn.tailwindcss.com"><\/script>', themeMarkup());
    else head.push(...S.parsed.scripts.filter(isTailwindScript).map(scriptTag));
    // the design's own stylesheets are marked, so the panel can tell their rules from the ones Tailwind generates (agent.js sourcesOf)
    const mark = (tag) => tag.replace(/^<(style|link)\b/i, "<$1 data-wc-design");
    head.push(...S.parsed.links.map(mark), ...S.parsed.styles.map(styleTag).map(mark), "<style data-wc-editor>html,body{margin:0}</style>");
    const attrs = Object.entries(S.parsed.bodyAttrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
    return `<!DOCTYPE html><html><head>${head.join("\n")}</head><body${attrs}>${model.markup}<script data-wc-agent>window.__wcLoad=${S.loadSeq};(${agentMain.toString()})()<\/script></body></html>`;
}

/** Rebuilds the component source: original head assets and scripts around the edited markup. */
export function assembleDoc(p, markup) {
    const css = [...p.links, ...p.styles.map(styleTag)].join("\n");
    const js = p.scripts.map(scriptTag).join("\n");
    const bodyAttrs = Object.entries(p.bodyAttrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
    if (bodyAttrs) return `<!DOCTYPE html>\n<html>\n<head>\n${css}\n</head>\n<body${bodyAttrs}>\n${markup}\n${js}\n</body>\n</html>\n`;
    return [css, markup, js].filter(Boolean).join("\n") + "\n";
}
export const assemble = () => assembleDoc(S.parsed, model.markup);

export function loadFrame() {
    S.loadSeq++;
    S.selected = null;
    S.editingInfo = null;
    S.gestureOn = false;
    S.ftMenu = false;
    S.ftPop = null;
    S.ftSides = {};
    S.selData = null;
    renderSel();
    renderInspector();
    renderFloat();
    frame.srcdoc = S.mode === "edit" ? editDocument() : previewDocument();
}

// The live page (Interact) has none of the editor's own script, so Ctrl/Cmd + scroll or a pinch over it zoomed the whole browser window.
// This small script keeps those two for the canvas: it stops the browser's zoom and hands the gesture to the editor, which zooms the
// design plane as it does everywhere else. Plain scrolling stays the page's own.
// Interact's pointer: the same arrow-with-a-click as the Interact button in the toolbar; the page's own cursors (links, fields) still win.
const INTERACT_CURSOR = 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cg%20stroke%3D%22%23fff%22%20stroke-width%3D%223.6%22%3E%3Cpath%20d%3D%22M9%209l11%204.5-4.6%201.4L14%2019.5z%22%2F%3E%3Cpath%20d%3D%22M6.5%203.5%207%206M3.5%206.5%206%207M4.5%2010.5l2-1.5M10.5%204.5%209%206.5%22%2F%3E%3C%2Fg%3E%3Cg%20stroke%3D%22%23111%22%20stroke-width%3D%221.6%22%3E%3Cpath%20d%3D%22M9%209l11%204.5-4.6%201.4L14%2019.5z%22%2F%3E%3Cpath%20d%3D%22M6.5%203.5%207%206M3.5%206.5%206%207M4.5%2010.5l2-1.5M10.5%204.5%209%206.5%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") 9 9, default';
const previewCursorStyle = `<style data-wc-cursor>html{cursor:${INTERACT_CURSOR}}</style>`;
const previewWheelScript = (load) => `<script data-wc-wheel>(function(){var L=${load};addEventListener("wheel",function(e){if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();parent.postMessage({type:"wheel",x:e.clientX,y:e.clientY,dx:e.deltaX,dy:e.deltaY,zoom:true,load:L},"*")},{passive:false});["gesturestart","gesturechange","gestureend"].forEach(function(t){addEventListener(t,function(e){e.preventDefault()})})})()<\/script>`;
function previewDocument() {
    const html = buildPreviewDocument(parseComponentSource(assemble()), { width: curWidth() });
    const withCursor = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, previewCursorStyle + "</head>") : previewCursorStyle + html;
    const at = withCursor.lastIndexOf("</body>");
    return at < 0 ? withCursor + previewWheelScript(S.loadSeq) : withCursor.slice(0, at) + previewWheelScript(S.loadSeq) + withCursor.slice(at);
}

// ── History, dirty state, layout ─────────────────────────────────────────────
/** Does this design use Tailwind utility classes? Decides which style panel opens by default. */
function refreshDocFlag() {
    const tokens = [];
    String(model.markup).replace(/\bclass\s*=\s*"([^"]*)"|\bclass\s*=\s*'([^']*)'/g, (_, a, b) => { tokens.push(...(a ?? b).split(/\s+/).filter(Boolean)); return ""; });
    const hit = tokens.some((t) => /^(?:flex|grid|block|hidden|inline-flex|rounded)$/.test(t) || /^-?(?:p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml|w|h|gap)-(?:\d|px|auto|full)/.test(t) || /^(?:text|bg|border)-(?:xs|sm|base|lg|xl|\d?xl|[a-z]+-\d{2,3}|black|white)$/.test(t));
    panelStore.set({ docTailwind: Boolean(S.parsed.hasTailwindScript || hit) });
}

export function updateChrome() {
    refreshDocFlag();
    $("undoBtn").disabled = S.hIndex <= 0;
    $("redoBtn").disabled = S.hIndex >= S.history.length - 1;
    const dirty = anyDirty();
    $("saveBtn").disabled = !dirty;
    $("saveState").textContent = dirty ? (S.isNew && docs.size === 1 ? "Not saved yet" : "Unsaved changes") : S.isNew ? "" : "Saved";
    $("versionBadge").textContent = S.isNew ? "new" : `v${data.version}`;
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
    if (config.hooks.chrome) config.hooks.chrome();
}

export function commit(html, key) {
    model.markup = html;
    const now = Date.now();
    if (html === S.history[S.hIndex]) { S.lastKey = key || ""; S.lastTime = now; return updateChrome(); } // nothing changed: no undo step
    // the same key merges into the last step: within 800 ms, or for a "live:" key (a picker being dragged) for as long as it lasts
    if (key && key === S.lastKey && (key.startsWith("live:") || now - S.lastTime < 800) && S.hIndex === S.history.length - 1) {
        S.history[S.hIndex] = html;
    } else {
        S.history = S.history.slice(0, S.hIndex + 1);
        S.history.push(html);
        S.hIndex = S.history.length - 1;
    }
    S.lastKey = key || "";
    S.lastTime = now;
    updateChrome();
}

export function step(delta) {
    const next = S.hIndex + delta;
    if (next < 0 || next >= S.history.length) return;
    S.hIndex = next;
    model.markup = S.history[S.hIndex];
    send({ cmd: "load", html: model.markup, selectPath: S.selected ? S.selected.path : null });
    updateChrome();
}
