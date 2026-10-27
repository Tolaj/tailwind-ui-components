import { TEXT_TAGS, toolbarHtml } from "../float-toolbar.js";
import { selectionHtml } from "../selection-overlay.js";
import { $, S, send } from "./base.js";
import { docs, setFrameSize, wraps } from "./designs.js";
import { canvas, heightOfDoc, positions, view, widthOf } from "./plane.js";
import { setDevice, setProp, setProps } from "./inspector.js";
import { cmd } from "./frame-messages.js";
import { setPanel, setPanelTab } from "./color-ui.js";

// ── The floating toolbar, frame handles and the side panel ───────────────────
 // which of the bar's panels is open: border, radius or spacing
 // per group: true when its fields are shown one per side (your choice; unset means automatic)
export const ftb = $("ftb");

function toolbarState() {
    if (S.mode !== "edit" || S.gestureOn || S.tool !== "move") return null;
    if (S.frameSel === S.curKey) {
        const d = docs.get(S.curKey);
        return { kind: "frame", frame: { w: widthOf(d), h: heightOfDoc(d), auto: !(d.board && d.board.h), custom: S.lastCustom } };
    }
    if (!S.selected || S.selected.tag === "body" || !S.selected.rect) return null;
    const editing = Boolean(S.editingInfo && S.editingInfo.on);
    const text = editing || TEXT_TAGS.has(S.selected.tag) || (S.selected.leaf && String(S.selected.text || "").trim() !== "");
    return { kind: text ? "text" : "shape", sel: S.selected, editing, fmt: editing ? S.editingInfo.fmt : null, menu: S.ftMenu, pop: S.ftPop, sides: S.ftSides };
}

/** Where the thing the toolbar belongs to sits inside the canvas element. */
function anchorRect(st) {
    const d = docs.get(S.curKey);
    const p = positions()[S.curKey];
    if (!p) return null;
    if (st.kind === "frame") return { x: view.x + p.x * view.z, y: view.y + p.y * view.z, w: widthOf(d) * view.z, h: heightOfDoc(d) * view.z, gap: 38 };
    const r = st.editing && S.editingInfo.rect ? S.editingInfo.rect : st.sel.rect;
    return { x: view.x + (p.x + r.x) * view.z, y: view.y + (p.y + r.y) * view.z, w: r.w * view.z, h: r.h * view.z, gap: 10 };
}

export function placeFloat() {
    if (ftb.classList.contains("hidden")) return;
    const st = toolbarState();
    const a = st && anchorRect(st);
    if (!a) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const w = ftb.offsetWidth, h = ftb.offsetHeight;
    const left = Math.min(Math.max(8, a.x), Math.max(8, cw - w - 8));
    let top = a.y - h - a.gap;
    if (top < 56) top = a.y + a.h + 10;
    top = Math.min(Math.max(56, top), Math.max(56, ch - h - 8));
    ftb.classList.toggle("popdown", top < 270); // a panel opens upward, unless the bar is too close to the top of the canvas
    ftb.style.left = `${Math.round(left)}px`;
    ftb.style.top = `${Math.round(top)}px`;
}

// the frame's handles, in screen pixels like the element selection (a handle must be 9px at any zoom)
const FRAME_HANDLES = [
    ["n", "left:0;top:0;width:100%;height:10px;transform:translateY(-50%);cursor:ns-resize;"], ["s", "left:0;top:100%;width:100%;height:10px;transform:translateY(-50%);cursor:ns-resize;"],
    ["w", "left:0;top:0;height:100%;width:10px;transform:translateX(-50%);cursor:ew-resize;"], ["e", "left:100%;top:0;height:100%;width:10px;transform:translateX(-50%);cursor:ew-resize;"],
];
const FRAME_CORNERS = [["nw", "left:0;top:0;cursor:nwse-resize;"], ["ne", "left:100%;top:0;cursor:nesw-resize;"], ["se", "left:100%;top:100%;cursor:nwse-resize;"], ["sw", "left:0;top:100%;cursor:nesw-resize;"]];

export function renderFrameSel() {
    renderSel();
    // a frame's name is blue only while the frame, or something inside it, is selected
    wraps.forEach((en, key) => en.wrap.classList.toggle("sel", key === S.curKey && (S.frameSel === S.curKey || Boolean(S.selected && S.selected.tag !== "body"))));
    const el = $("fsel");
    const d = docs.get(S.curKey);
    const p = positions()[S.curKey];
    if (S.frameSel !== S.curKey || S.mode !== "edit" || !p) { el.innerHTML = ""; linesFrame = ""; paintLines(); return; }
    const z = view.z;
    const box = `left:${Math.round((view.x + p.x * z) * 100) / 100}px;top:${Math.round((view.y + p.y * z) * 100) / 100}px;width:${Math.round(widthOf(d) * z * 100) / 100}px;height:${Math.round(heightOfDoc(d) * z * 100) / 100}px;`;
    const fx = view.x + p.x * z, fy = view.y + p.y * z;
    const outline = `<svg class="sout"><rect x="${fx - 0.75}" y="${fy - 0.75}" width="${widthOf(d) * z + 1.5}" height="${heightOfDoc(d) * z + 1.5}" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`;
    linesFrame = outline;
    paintLines();
    el.innerHTML = `<div class="fbox" style="${box}">` + FRAME_HANDLES.map(([n, css]) => `<div class="fh" data-fh="${n}" style="${css}"></div>`).join("") + FRAME_CORNERS.map(([n, css]) => `<div class="fh fc" data-fh="${n}" style="${css}transform:translate(-50%,-50%);"></div>`).join("") + "</div>";
}

