// The Design tab's Position and Layout sections, laid out as Figma's: always open, icon buttons for the choices, number fields
// with a letter in front. A value the element sets itself (a class, its style attribute) is drawn solid; a default or inherited
// one is faint, and typing in it sets it. Every edit goes through the same actions as the other sections, so it is written where
// the value comes from (setProp in editor/inspector.js):
//   setProp · setProps · resetProp · setGeom · freePosition · align · arrange · group · ungroup · autoLayout · sizeItMyself
import { html, useState } from "../vendor/preact-htm.js";
import { srcOf, shownOf, ownsValue, styled, val, PRESETS, OPTS } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { TextInput } from "./controls.js";

const svg = (d, fill) => html`<svg width="14" height="14" viewBox="0 0 16 16" fill=${fill ? "currentColor" : "none"} stroke=${fill ? "none" : "currentColor"} stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML=${{ __html: d }}></svg>`;
export const I = {
    alignL: svg('<path d="M2.5 2v12"/><rect x="5" y="4" width="8" height="3" rx=".8"/><rect x="5" y="9" width="5" height="3" rx=".8"/>'),
    alignC: svg('<path d="M8 2v12"/><rect x="3.5" y="4" width="9" height="3" rx=".8"/><rect x="5" y="9" width="6" height="3" rx=".8"/>'),
    alignR: svg('<path d="M13.5 2v12"/><rect x="3" y="4" width="8" height="3" rx=".8"/><rect x="6" y="9" width="5" height="3" rx=".8"/>'),
    alignT: svg('<path d="M2 2.5h12"/><rect x="4" y="5" width="3" height="8" rx=".8"/><rect x="9" y="5" width="3" height="5" rx=".8"/>'),
    alignM: svg('<path d="M2 8h12"/><rect x="4" y="3.5" width="3" height="9" rx=".8"/><rect x="9" y="5" width="3" height="6" rx=".8"/>'),
    alignB: svg('<path d="M2 13.5h12"/><rect x="4" y="3" width="3" height="8" rx=".8"/><rect x="9" y="6" width="3" height="5" rx=".8"/>'),
    free: svg('<rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke-dasharray="2 1.6"/><path d="M8 5.5v5M5.5 8h5"/>'),
    rot90: svg('<path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3"/><path d="M3.5 2.5v2.6h2.6"/>'),
    flipH: svg('<path d="M8 2v12" stroke-dasharray="1.5 1.5"/><path d="M6 4 2.5 12H6zM10 4l3.5 8H10z"/>'),
    flipV: svg('<path d="M2 8h12" stroke-dasharray="1.5 1.5"/><path d="M4 6 12 2.5V6zM4 10l8 3.5V10z"/>'),
    block: svg('<rect x="3" y="2.5" width="10" height="4.5" rx="1"/><rect x="3" y="9" width="10" height="4.5" rx="1"/>'),
    row: svg('<rect x="2" y="4" width="3.5" height="8" rx="1"/><rect x="6.25" y="4" width="3.5" height="8" rx="1"/><rect x="10.5" y="4" width="3.5" height="8" rx="1"/><path d="M1 14.5h14" opacity=".5"/>'),
    col: svg('<rect x="4" y="2" width="8" height="3.5" rx="1"/><rect x="4" y="6.25" width="8" height="3.5" rx="1"/><rect x="4" y="10.5" width="8" height="3.5" rx="1"/>'),
    grid: svg('<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>'),
    wrap: svg('<path d="M2.5 4.5h9a2.5 2.5 0 0 1 0 5H6"/><path d="M7.5 8 6 9.5 7.5 11"/><path d="M2.5 12.5h4"/>'),
    between: svg('<path d="M2.5 2v12M13.5 2v12"/><rect x="4.5" y="5" width="2.5" height="6" rx=".6"/><rect x="9" y="5" width="2.5" height="6" rx=".6"/>'),
    sides: svg('<rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke-dasharray="2.2 1.8"/>'),
    plus: svg('<path d="M8 3.5v9M3.5 8h9"/>'),
    minus: svg('<path d="M3.5 8h9"/>'),
    dots: svg('<circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/>', true),
    corners: svg('<path d="M2.5 6V4.5a2 2 0 0 1 2-2H6M10 2.5h1.5a2 2 0 0 1 2 2V6M13.5 10v1.5a2 2 0 0 1-2 2H10M6 13.5H4.5a2 2 0 0 1-2-2V10"/>'),
    textL: svg('<path d="M2.5 4h11M2.5 8h7M2.5 12h9"/>'),
    textC: svg('<path d="M2.5 4h11M4.5 8h7M3.5 12h9"/>'),
    textR: svg('<path d="M2.5 4h11M6.5 8h7M4.5 12h9"/>'),
    textJ: svg('<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>'),
    reverse: svg('<path d="M3 5.5h9.5M10 3l2.5 2.5L10 8"/><path d="M13 10.5H3.5M6 8l-2.5 2.5L6 13"/>'),
    lock: svg('<rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>'),
    unlock: svg('<rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 4.8-1"/>'),
};

