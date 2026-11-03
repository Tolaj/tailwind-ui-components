import { buildPreviewDocument, parseComponentSource } from "../../playground/component-source.js";
import { $, S, data, model } from "./base.js";
import { docs } from "./designs.js";
import { widthOf } from "./plane.js";

// ── Preview: the pages of the project shown one at a time, full screen, as a visitor would see them ─────────────────────────
// (The Interact tool is different: it runs the one page you are editing, on the canvas.)

let box = null, pageFrame = null, list = [], at = 0;

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
const pageScript = (id) => `<script data-wc-present>(function(){var I=${JSON.stringify(id)};addEventListener("keydown",function(e){if(["ArrowLeft","ArrowRight","Escape"].indexOf(e.key)<0)return;if(e.key!=="Escape"&&(e.target&&/^(input|textarea|select)$/i.test(e.target.tagName)||e.target.isContentEditable))return;e.preventDefault();parent.postMessage({wcPresent:I,key:e.key},"*")},true);addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey)e.preventDefault()},{passive:false});["gesturestart","gesturechange","gestureend"].forEach(function(t){addEventListener(t,function(e){e.preventDefault()})})})()<\/script>`;

function show(i) {
    at = (i + list.length) % list.length;
    const d = list[at];
    S.presentKey = d.key;
    const full = box.clientWidth, availH = box.clientHeight - 64;
    const w = widthOf(d), k = Math.min(1, (full - 48) / w); // a page wider than the screen is shown smaller, never cropped
    pageFrame.style.cssText = `width:${w}px;height:${availH / k}px;transform:scale(${k});transform-origin:top center;border:0;background:#fff;border-radius:6px;box-shadow:0 12px 48px rgba(0,0,0,.45);flex:none;`;
    pageFrame.parentElement.style.height = `${availH}px`;
    const html = buildPreviewDocument(sourceOf(d), { width: w });
    const cut = html.lastIndexOf("</body>");
    const id = `p${Date.now()}${at}`;
    box.dataset.id = id;
    pageFrame.srcdoc = cut < 0 ? html + pageScript(id) : html.slice(0, cut) + pageScript(id) + html.slice(cut);
    $("pvName").textContent = titleOf(d);
    $("pvCount").textContent = list.length > 1 ? `${at + 1} / ${list.length}` : "";
    $("pvPrev").disabled = $("pvNext").disabled = list.length < 2;
}

const onMessage = (e) => {
    if (!box || !pageFrame || e.source !== pageFrame.contentWindow || !e.data || e.data.wcPresent !== box.dataset.id) return;
    key(e.data.key);
};
function key(k) {
    if (k === "Escape") return closePreview();
    if (k === "ArrowRight") return show(at + 1);
    if (k === "ArrowLeft") return show(at - 1);
}
const onKey = (e) => {
    if (!box) return;
    if (e.key === "Escape" || e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); key(e.key); return; }
    if (!(e.metaKey || e.ctrlKey)) { if (!/^(input|textarea|select)$/i.test((e.target.tagName || ""))) e.stopImmediatePropagation(); } // the editor's own shortcuts stay off
};
const onResize = () => box && show(at);

export function openPreview() {
    if (box) return;
    list = pagesToShow();
    if (!list.length) return;
    at = Math.max(0, list.findIndex((d) => d.key === S.curKey)); // starts on the page you are on
    box = document.createElement("div");
    box.id = "presentBox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Preview");
    box.style.cssText = "position:fixed;inset:0;z-index:200;background:#1c1c1e;display:flex;flex-direction:column;align-items:center;font-family:inherit;";
    const btn = "height:32px;min-width:32px;border:0;border-radius:8px;background:rgba(255,255,255,.1);color:#fff;font-size:14px;cursor:pointer;padding:0 10px;";
    box.innerHTML = `<div style="height:64px;flex:none;width:100%;display:flex;align-items:center;justify-content:space-between;padding:0 16px;box-sizing:border-box;color:#fff;">
        <span style="font-size:12px;color:#a1a1aa;min-width:120px;">Preview</span>
        <div style="display:flex;align-items:center;gap:10px;">
            <button id="pvPrev" type="button" title="Previous page (Left arrow)" aria-label="Previous page" style="${btn}">&#8592;</button>
            <span id="pvName" style="font-size:13px;font-weight:600;max-width:40vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
            <span id="pvCount" style="font-size:12px;color:#a1a1aa;"></span>
            <button id="pvNext" type="button" title="Next page (Right arrow)" aria-label="Next page" style="${btn}">&#8594;</button>
        </div>
        <div style="min-width:120px;text-align:right;"><button id="pvClose" type="button" title="Close (Esc)" aria-label="Close preview" style="${btn}">&#10005;</button></div>
    </div>
    <div style="width:100%;flex:none;display:flex;justify-content:center;overflow:hidden;"><iframe id="pvFrame" title="Preview" sandbox="allow-scripts allow-forms allow-popups"></iframe></div>`;
    document.body.appendChild(box);
    pageFrame = $("pvFrame");
    $("pvPrev").onclick = () => show(at - 1);
    $("pvNext").onclick = () => show(at + 1);
    $("pvClose").onclick = closePreview;
    box.addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    $("playBtn").classList.add("on");
    show(at);
    $("pvNext").focus();
}

export function closePreview() {
    if (!box) return;
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    box.remove();
    box = pageFrame = null;
    S.presentKey = null;
    $("playBtn").classList.remove("on");
}
export const previewOpen = () => Boolean(box);
