import { buildPreviewDocument, parseComponentSource } from "../../playground/component-source.js";
import { $, S, data, model } from "./base.js";
import { docs } from "./designs.js";
import { heightOfDoc, widthOf } from "./plane.js";

// ── Preview: the pages of the project shown one at a time, full screen, as a visitor would see them ─────────────────────────
// A toolbar on top (like the editor's own): close, previous / next page, Restart, and how the page is scaled to the screen.
// (The Interact tool is different: it runs the one page you are editing, on the canvas.)

const SCALES = [
    ["actual", "Actual size (100%)", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9.5 10.5 11 9.5v5"/><path d="M13.5 11.2v.1M13.5 13.1v.1"/>'],
    ["responsive", "Responsive", "Z", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M8.5 10.5 7 12l1.5 1.5M15.5 10.5 17 12l-1.5 1.5"/>'],
    ["fitw", "Fit width", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7.5 12h9M10 9.5 7.5 12l2.5 2.5M14 9.5l2.5 2.5-2.5 2.5"/>'],
    ["fitwh", "Fit width and height", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 8v8M8 12h8M10.5 9.5 12 8l1.5 1.5M10.5 14.5 12 16l1.5-1.5M9.5 10.5 8 12l1.5 1.5M14.5 10.5 16 12l-1.5 1.5"/>'],
    ["fill", "Fill screen", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 9.5V8h1.5M14.5 8H16v1.5M16 14.5V16h-1.5M9.5 16H8v-1.5"/>'],
];
const ICON = {
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    restart: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    hide: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><path d="M3 15h18M3 19h12"/>',
};
const svg = (paths, size = 18, w = 1.6) => `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

let box = null, pageFrame = null, list = [], at = 0, start = 0;
let scaleMode = "actual", uiHidden = false;

/** The pages to show: whole pages in the order of the Pages list (parts of a page are left out); the components when there are no pages. */
function pagesToShow() {
    const all = [...docs.values()];
    const tops = all.filter((d) => d.kind !== "section" || !all.some((p) => p.key === d.parent));
    const pages = tops.filter((d) => d.kind === "page");
    return pages.length ? pages : tops;
}

const titleOf = (d) => (d.key === S.curKey ? data.title : d.meta.title) || "Untitled page";
const sourceOf = (d) => {
    if (d.key === S.curKey) return { ...S.parsed, markup: model.markup }; // what is on the canvas now, saved or not
    return d.loaded ? { ...d.parsed, markup: d.markup } : parseComponentSource(d.source);
};

// A page of its own has none of the editor's script: keys and Ctrl/Cmd + scroll (the browser's zoom) are handed to this window.
const pageScript = (id) => `<script data-wc-present>(function(){var I=${JSON.stringify(id)};function name(e){var m=e.metaKey||e.ctrlKey;if(m&&e.key==="\\\\")return"hideui";if(m||e.altKey)return"";if(e.key==="ArrowLeft"||e.key==="ArrowRight"||e.key==="Escape")return e.key;if(e.key==="r"||e.key==="R")return"restart";if(e.key==="z"||e.key==="Z")return"responsive";return""}addEventListener("keydown",function(e){var k=name(e);if(!k)return;var t=e.target;if(k!=="Escape"&&k!=="hideui"&&t&&(/^(input|textarea|select)$/i.test(t.tagName)||t.isContentEditable))return;e.preventDefault();parent.postMessage({wcPresent:I,key:k},"*")},true);addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey)e.preventDefault()},{passive:false});["gesturestart","gesturechange","gestureend"].forEach(function(t){addEventListener(t,function(e){e.preventDefault()})})})()<\/script>`;

/** Sizes the page for the screen. Figma's scaling options: the page keeps its own width (Actual size), takes the window's width (Responsive), or is scaled. */
function layout() {
    if (!box) return;
    const d = list[at];
    const stage = $("pvStage"), wrap = $("pvWrap");
    const availW = stage.clientWidth, availH = stage.clientHeight;
    const w = widthOf(d), h = heightOfDoc(d) || availH;
    let k = 1, fw = w, fh = availH;
    if (scaleMode === "responsive") { fw = availW; }
    else if (scaleMode === "fitw") { k = availW / w; fh = availH / k; }
    else if (scaleMode === "fitwh") { k = Math.min(availW / w, availH / h); fh = h; }
    else if (scaleMode === "fill") { k = Math.max(availW / w, availH / h); fh = h; }
    const W = fw * k, H = fh * k;
    pageFrame.style.cssText = `position:absolute;left:0;top:0;width:${fw}px;height:${fh}px;transform:scale(${k});transform-origin:0 0;border:0;background:#fff;`;
    wrap.style.cssText = `position:relative;flex:none;width:${W}px;height:${H}px;margin:${Math.max(0, (availH - H) / 2)}px 0 0 ${W <= availW || scaleMode === "fill" ? (availW - W) / 2 : 0}px;box-shadow:0 12px 48px rgba(0,0,0,.45);border-radius:4px;overflow:hidden;`;
    stage.style.overflowX = scaleMode === "actual" ? "auto" : "hidden";
    $("pvScale").firstElementChild.textContent = `${Math.round(k * 100)}%`;
}

function show(i) {
    at = (i + list.length) % list.length;
    const d = list[at];
    const html = buildPreviewDocument(sourceOf(d), { width: scaleMode === "responsive" ? $("pvStage").clientWidth : widthOf(d) });
    const cut = html.lastIndexOf("</body>");
    const id = `p${Date.now()}${at}`;
    box.dataset.id = id;
    pageFrame.srcdoc = cut < 0 ? html + pageScript(id) : html.slice(0, cut) + pageScript(id) + html.slice(cut);
    $("pvName").textContent = titleOf(d);
    $("pvCount").textContent = list.length > 1 ? `${at + 1} / ${list.length}` : "";
    $("pvPrev").disabled = $("pvNext").disabled = list.length < 2;
    layout();
}

function setScale(mode) {
    scaleMode = mode;
    closeMenu();
    show(at); // Responsive changes the page's own width, so it is built again
}

function setUi(hidden) {
    uiHidden = hidden;
    closeMenu();
    const bar = $("pvBar");
    bar.style.opacity = hidden ? "0" : "1";
    bar.style.pointerEvents = hidden ? "none" : "auto";
    $("pvTop").style.height = hidden ? "0px" : "64px";
    layout();
}

// ── The scaling menu ─────────────────────────────────────────────────────────
let menu = null;
function closeMenu() { if (menu) { menu.remove(); menu = null; } }
function openMenu() {
    closeMenu();
    const r = $("pvScale").getBoundingClientRect();
    const item = (icon, label, hint, on, act) => `<button type="button" role="menuitem" data-act="${act}" style="display:flex;align-items:center;gap:10px;width:100%;height:34px;padding:0 10px;border-radius:8px;font-size:13px;color:#171717;text-align:left;" class="pvItem"><span style="width:16px;display:inline-flex;justify-content:center;color:#171717">${on ? svg(ICON.check, 14, 2) : ""}</span><span style="display:inline-flex;color:#525252">${icon}</span><span style="flex:1">${label}</span><span style="font-size:12px;color:#737373">${hint}</span></button>`;
    const head = (t) => `<div style="padding:8px 10px 4px;font-size:11px;color:#737373">${t}</div>`;
    const sep = '<div style="height:1px;background:#e5e5e5;margin:6px 4px"></div>';
    const one = (s) => item(svg(s[3], 16), s[1], s[2], scaleMode === s[0], s[0]);
    menu = document.createElement("div");
    menu.className = "pop";
    menu.setAttribute("role", "menu");
    menu.style.cssText = `position:absolute;z-index:210;top:${r.bottom + 6}px;left:${Math.max(8, r.right - 280)}px;width:280px;padding:6px;`;
    menu.innerHTML = head("Recommended") + one(SCALES[0]) + one(SCALES[1]) + sep + head("Other scaling options") + SCALES.slice(2).map(one).join("") + sep
        + item(svg(ICON.hide, 16), "Hide UI", "&#8984;\\", false, "hideui");
    box.appendChild(menu);
    menu.addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]");
        if (!b) return;
        b.dataset.act === "hideui" ? setUi(true) : setScale(b.dataset.act);
    });
    menu.querySelectorAll(".pvItem").forEach((b) => { b.onmouseenter = () => (b.style.background = "#f0f0f0"); b.onmouseleave = () => (b.style.background = ""); });
}