/** An icon button: `on` is drawn pressed, `faint` greyed (it does not apply here, so it does nothing). */
export const IconBtn = ({ icon, title, on, faint, onClick }) => html`<button type="button" class=${`ib ${on ? "on" : ""} ${faint ? "faint" : ""}`} title=${title}
    disabled=${faint || undefined} onClick=${onClick}>${icon}</button>`;
/**
 * A field with a letter (or icon) in front, as Figma draws X, Y, W, H: solid when the element's styling gives the value, faint
 * otherwise. `src` ("tw" or "css") marks where a set value comes from (a blue or amber edge); `onReset` adds a × that takes it off.
 * `list`: a datalist of suggestions (Tailwind's scale, fonts...).
 */
export const NumField = ({ label, value, set, src, onReset, disabled, title, list, placeholder, onCommit, children }) => html`<label class=${`nf ${set ? "" : "unset"} ${disabled ? "off" : ""} ${src ? `src-${src}` : ""}`} title=${title}>
    <span class="nfl">${label}</span><${TextInput} class="nfi" value=${value ?? ""} disabled=${disabled} list=${list} placeholder=${placeholder} onCommit=${onCommit} />${children}
    ${onReset && html`<button type="button" class="nfx" title="Remove this value" onMouseDown=${(e) => e.preventDefault()} onClick=${(e) => { e.preventDefault(); onReset(); }}>×</button>`}</label>`;
/** Where a property's value comes from, for a field's edge mark and tooltip: "tw" (a class), "css" (a style), or "". */
export const srcKind = (s, p) => { const k = srcOf(s, p).source; return k === "tailwind" ? "tw" : k === "inline" || k === "design" ? "css" : ""; };
export const srcNote = (s, p) => { const r = srcOf(s, p); return r.source === "tailwind" ? r.token : r.source === "inline" ? "style attribute" : r.source === "design" ? `design CSS: ${r.selector}` : r.source === "parent" ? `inherited (${r.token})` : "default"; };
/** A section as Figma draws it: a bold title, buttons on the right, always open. */
export const FSection = ({ title, extra, children }) => html`<div class="fsec"><div class="fsech"><span>${title}</span><span class="fsx">${extra}</span></div>${children}</div>`;
export const Sub = ({ children }) => html`<p class="fsub">${children}</p>`;

export const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : ""; };
export const owns = (s, p) => ownsValue(srcOf(s, p)); // set on this element itself: can be taken off
export const has = (s, p) => styled(srcOf(s, p)); // given by its own styling (also the design's CSS): drawn solid
export const comp = (s, p) => (s.computed || {})[p] || "";

/** A child of a flex box that flex sizes along its axis ignores a width (or height) set on it: say so, with a one-click way out. */
function FlexNote({ s, actions }) {
    const f = s.flexItem;
    if (!f || !f.sized) return null;
    const what = f.dir === "row" ? "width" : "height";
    return html`<p class="hintnote">Its ${what} fills the ${f.dir === "row" ? "row" : "column"} (flex), so a ${what} typed here has no effect. <button type="button" onClick=${actions.sizeItMyself}>Size it myself</button></p>`;
}

// ── Position ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * How the alignment buttons align this element: a free element by its left / top in its parent (or the selection to each other);
 * in a flex box across its axis with align-self; along a column or the page flow with auto margins (mx-auto, ml-auto). Along a
 * flex row the parent places its children, so those buttons are faint.
 */