/** The selection box and its handles, above the frame (see selection-overlay.js). */

// the outlines of the selection and of the selected frame share one layer that inverts what is under it; handles and labels sit above it
let linesSel = "", linesFrame = "";
const paintLines = () => { $("lines").innerHTML = linesSel + linesFrame; };
export function renderSel() {
    const el = $("sel");
    const p = positions()[S.curKey];
    if (S.mode !== "edit" || S.frameSel === S.curKey || !S.selData || !p) { el.innerHTML = ""; $("slbl").innerHTML = ""; linesSel = ""; paintLines(); return; }
    const parts = selectionHtml(S.selData, { zoom: view.z, ox: view.x + p.x * view.z, oy: view.y + p.y * view.z });
    linesSel = parts.lines;
    paintLines();
    el.innerHTML = parts.html;
    $("slbl").innerHTML = parts.label; // the size label keeps its own colours, so it sits outside the inverting layers
}

export function renderFloat(force) {
    renderFrameSel();
    const st = toolbarState();
    if (!st) { ftb.classList.add("hidden"); ftb.classList.remove("flex"); return; }
    // don't rebuild the bar under a number field someone is typing in, unless a button asked for it
    const typing = !force && document.activeElement && ftb.contains(document.activeElement) && document.activeElement.matches("input");
    if (!typing) ftb.innerHTML = toolbarHtml(st);
    ftb.classList.remove("hidden");
    ftb.classList.add("flex");
    placeFloat();
}