// ── Keys and messages ────────────────────────────────────────────────────────
const onMessage = (e) => {
    if (!box || !pageFrame || e.source !== pageFrame.contentWindow || !e.data || e.data.wcPresent !== box.dataset.id) return;
    key(e.data.key);
};
function key(k) {
    if (k === "Escape") return menu ? closeMenu() : closePreview();
    if (k === "ArrowRight") return show(at + 1);
    if (k === "ArrowLeft") return show(at - 1);
    if (k === "restart") return show((start = Math.min(start, list.length - 1)));
    if (k === "responsive") return setScale("responsive");
    if (k === "hideui") return setUi(!uiHidden);
}
const onKey = (e) => {
    if (!box) return;
    const typing = /^(input|textarea|select)$/i.test(e.target.tagName || "");
    const mod = e.metaKey || e.ctrlKey;
    let k = "";
    if (e.key === "Escape" || e.key === "ArrowRight" || e.key === "ArrowLeft") k = e.key;
    else if (mod && e.key === "\\") k = "hideui";
    else if (!mod && !e.altKey && !typing && /^[rR]$/.test(e.key)) k = "restart";
    else if (!mod && !e.altKey && !typing && /^[zZ]$/.test(e.key)) k = "responsive";
    if (k) { e.preventDefault(); e.stopImmediatePropagation(); key(k); return; }
    if (!mod && !typing) e.stopImmediatePropagation(); // the editor's own shortcuts stay off
};
const onResize = () => layout();
const onDown = (e) => { if (menu && !menu.contains(e.target) && !$("pvScale").contains(e.target)) closeMenu(); };