function alignPlan(s) {
    const abs = s.geom && s.geom.abs, lay = s.parentLayout;
    if (abs || (s.count || 1) > 1) return { x: "free", y: "free" };
    return {
        x: lay === "flex column" ? "self" : lay === "page flow" ? "margin" : null,
        y: lay === "flex row" ? "self" : null,
    };
}
function alignTo(s, actions, axis, where) {
    const how = alignPlan(s)[axis];
    if (how === "free") return actions.align(axis === "x" ? { start: "left", center: "hcenter", end: "right" }[where] : { start: "top", center: "vcenter", end: "bottom" }[where]);
    if (how === "self") return actions.setProp("align-self", { start: "flex-start", center: "center", end: "flex-end" }[where]);
    if (how === "margin") {
        // left: no auto margin; centre: both; right: the left one
        if (where === "start") { actions.resetProp("margin-left"); actions.resetProp("margin-right"); }
        if (where === "center") { actions.setProp("margin-left", "auto"); actions.setProp("margin-right", "auto"); }
        if (where === "end") { actions.setProp("margin-left", "auto"); actions.resetProp("margin-right"); }
    }
}
/** Which alignment the element has now, for the pressed button. */
function alignNow(s, axis) {
    const how = alignPlan(s)[axis];
    if (how === "self") { const v = comp(s, "align-self"); return v === "center" ? "center" : /end/.test(v) ? "end" : /start/.test(v) ? "start" : ""; }
    if (how === "margin") {
        const tok = (p) => (srcOf(s, p).token || "").replace(/^(?:[\w-]+:)*/, "");
        const l = /auto/.test(tok("margin-left")), r = /auto/.test(tok("margin-right"));
        return l && r ? "center" : l ? "end" : "";
    }
    return "";
}

const POSITIONS = [["static", "Static"], ["relative", "Relative"], ["absolute", "Absolute"], ["fixed", "Fixed"], ["sticky", "Sticky"]];
/** Absolute in or out goes through Free position, which keeps the element where it is on the page; the others are the CSS value. */
function setPosition(s, actions, v) {
    const now = comp(s, "position");
    if (v === now) return;
    if (v === "absolute") return actions.freePosition(true);
    if (now === "absolute" && v === "static") return actions.freePosition(false);
    if (v === "static" && owns(s, "position")) return actions.resetProp("position");
    return actions.setProp("position", v);
}

