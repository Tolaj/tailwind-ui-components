import { colorPickerOpener, closeColorPicker, openColorPicker } from "../color-picker.js";
import { FAMILY_STACKS } from "../float-toolbar.js";
import { FLOAT_ACTIONS, SIDES4, applyPanel, ftb, renderFloat } from "./frame-handles.js";
import { $, S } from "./base.js";
import { insp, liveKey, pickerClosed, setProp, setProps } from "./inspector.js";
import { canvas, curWidth } from "./plane.js";
import { scheduleLayout, setFrameSize } from "./designs.js";
import { renderPagesList } from "./pages-panel.js";
import { renderLayers, revealLayer } from "./layers.js";

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

const FT_COLOR = { text: "color", fill: "background-color" };
const toggleDesignsMenu = (e) => { e.stopPropagation(); $("addMenu").classList.add("hidden"); $("designsMenu").classList.toggle("hidden"); };

// Layers live in the left panel, opened from the toggle in the tools.

export function setLeft(open) {
    S.leftOpen = open;
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

// side panel: closed until you want every property or the layer tree
let panelTab = "props";
export const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* storage is optional */ } return null; };
export function setPanelTab(t) {
    panelTab = t;
    document.querySelectorAll("#panelTabs .ptab").forEach((b) => b.classList.toggle("is-on", b.dataset.ptab === t));
    $("inspector").classList.toggle("hidden", t !== "props");
    revealLayer(true);
}
export function setPanel(open) {
    $("panel").classList.toggle("hidden", !open);
    $("panel").classList.toggle("flex", open);
    $("panelBtn").classList.toggle("on", open);
    pref("wc:panel", open ? "1" : "0");
    if (open) revealLayer(true);
    scheduleLayout();
}

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {
    document.addEventListener("click", (e) => {
        const t = e.target.closest && e.target.closest('input[type="color"]');
        if (!t || !(ftb.contains(t) || insp.contains(t)) || !S.selected) return;
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
ftb.addEventListener("input", (e) => {
    const t = e.target;
    if (!S.selected) return;
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
    if (!S.selected) return;
    if (t.dataset.ftsel === "family") return setProp("font-family", t.value, FAMILY_STACKS[t.value]);
    if (t.dataset.ftin === "size") { const n = Number(t.value); return n > 0 ? setProp("font-size", `${n}px`) : renderFloat(); }
    if (t.dataset.ftp === "border-color") { // the picker closed: its last value joins the drag's undo step, and the next pick starts a new one
        if (S.selected) setProps(SIDES4.map((d) => `border-${d}-color`), t.value, "borderColor", [], undefined, liveKey("ft-border"));
        return pickerClosed(t);
    }
    if (t.dataset.ftp) return applyPanel(t.dataset.ftp, t.value);
    if (t.dataset.ftin === "radius") return FLOAT_ACTIONS.radius(Math.max(0, Number(t.value) || 0));
    if (t.dataset.ftcol && FT_COLOR[t.dataset.ftcol]) { setProp(FT_COLOR[t.dataset.ftcol], t.value, undefined, liveKey(`ft-${t.dataset.ftcol}`)); return pickerClosed(t); }
});

    document.addEventListener("click", (e) => {
        $("designsMenu").classList.add("hidden");
        if ((S.ftMenu || S.ftPop) && !e.target.closest("#ftb")) { S.ftMenu = false; S.ftPop = null; renderFloat(true); }
    });
    $("designsBtn").addEventListener("click", toggleDesignsMenu);
    $("navMoreBtn").addEventListener("click", toggleDesignsMenu);
    $("designsMenu").addEventListener("click", (e) => e.stopPropagation());
    $("leftBtn").addEventListener("click", () => setLeft(!S.leftOpen));
    $("panelBtn").addEventListener("click", () => setPanel($("panel").classList.contains("hidden")));
    $("panelClose").addEventListener("click", () => setPanel(false));
    $("panelTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-ptab]"); if (b) setPanelTab(b.dataset.ptab); });
    new ResizeObserver(() => scheduleLayout()).observe(canvas);
}