export const SIDES4 = ["top", "right", "bottom", "left"];
const CORNER = { tl: "top-left", tr: "top-right", bl: "bottom-left", br: "bottom-right" };
const SIDE_KEY = { top: "T", right: "R", bottom: "B", left: "L" };
const CORNER_KEY = { tl: "radiusTL", tr: "radiusTR", bl: "radiusBL", br: "radiusBR" };
const allSides = (f) => SIDES4.map(f);
/** A value typed into one of the bar's panels (a border width, a corner, a padding or margin side), written where that value lives (setProps). */
export function applyPanel(key, raw) {
    const colors = allSides((d) => `border-${d}-color`);
    if (key === "border-color-hex") { const h = raw.trim().replace(/^#?/, "#"); return /^#[0-9a-f]{6}$/i.test(h) ? setProps(colors, h, "borderColor") : renderFloat(true); }
    if (key === "border-color") return setProps(colors, raw, "borderColor");
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) return renderFloat(true);
    const v = Math.round(n * 10) / 10; // margins may be negative
    const nn = Math.max(0, v); // everything else may not
    const c = S.selected.computed || {};
    const borderless = SIDES4.every((d) => !parseFloat(c[`border-${d}-width`]));
    // a border width on a box with no border style shows nothing: give it a solid one first (its own undo step)
    const one = `border-${Date.now()}`; // the style and the width below share it: one undo step
    const solid = () => { if (borderless && n > 0) setProps(allSides((d) => `border-${d}-style`), "solid", "borderStyle", [], undefined, one); };
    if (key === "bw-all") { solid(); return setProps(allSides((d) => `border-${d}-width`), nn, "borderWidth", ["borderT", "borderR", "borderB", "borderL"], undefined, one); }
    if (key.startsWith("bw-")) { solid(); const d = key.slice(3); return setProps([`border-${d}-width`], nn, `border${SIDE_KEY[d]}`, [], undefined, one); }
    if (key === "r-all") return FLOAT_ACTIONS.radius(nn);
    if (key.startsWith("r-")) return setProps([`border-${CORNER[key.slice(2)]}-radius`], nn, CORNER_KEY[key.slice(2)]);
    const [kind, side] = key.split("-"); // padding-h, margin-top ...
    const k = kind === "padding" ? "p" : "m";
    const val = kind === "padding" ? nn : v;
    if (side === "h") return setProps([`${kind}-left`, `${kind}-right`], val, `${k}x`, [`${k}l`, `${k}r`]);
    if (side === "v") return setProps([`${kind}-top`, `${kind}-bottom`], val, `${k}y`, [`${k}t`, `${k}b`]);
    return setProps([`${kind}-${side}`], val, `${k}${side[0]}`);
}
export const FLOAT_ACTIONS = {
    bold() {
        if (S.editingInfo && S.editingInfo.on) return send({ cmd: "exec", name: "bold" });
        const on = parseInt(S.selected.computed["font-weight"], 10) >= 600;
        setProp("font-weight", on ? "400" : "700");
    },
    italic() {
        if (S.editingInfo && S.editingInfo.on) return send({ cmd: "exec", name: "italic" });
        const on = S.selected.computed["font-style"] === "italic";
        setProp("font-style", on ? "normal" : "italic");
    },
    underline() {
        if (S.editingInfo && S.editingInfo.on) return send({ cmd: "exec", name: "underline" });
        const on = /underline/.test(S.selected.computed["text-decoration-line"] || "");
        setProp("text-decoration-line", on ? "none" : "underline");
    },
    link() {
        const url = prompt("Link address", "https://");
        if (!url) return;
        if (S.editingInfo && S.editingInfo.on) send({ cmd: "exec", name: "createLink", arg: url });
        else if (S.selected.tag === "a") cmd({ cmd: "setAttr", path: S.selected.path, name: "href", value: url });
        else alert("Select some text while editing it (double-click), then add the link.");
    },
    align() {
        const cur = S.selected.computed["text-align"];
        const next = { left: "center", start: "center", center: "right", right: "left", justify: "left" }[cur] || "center";
        setProp("text-align", next);
    },
    radius(n) {
        // every corner: one rounded-* class, or inline radius where a corner comes from CSS
        setProps(["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"], n, "radius", ["radiusTL", "radiusTR", "radiusBR", "radiusBL"]);
    },
    more() { S.ftMenu = !S.ftMenu; S.ftPop = null; renderFloat(true); },
    pop(key) { S.ftPop = S.ftPop === key ? null : key; S.ftMenu = false; renderFloat(true); },
    side(key, btn) { S.ftSides[key] = !btn.classList.contains("on"); renderFloat(true); },
    bstyle(kind) {
        const c = S.selected.computed || {};
        const none = ["top", "right", "bottom", "left"].every((d) => !parseFloat(c[`border-${d}-width`]));
        const one = `border-${Date.now()}`; // style and width: one undo step
        setProps(SIDES4.map((d) => `border-${d}-style`), kind, "borderStyle", [], undefined, one);
        if (kind !== "none" && none) setProps(SIDES4.map((d) => `border-${d}-width`), 1, "borderWidth", ["borderT", "borderR", "borderB", "borderL"], undefined, one); // a line style on a borderless box: make it visible
    },
    dup() { S.ftMenu = false; cmd({ cmd: "duplicate", path: S.selected.path }); },
    del() { S.ftMenu = false; cmd({ cmd: "remove", path: S.selected.path }); },
    up() { S.ftMenu = false; cmd({ cmd: "move", path: S.selected.path, dir: -1 }); },
    down() { S.ftMenu = false; cmd({ cmd: "move", path: S.selected.path, dir: 1 }); },
    free() { S.ftMenu = false; cmd({ cmd: "freePosition", path: S.selected.path, on: !S.selected.geom.abs }); },
    group() { S.ftMenu = false; send({ cmd: "group" }); },
    ungroup() { S.ftMenu = false; send({ cmd: "ungroup" }); },
    front() { S.ftMenu = false; send({ cmd: "order", mode: "front" }); },
    back() { S.ftMenu = false; send({ cmd: "order", mode: "back" }); },
    props() { S.ftMenu = false; setPanel(true); setPanelTab("props"); renderFloat(true); },
};

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {

    // The bar's buttons act on press, not on click: a value that was just typed makes the bar rebuild itself,
    // which would swallow the click. Pressing also must not take focus from text being edited.
    ftb.addEventListener("mousedown", (e) => {
        if (e.target.closest("select, input, label")) return;
        e.preventDefault();
        // a number field in the bar commits first
        const a = document.activeElement;
        if (a && ftb.contains(a) && a.matches("input")) a.blur();
        const dev = e.target.closest("[data-ftdev]");
        if (dev && dev.dataset.ftdev === "custom") return S.lastCustom && setFrameSize({ w: S.lastCustom.w, h: S.lastCustom.h });
        if (dev) return setDevice(Number(dev.dataset.ftdev));
        const b = e.target.closest("[data-ft]");
        if (b && FLOAT_ACTIONS[b.dataset.ft] && S.selected) FLOAT_ACTIONS[b.dataset.ft](b.dataset.arg, b);
    });

    // pressing anywhere else in the editor (the canvas, a layer) also lets a focused bar field commit first
    document.addEventListener("pointerdown", (e) => {
        const a = document.activeElement;
        if (a && ftb.contains(a) && a.matches("input, select") && !e.target.closest("#ftb")) a.blur();
    }, true);
}
