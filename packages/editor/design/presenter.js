import { buildPreviewDocument, parseComponentSource } from "../playground/component-source.js";
import { DEVICES, deviceParts } from "./device-frame.js";

// ── The prototype viewer: pages shown one at a time, full screen, as a visitor would see them ───────────────────────────────
// No editor state in here: the editor's Preview (a fallback when the app has no prototype page) and the /prototype page both use it.
// A toolbar at the top right (like the editor's own): previous / next page with a count, Share, how the page is scaled to the
// screen, and Share. Hide UI hides it again; ⌘\ or the top right corner brings it back.

const SCALES = [
    ["actual", "Actual size (100%)", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9.5 10.5 11 9.5v5"/><path d="M13.5 11.2v.1M13.5 13.1v.1"/>'],
    ["responsive", "Responsive", "Z", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M8.5 10.5 7 12l1.5 1.5M15.5 10.5 17 12l-1.5 1.5"/>'],
    ["desktop", "Desktop", "1280", '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'],
    ["tablet", "Tablet", "768", '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>'],
    ["mobile", "Mobile", "390", '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'],
    ["fitw", "Fit width", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7.5 12h9M10 9.5 7.5 12l2.5 2.5M14 9.5l2.5 2.5-2.5 2.5"/>'],
    ["fitwh", "Fit width and height", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 8v8M8 12h8M10.5 9.5 12 8l1.5 1.5M10.5 14.5 12 16l1.5-1.5M9.5 10.5 8 12l1.5 1.5M14.5 10.5 16 12l-1.5 1.5"/>'],
    ["fill", "Fill screen", "", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 9.5V8h1.5M14.5 8H16v1.5M16 14.5V16h-1.5M9.5 16H8v-1.5"/>'],
];
export const SCALE_NAMES = SCALES.map((s) => s[0]);
// (The phone and tablet frames are drawn by device-frame.js, shared with the gallery.)
const DEVICE_W = { desktop: 1280, tablet: 768, mobile: 390 }; // the page is built at that width (its own responsive styles apply), as the editor's page sizes
const ICON = {
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    hide: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><path d="M3 15h18M3 19h12"/>',
    grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    minimize: '<path d="M6 12h12"/>',
    expand: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
};
const svg = (paths, size = 18, w = 1.6) => `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const GRIP = `<svg width="14" height="16" viewBox="6 3 12 18" fill="currentColor" aria-hidden="true">${ICON.grip}</svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Our own styles, so the viewer looks the same inside the editor and on its own page (which has none of the editor's stylesheet).
const STYLE = `
.pvr{position:fixed;inset:0;z-index:200;background:#1c1c1e;display:flex;flex-direction:column;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.pvr *{box-sizing:border-box}
.pvr button{font:inherit;cursor:pointer;background:none;border:0;padding:0;color:inherit}
.pvr .pv-pill{background:#fff;border:1px solid #e5e5e5;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.18)}
.pvr .pv-grip{display:inline-flex;align-items:center;justify-content:center;width:20px;height:32px;color:#a3a3a3;cursor:grab;touch-action:none}
.pvr .pv-grip:active{cursor:grabbing}
.pvr .pv-dock{position:absolute;z-index:206;display:flex;align-items:center;gap:8px;transition:opacity .15s}
.pvr .pv-b{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;min-width:32px;padding:0;border-radius:8px;color:#404040;font-size:13px}
.pvr .pv-b:hover{background:#f0f0f0}
.pvr .pv-b:disabled{opacity:.3;cursor:default;background:none}
.pvr .pv-sep{width:1px;height:20px;background:#e5e5e5;margin:0 4px}
.pvr .pv-share{background:#111;color:#fff;padding:0 12px;border-radius:8px}
.pvr .pv-share:hover{background:#000}
.pvr .pv-pop{position:absolute;z-index:210;background:#fff;border:1px solid #e5e5e5;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.28);color:#171717}
.pvr .pv-item{display:flex;align-items:center;gap:10px;width:100%;height:34px;padding:0 10px;border-radius:8px;font-size:13px;color:#171717;text-align:left}
.pvr .pv-item:hover{background:#f0f0f0}
`;
let styled = false;
function addStyle() {
    if (styled) return;
    styled = true;
    const s = document.createElement("style");
    s.dataset.wcPresenter = "";
    s.textContent = STYLE;
    document.head.appendChild(s);
}

/**
 * @param {object} o
 * @param {{ key: string, title: string, width?: number, height?: number, source: object | string | (() => object | string) }[]} o.pages
 * @param {number} [o.start]       the page to begin on
 * @param {string} [o.scaling]     one of SCALE_NAMES
 * @param {() => void} [o.onClose] when given, the toolbar has a close button (and Esc closes)
 * @param {{ label?: string, open: (anchor: HTMLElement) => void } | null} [o.share]   a Share button
 * @param {string} [o.name]        a project name, shown at the top left
 * @param {(state: { key: string, index: number, scaling: string }) => void} [o.onChange]
 */
export function createPresenter(o) {
    addStyle();
    const pages = o.pages;
    let at = Math.min(Math.max(0, o.start || 0), pages.length - 1);
    let scaleMode = SCALE_NAMES.includes(o.scaling) ? o.scaling : "", uiHidden = false, menu = null; // "": the page decides (a page as wide as a tablet or more fills the width; a phone-sized one keeps its own size)
    const widthFor = (p) => { const m = modeOf(p); return DEVICE_W[m] || (m === "responsive" ? stage.clientWidth : p.width || 1280); };
    const modeOf = (p) => scaleMode || ((p.width || 1280) >= 768 ? "fitw" : "actual");

    const box = document.createElement("div");
    box.className = "pvr";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Prototype");
    const name = esc(o.name || "");
    box.innerHTML = `<div data-stage style="position:absolute;inset:0;overflow:hidden"><div data-wrap><div data-shell><div data-screen><iframe data-frame title="Prototype" sandbox="allow-scripts allow-forms allow-popups"></iframe></div>
        <span data-notch style="display:none"></span><span data-cam style="display:none"></span><span data-side style="display:none"></span></div></div></div>
    <div data-hot style="position:absolute;left:0;right:0;top:0;height:20px;z-index:205"></div>
    <div data-dock class="pv-dock" style="right:12px;top:12px">
        <div data-full style="display:flex;align-items:center;gap:8px">
            <div class="pv-pill" style="display:flex;align-items:center;gap:2px;padding:4px">
                <span data-grip class="pv-grip" title="Drag to move the toolbar">${GRIP}</span>
                ${o.onClose ? `<button type="button" data-close class="pv-b" style="width:32px" title="Close (Esc)" aria-label="Close preview">${svg(ICON.close)}</button><span class="pv-sep"></span>` : ""}
                <button type="button" data-prev class="pv-b" style="width:32px" title="Previous page (Left arrow)" aria-label="Previous page">${svg(ICON.prev)}</button>
                <span style="display:inline-flex;align-items:baseline;gap:8px;padding:0 6px;min-width:60px;justify-content:center" ${name ? `title="${name}"` : ""}>
                    <span data-title style="font-size:13px;font-weight:600;color:#171717;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
                    <span data-count style="font-size:12px;color:#737373"></span>
                </span>
                <button type="button" data-next class="pv-b" style="width:32px" title="Next page (Right arrow)" aria-label="Next page">${svg(ICON.next)}</button>
                <span class="pv-sep"></span>
                ${o.share ? `<button type="button" data-share class="pv-b pv-share" style="padding:0 14px;gap:6px;font-weight:600;margin-right:2px" title="Get a link to this prototype">${svg(ICON.share, 16)}<span>${esc(o.share.label || "Share")}</span></button>` : ""}
                <button type="button" data-scale class="pv-b" style="padding:0 8px 0 10px;gap:4px;font-weight:500;color:#171717" title="How the page fits the screen" aria-haspopup="menu"><span>100%</span>${svg(ICON.down, 14, 1.8)}</button>
                <span class="pv-sep"></span>
                <button type="button" data-min class="pv-b" style="width:32px" title="Minimize the toolbar" aria-label="Minimize the toolbar">${svg(ICON.minimize)}</button>
            </div>
        </div>
        <div data-mini class="pv-pill" style="display:none;align-items:center;gap:2px;padding:4px">
            <span data-grip class="pv-grip" title="Drag to move the toolbar">${GRIP}</span>
            <span data-count2 style="font-size:12px;color:#525252;padding:0 4px;min-width:34px;text-align:center"></span>
            <button type="button" data-expand class="pv-b" style="width:32px" title="Show the toolbar" aria-label="Show the toolbar">${svg(ICON.expand, 16)}</button>
        </div>
    </div>`;
    document.body.appendChild(box);
    const q = (s) => box.querySelector(s);
    const stage = q("[data-stage]"), wrap = q("[data-wrap]"), shell = q("[data-shell]"), screen = q("[data-screen]"), notch = q("[data-notch]"), cam = q("[data-cam]"), side = q("[data-side]"), frame = q("[data-frame]"), dock = q("[data-dock]"), full = q("[data-full]"), mini = q("[data-mini]");

    // A page of its own has none of the editor's script: keys and Ctrl/Cmd + scroll (the browser's zoom) are handed to this window.
    const pageScript = (id) => `<script data-wc-present>(function(){var I=${JSON.stringify(id)};function name(e){var m=e.metaKey||e.ctrlKey;if(m&&e.key==="\\\\")return"hideui";if(m||e.altKey)return"";if(e.key==="ArrowLeft"||e.key==="ArrowRight"||e.key==="Escape")return e.key;if(e.key==="z"||e.key==="Z")return"responsive";return""}addEventListener("keydown",function(e){var k=name(e);if(!k)return;var t=e.target;if(k!=="Escape"&&k!=="hideui"&&t&&(/^(input|textarea|select)$/i.test(t.tagName)||t.isContentEditable))return;e.preventDefault();parent.postMessage({wcPresent:I,key:k},"*")},true);addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey)e.preventDefault()},{passive:false});["gesturestart","gesturechange","gestureend"].forEach(function(t){addEventListener(t,function(e){e.preventDefault()})})})()<\/script>`;

    const sourceOf = (p) => {
        const s = typeof p.source === "function" ? p.source() : p.source;
        return typeof s === "string" ? parseComponentSource(s) : s;
    };

    /** Sizes the page for the screen: it keeps its own width (Actual size), takes the window's (Responsive), or is scaled. */
    function layout() {
        const p = pages[at], mode = modeOf(p);
        const availW = stage.clientWidth, availH = stage.clientHeight;
        const dev = DEVICES[mode];
        if (dev) { // a phone or a tablet in its frame, centred, scaled down only when the window is smaller than it
            const d = deviceParts(dev), k = Math.min(1, (availW - 24) / d.w, (availH - 24) / d.h), W = d.w * k, H = d.h * k;
            shell.style.cssText = d.shell + `transform:scale(${k});`;
            screen.style.cssText = d.screen;
            frame.style.cssText = d.frame;
            notch.style.cssText = d.notch;
            cam.style.cssText = d.cam;
            side.style.cssText = d.side;
            wrap.style.cssText = `position:relative;flex:none;width:${W}px;height:${H}px;margin:${(availH - H) / 2}px 0 0 ${(availW - W) / 2}px;`;
            stage.style.overflowX = "hidden";
            q("[data-scale] span").textContent = `${Math.round(k * 100)}%`;
            return;
        }
        shell.style.cssText = "position:absolute;inset:0;";
        screen.style.cssText = "position:absolute;inset:0;overflow:hidden;";
        notch.style.display = cam.style.display = side.style.display = "none";
        const w = p.width || 1280, h = p.height || availH;
        let k = 1, fw = w, fh = availH;
        if (mode === "desktop") { fw = DEVICE_W.desktop; k = Math.min(1, availW / fw); fh = availH / k; } // the desktop width, centred; smaller only when the window is narrower
        else if (mode === "responsive") fw = availW;
        else if (mode === "fitw") { k = availW / w; fh = availH / k; }
        else if (mode === "fitwh") { k = Math.min(availW / w, availH / h); fh = h; }
        else if (mode === "fill") { k = Math.max(availW / w, availH / h); fh = h; }
        const W = fw * k, H = fh * k;
        frame.style.cssText = `position:absolute;left:0;top:0;width:${fw}px;height:${fh}px;transform:scale(${k});transform-origin:0 0;border:0;background:#fff;`;
        wrap.style.cssText = `position:relative;flex:none;width:${W}px;height:${H}px;margin:${Math.max(0, (availH - H) / 2)}px 0 0 ${W <= availW || mode === "fill" ? (availW - W) / 2 : 0}px;${W < availW - 1 || H < availH - 1 ? "box-shadow:0 12px 48px rgba(0,0,0,.45);" : ""}overflow:hidden;`;
        stage.style.overflowX = mode === "actual" ? "auto" : "hidden";
        q("[data-scale] span").textContent = `${Math.round(k * 100)}%`;
    }

    function show(i) {
        at = (i + pages.length) % pages.length;
        const p = pages[at];
        const html = buildPreviewDocument(sourceOf(p), { width: widthFor(p) });
        const cut = html.lastIndexOf("</body>");
        const id = `p${Date.now()}${at}`;
        box.dataset.id = id;
        frame.srcdoc = cut < 0 ? html + pageScript(id) : html.slice(0, cut) + pageScript(id) + html.slice(cut);
        q("[data-title]").textContent = p.title || "Untitled page";
        q("[data-count]").textContent = pages.length > 1 ? `${at + 1} / ${pages.length}` : "";
        q("[data-count2]").textContent = pages.length > 1 ? `${at + 1}/${pages.length}` : "";
        q("[data-prev]").disabled = q("[data-next]").disabled = pages.length < 2;
        layout();
        if (o.onChange) o.onChange({ key: p.key, index: at, scaling: scaleMode });
    }

    function setScale(mode) { scaleMode = mode; closeMenu(); show(at); } // Responsive changes the page's own width, so it is built again

    function setUi(hidden) {
        uiHidden = hidden;
        closeMenu();
        dock.style.opacity = hidden ? "0" : "1";
        dock.style.pointerEvents = hidden ? "none" : "auto";
        layout();
    }

    function closeScale() { if (menu) { menu.remove(); menu = null; } }
    function closeMenu() { closeScale(); if (o.share && o.share.close) o.share.close(); }

    // ── The toolbar floats over the page: drag it by its grip, minimize it to a small chip ──────────────────
    const DOCK_KEY = "wc:presenterDock";
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(DOCK_KEY) || "{}") || {}; } catch { /* storage is optional */ }
    let minimized = Boolean(saved.min);
    const place = (right, top) => {
        right = Math.min(Math.max(8, right), Math.max(8, innerWidth - dock.offsetWidth - 8));
        top = Math.min(Math.max(8, top), Math.max(8, innerHeight - dock.offsetHeight - 8));
        dock.style.right = `${right}px`;
        dock.style.top = `${top}px`;
    };
    const keepDock = () => { try { localStorage.setItem(DOCK_KEY, JSON.stringify({ right: parseFloat(dock.style.right), top: parseFloat(dock.style.top), min: minimized })); } catch { /* storage is optional */ } };
    function setMin(m) {
        minimized = m;
        closeMenu();
        full.style.display = m ? "none" : "flex";
        mini.style.display = m ? "flex" : "none";
        place(parseFloat(dock.style.right), parseFloat(dock.style.top)); // it grows and shrinks towards the left: keep it on screen
        keepDock();
    }
    box.querySelectorAll("[data-grip]").forEach((grip) => {
        grip.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            closeMenu();
            e.preventDefault();
            const from = { x: e.clientX, y: e.clientY, right: parseFloat(dock.style.right), top: parseFloat(dock.style.top) };
            // the page under the pointer is a separate document that would take the moves: a see-through cover keeps them here
            const cover = document.createElement("div");
            cover.style.cssText = "position:absolute;inset:0;z-index:300;cursor:grabbing;touch-action:none";
            box.appendChild(cover);
            const move = (ev) => place(from.right - (ev.clientX - from.x), from.top + (ev.clientY - from.y));
            const end = () => {
                cover.removeEventListener("pointermove", move);
                cover.removeEventListener("pointerup", end);
                cover.removeEventListener("pointercancel", end);
                cover.remove();
                keepDock();
            };
            cover.addEventListener("pointermove", move);
            cover.addEventListener("pointerup", end);
            cover.addEventListener("pointercancel", end);
            cover.setPointerCapture(e.pointerId);
        });
    });
    function openMenu() {
        closeMenu();
        const r = q("[data-scale]").getBoundingClientRect();
        const item = (icon, label, hint, on, act) => `<button type="button" role="menuitem" data-act="${act}" class="pv-item"><span style="width:16px;display:inline-flex;justify-content:center">${on ? svg(ICON.check, 14, 2) : ""}</span><span style="display:inline-flex;color:#525252">${icon}</span><span style="flex:1">${label}</span><span style="font-size:12px;color:#737373">${hint}</span></button>`;
        const head = (t) => `<div style="padding:8px 10px 4px;font-size:11px;color:#737373">${t}</div>`;
        const sep = '<div style="height:1px;background:#e5e5e5;margin:6px 4px"></div>';
        const one = (s) => item(svg(s[3], 16), s[1], s[2], modeOf(pages[at]) === s[0], s[0]);
        menu = document.createElement("div");
        menu.className = "pv-pop";
        menu.setAttribute("role", "menu");
        menu.style.cssText = `top:${r.bottom + 6}px;left:${Math.max(8, Math.min(innerWidth - 288, r.right - 280))}px;width:280px;padding:6px;`;
        menu.innerHTML = head("Recommended") + one(SCALES[0]) + one(SCALES[1]) + sep + head("Device") + SCALES.slice(2, 5).map(one).join("") + sep + head("Other scaling options") + SCALES.slice(5).map(one).join("") + sep + item(svg(ICON.hide, 16), "Hide UI", "&#8984;\\", false, "hideui");
        box.appendChild(menu);
        menu.addEventListener("click", (e) => {
            const b = e.target.closest("[data-act]");
            if (!b) return;
            b.dataset.act === "hideui" ? setUi(true) : setScale(b.dataset.act);
        });
    }

    function key(k) {
        if (k === "Escape") return menu ? closeMenu() : o.onClose && o.onClose();
        if (k === "ArrowRight") return show(at + 1);
        if (k === "ArrowLeft") return show(at - 1);
        if (k === "responsive") return setScale("responsive");
        if (k === "hideui") return setUi(!uiHidden);
    }
    const onMessage = (e) => {
        if (e.source !== frame.contentWindow || !e.data || e.data.wcPresent !== box.dataset.id) return;
        key(e.data.key);
    };
    const onKey = (e) => {
        const typing = /^(input|textarea|select)$/i.test(e.target.tagName || "") || e.target.isContentEditable;
        const mod = e.metaKey || e.ctrlKey;
        let k = "";
        if (e.key === "Escape" || e.key === "ArrowRight" || e.key === "ArrowLeft") k = typing && e.key !== "Escape" ? "" : e.key;
        else if (mod && e.key === "\\") k = "hideui";
        else if (!mod && !e.altKey && !typing && /^[zZ]$/.test(e.key)) k = "responsive";
        if (k) { e.preventDefault(); e.stopImmediatePropagation(); key(k); return; }
        if (!mod && !typing) e.stopImmediatePropagation(); // the editor's own shortcuts stay off
    };
    const onResize = () => { layout(); place(parseFloat(dock.style.right), parseFloat(dock.style.top)); };
    const onDown = (e) => { if (menu && !menu.contains(e.target) && !q("[data-scale]").contains(e.target)) closeMenu(); };

    q("[data-prev]").onclick = () => show(at - 1);
    q("[data-next]").onclick = () => show(at + 1);
    q("[data-scale]").onclick = () => (menu ? closeMenu() : openMenu());
    if (o.onClose) q("[data-close]").onclick = () => o.onClose();
    if (o.share) q("[data-share]").onclick = (e) => { closeScale(); o.share.open(e.currentTarget, box); };
    // with the UI hidden, the bar comes back while the pointer is at the top edge
    q("[data-hot]").addEventListener("mouseenter", () => { if (uiHidden) { dock.style.opacity = "1"; dock.style.pointerEvents = "auto"; } });
    dock.addEventListener("mouseleave", () => { if (uiHidden && !menu) { dock.style.opacity = "0"; dock.style.pointerEvents = "none"; } });
    box.addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
    box.addEventListener("pointerdown", onDown, true);
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);

    q("[data-min]").onclick = () => setMin(true);
    q("[data-expand]").onclick = () => setMin(false);
    place(saved.right ?? 12, saved.top ?? 12);
    if (minimized) setMin(true);
    show(at);

    return {
        root: box,
        go: (i) => show(i),
        destroy() {
            closeMenu();
            window.removeEventListener("message", onMessage);
            window.removeEventListener("keydown", onKey, true);
            window.removeEventListener("resize", onResize);
            box.remove();
        },
    };
}
