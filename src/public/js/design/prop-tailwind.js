// The Properties panel works in CSS properties (width, background-color...). When an edit goes to Tailwind, this turns the
// property and the typed value into a class group of class-groups.js and the value to build it with. Anything without a
// clean Tailwind form (a transform, a filter, a font stack) returns null, and the edit is written as CSS instead.
import { GROUPS, parseToken } from "./class-groups.js";

const same = (prefix) => (v) => `${prefix}${v}`;
const pick = (map) => (v) => map[v] || null;

// properties whose values are words: CSS value -> the whole Tailwind class
const WORDS = {
    display: ["display", pick({ block: "block", "inline-block": "inline-block", inline: "inline", flex: "flex", "inline-flex": "inline-flex", grid: "grid", "inline-grid": "inline-grid", contents: "contents", none: "hidden", table: "table", "flow-root": "flow-root" })],
    position: ["position", pick({ static: "static", relative: "relative", absolute: "absolute", fixed: "fixed", sticky: "sticky" })],
    overflow: ["overflow", same("overflow-")],
    "flex-direction": ["flexDir", pick({ row: "flex-row", column: "flex-col", "row-reverse": "flex-row-reverse", "column-reverse": "flex-col-reverse" })],
    "flex-wrap": ["flexWrap", same("flex-")],
    "justify-content": ["justify", pick({ "flex-start": "justify-start", start: "justify-start", center: "justify-center", "flex-end": "justify-end", end: "justify-end", "space-between": "justify-between", "space-around": "justify-around", "space-evenly": "justify-evenly", stretch: "justify-stretch", normal: "justify-normal" })],
    "align-items": ["items", pick({ "flex-start": "items-start", start: "items-start", center: "items-center", "flex-end": "items-end", end: "items-end", baseline: "items-baseline", stretch: "items-stretch" })],
    "text-align": ["textAlign", same("text-")],
    "text-decoration-line": ["textDecoration", pick({ none: "no-underline", underline: "underline", "line-through": "line-through", overline: "overline" })],
    "text-transform": ["textTransform", pick({ none: "normal-case", uppercase: "uppercase", lowercase: "lowercase", capitalize: "capitalize" })],
    "font-style": ["fontStyle", pick({ italic: "italic", normal: "not-italic" })],
    "white-space": ["whitespace", same("whitespace-")],
    "font-weight": ["fontWeight", (v) => ({ 100: "font-thin", 200: "font-extralight", 300: "font-light", 400: "font-normal", 500: "font-medium", 600: "font-semibold", 700: "font-bold", 800: "font-extrabold", 900: "font-black" })[v] || (/^font-/.test(v) ? v : `font-${v}`)],
    "font-family": ["fontFamily", pick({ "font-sans": "font-sans", sans: "font-sans", "sans-serif": "font-sans", serif: "font-serif", "font-serif": "font-serif", mono: "font-mono", monospace: "font-mono", "font-mono": "font-mono" })],
    "background-size": ["bgSize", same("bg-")],
    "background-repeat": ["bgRepeat", same("bg-")],
    "border-top-style": ["borderStyle", same("border-")],
    cursor: ["cursor", same("cursor-")],
    "mix-blend-mode": ["mixBlend", same("mix-blend-")],
    "pointer-events": ["pointerEvents", same("pointer-events-")],
    "object-fit": ["objectFit", same("object-")],
    "box-shadow": ["shadow", (v) => (/^(sm|md|lg|xl|2xl|inner|none)$/.test(v) ? `shadow-${v}` : v === "default" || v === "shadow" ? "shadow" : null)],
};

// properties whose values are sizes: the group, and whether a negative value is allowed
const LENGTHS = {
    width: "w", height: "h", "min-width": "minW", "max-width": "maxW", "min-height": "minH", "max-height": "maxH",
    gap: "gap", top: "top", right: "right", bottom: "bottom", left: "left",
    "padding-top": "pt", "padding-right": "pr", "padding-bottom": "pb", "padding-left": "pl",
    "margin-top": "mt", "margin-right": "mr", "margin-bottom": "mb", "margin-left": "ml",
    "font-size": "fontSize", "line-height": "leading", "letter-spacing": "tracking", "border-radius": "radius", "z-index": "z",
};
const COLORS = { color: "textColor", "background-color": "bgColor", "border-top-color": "borderColor" };
const LENGTH_WORDS = /^(auto|full|screen|min|max|fit|px|none|xs|sm|md|lg|xl|[2-9]xl|base|prose|tight|snug|normal|relaxed|loose|tighter|wide|wider|widest|\d+\/\d+)$/;

/** The class group a property is written with in Tailwind, or null when it has none. */
export function groupOf(prop) {
    if (WORDS[prop]) return WORDS[prop][0];
    if (LENGTHS[prop]) return LENGTHS[prop];
    if (COLORS[prop]) return COLORS[prop];
    if (prop === "border-top-width") return "borderWidth";
    if (prop === "opacity") return "opacity";
    if (prop === "grid-template-columns") return "gridCols";
    return null;
}

/**
 * The value to hand setGroup() for this property, or null to write CSS instead.
 * `scale`: on a row a Tailwind class already drives, a bare number is Tailwind's scale (w-64); elsewhere it means pixels.
 */
export function twValue(prop, raw, scale) {
    const v = String(raw).trim();
    if (!v) return null;
    if (WORDS[prop]) return WORDS[prop][1](v);
    if (LENGTHS[prop]) {
        if (LENGTH_WORDS.test(v) || /^\[.*\]$/.test(v)) return v;
        if (/^-?\d*\.?\d+$/.test(v)) return scale || prop === "z-index" ? v : `${v}px`;
        if (/^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch)$/.test(v) || /^(calc|var|min|max|clamp)\(/.test(v)) return v; // the group wraps it as [value]
        return null;
    }
    if (COLORS[prop]) {
        if (/^(#|rgba?\(|hsla?\()/.test(v)) return v;
        if (/^(black|white|transparent|current|inherit)$/.test(v) || /^[a-z]+-\d{2,3}(\/\d+)?$/.test(v)) return v;
        return null;
    }
    if (prop === "border-top-width") { const n = v.replace(/px$/, ""); return /^(0|1|2|4|8)$/.test(n) ? n : /^\d+(\.\d+)?(px)?$/.test(v) ? `${n}px` : null; }
    if (prop === "opacity") { const n = Number(v); return !Number.isFinite(n) ? null : n <= 1 && !scale ? String(Math.round(n * 100)) : String(Math.round(n)); }
    if (prop === "grid-template-columns") return /^\d+$/.test(v) || v === "none" ? v : null;
    return null;
}

/** What a Tailwind-driven row shows: the class's own value (64, 1/2, red-500, 500px), not the computed pixels. */
export function twShown(prop, token) {
    const key = groupOf(prop);
    if (!key || !token) return null;
    const m = parseToken(token).base.match(GROUPS[key].re);
    if (!m) return null;
    const v = GROUPS[key].read(m);
    return String(v).replace(/^\[(.*)\]$/, "$1").replace(/_/g, " ");
}

/** "md:hover:w-64" -> "md:hover:" */
export const variantOf = (token) => (token ? parseToken(token).variant : "");