export function PositionSection({ s, actions }) {
    const g = s.geom || {}, abs = Boolean(g.abs), count = s.count || 1, plan = alignPlan(s);
    const btn = (axis, where, icon, title) => html`<${IconBtn} icon=${icon} title=${plan[axis] ? title : `${title} (set by the parent's layout)`} faint=${!plan[axis]}
        on=${alignNow(s, axis) === where} onClick=${() => alignTo(s, actions, axis, where)} />`;
    const flipped = (i) => { const v = comp(s, "scale").split(/\s+/); return parseFloat(v[i] ?? v[0]) < 0; };
    const flip = (i) => {
        const v = comp(s, "scale"), parts = v && v !== "none" ? v.split(/\s+/).map(Number) : [1, 1];
        const xy = [parts[0] ?? 1, parts[1] ?? parts[0] ?? 1];
        xy[i] = -xy[i];
        actions.setProp("scale", xy[0] === 1 && xy[1] === 1 ? "" : `${xy[0]} ${xy[1]}`);
    };
    const rot = Number(g.rot) || 0, pos = comp(s, "position") || "static";
    return html`<${FSection} title="Position">
        <${Sub}>Alignment</${Sub}>
        <div class="ibrow"><div class="ibg">${btn("x", "start", I.alignL, "Align left")}${btn("x", "center", I.alignC, "Align horizontal centres")}${btn("x", "end", I.alignR, "Align right")}</div>
            <div class="ibg">${btn("y", "start", I.alignT, "Align top")}${btn("y", "center", I.alignM, "Align vertical centres")}${btn("y", "end", I.alignB, "Align bottom")}</div></div>
        <${Sub}>Position</${Sub}>
        <div class="frow">
            <label class=${`nf ${has(s, "position") ? "" : "unset"} ${srcKind(s, "position") ? `src-${srcKind(s, "position")}` : ""}`} title=${`position · ${srcNote(s, "position")}`}>
                <select class="nfs wide" onChange=${(e) => setPosition(s, actions, e.target.value)}>
                    ${POSITIONS.map(([v, l]) => html`<option value=${v} selected=${pos === v}>${l}</option>`)}</select></label>
            <${PropField} s=${s} actions=${actions} p="z-index" label="Z" title="Stacking order (z-index)" list="dl-z" />
            <${IconBtn} icon=${I.free} on=${abs} title=${abs ? "Free position: on (absolute). Click to put it back in the layout" : "Free position: take it out of the layout (absolute), to place it anywhere"} onClick=${() => actions.freePosition(!abs)} />
        </div>
        ${pos === "static"
            ? html`<div class="frow">
                <${NumField} label="X" value=${num(g.x)} disabled title="Placed by the layout: give it a position (relative, absolute...) to move it with offsets" />
                <${NumField} label="Y" value=${num(g.y)} disabled title="Placed by the layout: give it a position (relative, absolute...) to move it with offsets" /></div>`
            : html`<div class="frow two2">
                <${PropField} s=${s} actions=${actions} p="left" label="L" title="left" list="dl-left" /><${PropField} s=${s} actions=${actions} p="top" label="T" title="top" list="dl-top" />
                <${PropField} s=${s} actions=${actions} p="right" label="R" title="right" list="dl-right" /><${PropField} s=${s} actions=${actions} p="bottom" label="B" title="bottom" list="dl-bottom" /></div>`}
        <${Sub}>Rotation</${Sub}>
        <div class="frow">
            <${NumField} label="∠" value=${String(rot)} set=${rot !== 0} title="Rotation in degrees" onCommit=${(t) => actions.setGeom("rot", t)}><span class="nfu">°</span></${NumField}>
            <div class="ibg">
                <${IconBtn} icon=${I.rot90} title="Rotate 90°" onClick=${() => actions.setGeom("rot", String((rot + 90) % 360))} />
                <${IconBtn} icon=${I.flipH} title="Flip horizontally" on=${flipped(0)} onClick=${() => flip(0)} />
                <${IconBtn} icon=${I.flipV} title="Flip vertically" on=${flipped(1)} onClick=${() => flip(1)} />
            </div>
        </div>
        ${count > 1 && html`<div class="fbtns">
            ${count > 2 && html`<button type="button" onClick=${() => actions.align("distribute-h")}>Space across</button><button type="button" onClick=${() => actions.align("distribute-v")}>Space down</button>`}
            <button type="button" title="Ctrl/Cmd+G" onClick=${actions.group}>Group</button>
            <button type="button" title="Shift+A: line them up in a row or column with even spacing" onClick=${actions.autoLayout}>Auto layout</button></div>`}
        ${count === 1 && (s.group || (abs && !s.leaf)) && html`<div class="fbtns"><button type="button" title="Ctrl/Cmd+Shift+G" onClick=${actions.ungroup}>Ungroup</button></div>`}
    </${FSection}>`;
}

// ── Layout ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** What the element lays its children out as: block (the page flow), row, column or grid. */
function layoutKind(s) {
    const d = comp(s, "display");
    if (/grid/.test(d)) return "grid";
    if (/flex/.test(d)) return /column/.test(comp(s, "flex-direction")) ? "col" : "row";
    return "block";
}
function setKind(s, actions, kind) {
    const now = layoutKind(s);
    if (kind === now) return;
    if (kind === "block") return owns(s, "display") ? actions.resetProp("display") : actions.setProp("display", "block");
    // stacked children made a row, column or grid keep their spacing (the gap takes over from their margins)
    if (now === "block" && s.arrange) return actions.arrange(kind);
    if (kind === "grid") return actions.setProp("display", "grid");
    if (now !== "row" && now !== "col") actions.setProp("display", "flex");
    actions.setProp("flex-direction", kind === "col" ? "column" : "row");
}

const POS = ["flex-start", "center", "flex-end"];
const posOf = (v) => (v === "center" ? 1 : /end/.test(v) ? 2 : 0);
/** Figma's alignment box: nine dots, one per place the children can sit; one click sets justify-content and align-items. */
function AlignBox({ s, actions, kind }) {
    const jc = comp(s, "justify-content"), ai = comp(s, "align-items");
    const between = /space-/.test(jc);
    const main = posOf(jc), cross = posOf(ai);
    const [col, row] = kind === "col" ? [cross, main] : [main, cross];
    const pick = (c, r) => {
        const [m, x] = kind === "col" ? [r, c] : [c, r];
        if (!between) actions.setProp("justify-content", POS[m]);
        actions.setProp("align-items", POS[x]);
    };
    return html`<div class="abox">${[0, 1, 2].map((r) => [0, 1, 2].map((c) => html`<button type="button"
        class=${`ad ${(between ? (kind === "col" ? c === col : r === row) : c === col && r === row) ? "on" : ""}`} title=${`${["Top", "Middle", "Bottom"][r]} ${["left", "centre", "right"][c]}`}
        onClick=${() => pick(c, r)}><i></i></button>`))}</div>`;
}

/** Fixed (a size), Hug (fit its content) or Fill (the space its parent gives), as Figma sizes a layer. */
function sizing(s, axis) {
    const p = axis === "w" ? "width" : "height", lay = s.parentLayout;
    const alongFlex = (lay === "flex row" && axis === "w") || (lay === "flex column" && axis === "h");
    if (alongFlex && parseFloat(comp(s, "flex-grow")) > 0) return "fill";
    const tok = (srcOf(s, p).token || "").replace(/^(?:[\w-]+:)*/, "");
    const inl = owns(s, p) ? shownOf(s, p, srcOf(s, p)) : "";
    if (/^(w|h)-(full|screen)$/.test(tok) || /^100%$/.test(inl)) return "fill";
    if (/^(w|h)-(fit|auto|min|max)$/.test(tok) || /content|auto/.test(inl)) return "hug";
    if (owns(s, p)) return "fixed";
    // nothing sets it: a block in the flow fills the width, everything else hugs
    if (axis === "w" && lay === "page flow" && !/inline/.test(comp(s, "display"))) return "fill";
    if (axis === "w" && lay === "flex column" && /stretch|normal/.test(comp(s, "align-self") === "auto" ? "stretch" : comp(s, "align-self"))) return "fill";
    return "hug";
}
function setSizing(s, actions, axis, mode) {
    const p = axis === "w" ? "width" : "height", lay = s.parentLayout;
    const alongFlex = (lay === "flex row" && axis === "w") || (lay === "flex column" && axis === "h");
    const px = axis === "w" ? s.geom.w : s.geom.h;
    if (mode !== "fill" && alongFlex && parseFloat(comp(s, "flex-grow")) > 0) actions.resetProp("flex-grow");
    if (mode === "fixed") return actions.setGeom(axis, String(Math.round(px)));
    if (mode === "hug") return actions.setProp(p, "fit", "fit-content");
    if (alongFlex) { if (owns(s, p)) actions.resetProp(p); return actions.setProp("flex-grow", "1"); }
    return actions.setProp(p, "full", "100%");
}
const SIZING = [["fixed", "Fixed"], ["hug", "Hug"], ["fill", "Fill"]];
function SizeField({ s, actions, axis }) {
    const mode = sizing(s, axis), p = axis === "w" ? "width" : "height";
    const commit = (t) => {
        const r = ratioOf(s), n = Number(t);
        if (axis === "h" && r && Number.isFinite(n) && n > 0) return actions.setGeom("w", String(Math.round(n * r))); // locked: H moves W, the ratio does the rest
        return actions.setGeom(axis, t);
    };
    return html`<${NumField} label=${axis === "w" ? "W" : "H"} value=${num(axis === "w" ? s.geom.w : s.geom.h)} set=${has(s, p) || (mode === "fill" && has(s, "flex-grow")) || (axis === "h" && Boolean(ratioOf(s)))}
        src=${srcKind(s, p)} title=${`${p}: ${mode} · ${srcNote(s, p)}`} onCommit=${commit}>
        <select class="nfs" title="Fixed, Hug contents or Fill container" onChange=${(e) => setSizing(s, actions, axis, e.target.value)}>
            ${SIZING.map(([v, l]) => html`<option value=${v} selected=${mode === v}>${l}</option>`)}</select></${NumField}>`;
}

/** The width-to-height ratio the element is locked to (its aspect-ratio), or 0 when it is not. */
function ratioOf(s) {
    const v = comp(s, "aspect-ratio");
    if (!v || v === "auto") return 0;
    const m = v.match(/([\d.]+)\s*(?:\/\s*([\d.]+))?/);
    return m ? Number(m[1]) / Number(m[2] || 1) : 0;
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/**
 * Lock the ratio: the element gets an aspect-ratio of its size now (aspect-video, aspect-square, aspect-[4/3]) and its height
 * comes off, so the ratio sets it: a new width keeps the shape, here and in the page. Unlocked, the height it has is written back.
 */
function toggleRatio(s, actions) {
    const w = Math.round(s.geom.w), h = Math.round(s.geom.h);
    if (ratioOf(s)) {
        actions.setGeom("h", String(h));
        if (owns(s, "aspect-ratio")) actions.resetProp("aspect-ratio"); else actions.setProp("aspect-ratio", "auto");
        return;
    }
    if (!w || !h) return;
    const d = gcd(w, h);
    actions.setProp("aspect-ratio", `${w / d} / ${h / d}`);
    if (owns(s, "height")) actions.resetProp("height");
}

/** A property as a Figma field: what the element sets, else its computed value, faint; marked with where it comes from, × to remove it. */
export const PropField = ({ s, actions, p, label, title, list }) => {
    const shown = shownOf(s, p, srcOf(s, p)), n = num(shown);
    // a number shows as one (24px -> 24), a word or a Tailwind value as itself (auto, 2xl, 1/2)
    const value = /^-?[\d.]+(px)?$/.test(shown) ? n : shown;
    return html`<${NumField} label=${label} title=${`${title || p} · ${srcNote(s, p)}`} value=${value} list=${list}
        set=${has(s, p)} src=${srcKind(s, p)} onReset=${owns(s, p) ? () => actions.resetProp(p) : null} onCommit=${(t) => actions.setProp(p, t)} />`;
};
/** A choice of CSS values as a Figma field: the current one picked, faint when only a default gives it, × to remove a set one. */
export const PropSelect = ({ s, actions, p, label, title, options }) => {
    const v = comp(s, p), opts = options.some(([o]) => o === v) || !v ? options : [[v, v], ...options];
    return html`<label class=${`nf ${has(s, p) ? "" : "unset"} ${srcKind(s, p) ? `src-${srcKind(s, p)}` : ""}`} title=${`${title || p} · ${srcNote(s, p)}`}>
        ${label && html`<span class="nfl">${label}</span>`}<select class="nfs wide" onChange=${(e) => actions.setProp(p, e.target.value)}>
            ${opts.map(([o, l]) => html`<option value=${o} selected=${o === v}>${l}</option>`)}</select>
        ${owns(s, p) && html`<button type="button" class="nfx" title="Remove this value" onClick=${(e) => { e.preventDefault(); actions.resetProp(p); }}>×</button>`}</label>`;
};

const MORE = [["min-width", "Min W", "dl-minW"], ["max-width", "Max W", "dl-maxW"], ["min-height", "Min H", "dl-minH"], ["max-height", "Max H", "dl-maxH"]];

const DISPLAYS = [["block", "Block"], ["flex", "Flex"], ["grid", "Grid"], ["inline-block", "Inline block"], ["inline", "Inline"], ["inline-flex", "Inline flex"], ["inline-grid", "Inline grid"], ["flow-root", "Flow root"], ["contents", "Contents"], ["none", "Hidden (none)"]];
const JUSTIFY = [["flex-start", "Start"], ["center", "Center"], ["flex-end", "End"], ["space-between", "Space between"], ["space-around", "Space around"], ["space-evenly", "Space evenly"], ["stretch", "Stretch"], ["normal", "Normal"]];
const ALIGN = [["stretch", "Stretch"], ["flex-start", "Start"], ["center", "Center"], ["flex-end", "End"], ["baseline", "Baseline"], ["normal", "Normal"]];
const OVERFLOW = [["visible", "Visible"], ["hidden", "Hidden (clip)"], ["auto", "Scroll when needed"], ["scroll", "Always scroll"], ["clip", "Clip"]];

/** A Tailwind class group as a Figma field (space-x, grid rows, order...): its value at the panel's breakpoint, × to take it off. */
export const TwField = ({ s, k, label, title, actions }) => {
    const v = val(s, k, useUi());
    return html`<${NumField} label=${label} title=${`${title || k}${v ? "" : " (Tailwind class)"}`} value=${v} placeholder="–" list=${`dl-${PRESETS[k] ? k : "spacing"}`}
        set=${Boolean(v)} src=${v ? "tw" : ""} onReset=${v ? () => actions.applyValue(k, "") : null} onCommit=${(t) => actions.applyValue(k, t.trim())} />`;
};
/** A Tailwind class group with a fixed set of values, as a Figma field. */
export const TwSelect = ({ s, k, label, title, actions }) => {
    const v = val(s, k, useUi());
    return html`<label class=${`nf ${v ? "src-tw" : "unset"}`} title=${title || k}>${label && html`<span class="nfl">${label}</span>`}
        <select class="nfs wide" onChange=${(e) => actions.applyValue(k, e.target.value)}><option value="" selected=${!v}>–</option>
            ${(OPTS[k] || []).map(([o, l]) => html`<option value=${o} selected=${o === v}>${l}</option>`)}</select>
        ${v && html`<button type="button" class="nfx" title="Remove this class" onClick=${(e) => { e.preventDefault(); actions.applyValue(k, ""); }}>×</button>`}</label>`;
};

export function LayoutSection({ s, actions }) {
    const [sides, setSides] = useState(false);
    const [more, setMore] = useState(false);
    const ui = useUi();
    const kind = layoutKind(s), flex = kind === "row" || kind === "col", display = comp(s, "display");
    const k = (v, icon, title) => html`<${IconBtn} icon=${icon} title=${title} on=${kind === v && !/inline|none|contents/.test(display)} onClick=${() => setKind(s, actions, v)} />`;
    const pad = (a, b) => { const x = comp(s, a), y = comp(s, b); return x === y ? num(x) : "Mixed"; };
    const padSet = (a, b) => has(s, a) || has(s, b);
    const padSrc = (a, b) => srcKind(s, a) || srcKind(s, b);
    const between = /space-/.test(comp(s, "justify-content"));
    const wrapOn = /^wrap/.test(comp(s, "flex-wrap")), reverse = /reverse/.test(comp(s, "flex-direction"));
    const twoGaps = kind === "grid" || wrapOn;
    const shownMore = MORE.filter(([p]) => more || has(s, p)); // set ones always show; the rest behind +
    const stack = kind === "block" && !s.leaf; // children stacked in the flow: space-x / space-y can space them
    const spacing = stack && (more || val(s, "spaceX", ui) || val(s, "spaceY", ui));
    return html`<${FSection} title="Layout" extra=${html`<${IconBtn} icon=${I.plus} on=${more} title=${more ? "Fewer settings" : "Min and max size, space between children"} onClick=${() => setMore(!more)} />`}>
        <div class="frow"><div class="ibg wide">${k("block", I.block, "Block: children stack in the page flow")}${k("row", I.row, "Row (flex)")}${k("col", I.col, "Column (flex)")}${k("grid", I.grid, "Grid")}</div>
            <label class=${`nf disp ${has(s, "display") ? "" : "unset"} ${srcKind(s, "display") ? `src-${srcKind(s, "display")}` : ""}`} title=${`display · ${srcNote(s, "display")}`}>
                <select class="nfs wide" onChange=${(e) => actions.setProp("display", e.target.value)}>
                    ${DISPLAYS.map(([v, l]) => html`<option value=${v} selected=${display === v}>${l}</option>`)}</select></label></div>
        ${flex && html`<div class="lgrid">
            <${AlignBox} s=${s} actions=${actions} kind=${kind} />
            <div class="lcol">
                ${twoGaps ? html`<div class="frow"><${PropField} s=${s} actions=${actions} p="column-gap" label="↔" title="Gap between columns" list="dl-gap" /><${PropField} s=${s} actions=${actions} p="row-gap" label="↕" title="Gap between rows" list="dl-gap" /></div>`
                    : html`<${NumField} label=${kind === "col" ? "↕" : "↔"} title="Gap between children" value=${between ? "Auto" : num(comp(s, kind === "col" ? "row-gap" : "column-gap"))} list="dl-gap"
                        set=${has(s, "gap") || has(s, kind === "col" ? "row-gap" : "column-gap")} src=${srcKind(s, "gap")} onReset=${owns(s, "gap") ? () => actions.resetProp("gap") : null} onCommit=${(t) => actions.setProp("gap", t)} />`}
                <div class="ibg">
                    <${IconBtn} icon=${I.between} on=${between} title=${between ? "Space between: on" : "Space between the children (justify-between)"} onClick=${() => actions.setProp("justify-content", between ? "flex-start" : "space-between")} />
                    <${IconBtn} icon=${I.wrap} on=${wrapOn} title=${wrapOn ? "Wrap: on" : "Wrap onto more lines"} onClick=${() => actions.setProp("flex-wrap", wrapOn ? "nowrap" : "wrap")} />
                    <${IconBtn} icon=${I.reverse} on=${reverse} title=${reverse ? "Reversed: on" : "Reverse the order (row-reverse / column-reverse)"} onClick=${() => actions.setProp("flex-direction", `${kind === "col" ? "column" : "row"}${reverse ? "" : "-reverse"}`)} />
                </div>
            </div></div>
            <div class="frow"><${PropSelect} s=${s} actions=${actions} p="justify-content" label="Justify" options=${JUSTIFY} /><${PropSelect} s=${s} actions=${actions} p="align-items" label="Align" options=${ALIGN} /></div>`}
        ${kind === "grid" && html`<div class="frow two2">
            <${PropField} s=${s} actions=${actions} p="grid-template-columns" label="Cols" title="Columns (a number, or a template)" list="dl-gridCols" />
            <${TwField} s=${s} k="gridRows" label="Rows" title="Rows (grid-rows-*)" actions=${actions} />
            <${PropField} s=${s} actions=${actions} p="column-gap" label="↔" title="Gap between columns" list="dl-gap" />
            <${PropField} s=${s} actions=${actions} p="row-gap" label="↕" title="Gap between rows" list="dl-gap" /></div>
            <div class="frow"><${PropSelect} s=${s} actions=${actions} p="justify-items" label="Justify" options=${[["stretch", "Stretch"], ["start", "Start"], ["center", "Center"], ["end", "End"]]} /><${PropSelect} s=${s} actions=${actions} p="align-items" label="Align" options=${ALIGN} /></div>`}
        ${spacing && html`<div class="frow two2"><${TwField} s=${s} k="spaceX" label="↔" title="Space between children across (space-x-*)" actions=${actions} /><${TwField} s=${s} k="spaceY" label="↕" title="Space between children down (space-y-*)" actions=${actions} /></div>`}
        <${Sub}>Padding</${Sub}>
        ${sides ? html`<div class="frow four">
                <${PropField} s=${s} actions=${actions} p="padding-left" label="L" list="dl-p" /><${PropField} s=${s} actions=${actions} p="padding-top" label="T" list="dl-p" />
                <${PropField} s=${s} actions=${actions} p="padding-right" label="R" list="dl-p" /><${PropField} s=${s} actions=${actions} p="padding-bottom" label="B" list="dl-p" />
                <${IconBtn} icon=${I.sides} on title="One value per axis" onClick=${() => setSides(false)} /></div>`
            : html`<div class="frow">
                <${NumField} label="↔" title="Left and right padding" value=${pad("padding-left", "padding-right")} set=${padSet("padding-left", "padding-right")} src=${padSrc("padding-left", "padding-right")} list="dl-p"
                    onCommit=${(t) => actions.setProps(["padding-left", "padding-right"], t, "px", ["pl", "pr"])} />
                <${NumField} label="↕" title="Top and bottom padding" value=${pad("padding-top", "padding-bottom")} set=${padSet("padding-top", "padding-bottom")} src=${padSrc("padding-top", "padding-bottom")} list="dl-p"
                    onCommit=${(t) => actions.setProps(["padding-top", "padding-bottom"], t, "py", ["pt", "pb"])} />
                <${IconBtn} icon=${I.sides} title="Each side on its own" onClick=${() => setSides(true)} /></div>`}
        ${s.tag !== "body" && html`<${Sub}>Size</${Sub}>
        <${FlexNote} s=${s} actions=${actions} />
        <div class="frow"><${SizeField} s=${s} actions=${actions} axis="w" /><${SizeField} s=${s} actions=${actions} axis="h" />
            <${IconBtn} icon=${ratioOf(s) ? I.lock : I.unlock} on=${Boolean(ratioOf(s))} title=${ratioOf(s) ? `Ratio locked (${comp(s, "aspect-ratio")}): click to unlock` : "Lock the aspect ratio: it keeps its shape when the width changes"}
                onClick=${() => toggleRatio(s, actions)} /></div>`}
        ${shownMore.length > 0 && html`<div class="frow two2">${shownMore.map(([p, l, list]) => html`<${PropField} s=${s} actions=${actions} p=${p} label=${l} list=${list} />`)}</div>`}
        <div class="frow"><${PropSelect} s=${s} actions=${actions} p="overflow" label="Overflow" title="What happens to content bigger than the box" options=${OVERFLOW} /></div>
    </${FSection}>`;
}

// ── Flex / grid item: how this element sits in its parent's flex or grid ─────────────────────────────────────────────────────
const SELF = [["auto", "Auto (parent's)"], ["flex-start", "Start"], ["center", "Center"], ["flex-end", "End"], ["stretch", "Stretch"], ["baseline", "Baseline"]];
export function ItemSection({ s, actions }) {
    const lay = s.parentLayout, abs = s.geom && s.geom.abs;
    if (abs || !(lay === "flex row" || lay === "flex column" || lay === "grid")) return null;
    const grow = parseFloat(comp(s, "flex-grow")) > 0, shrink = parseFloat(comp(s, "flex-shrink")) > 0;
    const flex = lay !== "grid";
    return html`<${FSection} title=${flex ? "Flex item" : "Grid item"}>
        ${flex && html`<div class="frow">
            <div class="ibg wide">
                <button type="button" class=${`ib txt ${grow ? "on" : ""}`} title=${grow ? "Grows to fill the free space (grow): click to stop" : "Grow to fill the free space (grow)"} onClick=${() => actions.setProp("flex-grow", grow ? "0" : "1")}>Grow</button>
                <button type="button" class=${`ib txt ${shrink ? "on" : ""}`} title=${shrink ? "Shrinks when there is no room (the default): click to keep its size (shrink-0)" : "Doesn't shrink (shrink-0): click to let it shrink"} onClick=${() => actions.applyValue("shrink", shrink ? "shrink-0" : "")}>Shrink</button>
            </div>
            <${PropField} s=${s} actions=${actions} p="flex-basis" label="Basis" title="Its starting size along the row or column (flex-basis)" /></div>`}
        <div class="frow"><${PropSelect} s=${s} actions=${actions} p="align-self" label="Self" title="Where it sits across the line, on its own (align-self)" options=${SELF} />
            <${TwField} s=${s} k="order" label="Order" title="Order among its siblings (order-*)" actions=${actions} /></div>
        ${!flex && html`<div class="frow two2"><${TwField} s=${s} k="colSpan" label="Cols" title="Columns it spans (col-span-*)" actions=${actions} /><${TwField} s=${s} k="rowSpan" label="Rows" title="Rows it spans (row-span-*)" actions=${actions} /></div>`}
    </${FSection}>`;
}