export function openPreview() {
    if (box) return;
    list = pagesToShow();
    if (!list.length) return;
    start = at = Math.max(0, list.findIndex((d) => d.key === S.curKey)); // starts on the page you are on
    box = document.createElement("div");
    box.id = "presentBox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Preview");
    box.style.cssText = "position:fixed;inset:0;z-index:200;background:#1c1c1e;display:flex;flex-direction:column;font-family:inherit;";
    const label = "font-size:13px;color:#171717;";
    box.innerHTML = `<div id="pvTop" style="height:64px;flex:none;display:flex;justify-content:center;align-items:flex-start;transition:height .15s;">
        <div id="pvBar" class="pill" style="margin-top:12px;display:flex;align-items:center;gap:2px;padding:4px;transition:opacity .15s;">
            <button id="pvClose" type="button" class="tbtn" title="Close (Esc)" aria-label="Close preview">${svg(ICON.close)}</button>
            <span class="sep" style="width:1px;height:20px;background:#e5e5e5;margin:0 4px"></span>
            <button id="pvPrev" type="button" class="tbtn disabled:opacity-30" title="Previous page (Left arrow)" aria-label="Previous page">${svg(ICON.prev)}</button>
            <span style="display:inline-flex;align-items:baseline;gap:8px;padding:0 6px;min-width:60px;justify-content:center;">
                <span id="pvName" style="${label}font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
                <span id="pvCount" style="font-size:12px;color:#737373;"></span>
            </span>
            <button id="pvNext" type="button" class="tbtn" title="Next page (Right arrow)" aria-label="Next page">${svg(ICON.next)}</button>
            <span class="sep" style="width:1px;height:20px;background:#e5e5e5;margin:0 4px"></span>
            <button id="pvRestart" type="button" class="tbtn" title="Back to the first page you saw and load it again (R)" style="width:auto;padding:0 10px;gap:6px;${label}">${svg(ICON.restart, 16)}<span>Restart</span><span style="font-size:11px;color:#737373">R</span></button>
            <span class="sep" style="width:1px;height:20px;background:#e5e5e5;margin:0 4px"></span>
            <button id="pvScale" type="button" class="tbtn" title="How the page fits the screen" aria-haspopup="menu" style="width:auto;padding:0 8px 0 10px;gap:4px;${label}font-weight:500;"><span>100%</span>${svg(ICON.down, 14, 1.8)}</button>
        </div>
    </div>
    <div id="pvHot" style="position:absolute;left:0;right:0;top:0;height:24px;z-index:205;"></div>
    <div id="pvStage" style="flex:1;min-height:0;overflow:hidden;"><div id="pvWrap"><iframe id="pvFrame" title="Preview" sandbox="allow-scripts allow-forms allow-popups"></iframe></div></div>`;
    document.body.appendChild(box);
    pageFrame = $("pvFrame");
    $("pvPrev").onclick = () => show(at - 1);
    $("pvNext").onclick = () => show(at + 1);
    $("pvClose").onclick = closePreview;
    $("pvRestart").onclick = () => key("restart");
    $("pvScale").onclick = () => (menu ? closeMenu() : openMenu());
    // with the UI hidden the bar comes back while the pointer is at the top edge
    $("pvHot").addEventListener("mouseenter", () => { if (uiHidden) { $("pvBar").style.opacity = "1"; $("pvBar").style.pointerEvents = "auto"; } });
    $("pvBar").addEventListener("mouseleave", () => { if (uiHidden && !menu) { $("pvBar").style.opacity = "0"; $("pvBar").style.pointerEvents = "none"; } });
    box.addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
    box.addEventListener("pointerdown", onDown, true);
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    $("playBtn").classList.add("on");
    uiHidden = false;
    show(at);
    $("pvNext").focus();
}

export function closePreview() {
    if (!box) return;
    closeMenu();
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    box.remove();
    box = pageFrame = null;
    S.presentKey = null;
    $("playBtn").classList.remove("on");
}
export const previewOpen = () => Boolean(box);
