// What the Properties panel draws from: the data tables behind its controls (suggestions, options, tags), small selectors
// that read the selection and the panel's state (panel-state.js), and inspectorView, which says what the panel shows. The
// components themselves are in panel.js, design-tab.js, figma-sections.js, prop-sections.js, extras-section.js and classes-section.js.
import { HUES, SHADES, SPECIAL_COLORS, STEPS, SIZES, MAX_W, GROUPS, getGroup, parseToken } from "@windcraft/core/class-groups.js";
import { twShown } from "@windcraft/core/prop-tailwind.js";
import { panelStore } from "./panel-state.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TEXT_SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
const RADII = ["none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];
const PCT = ["0", "5", "10", "20", "25", "30", "40", "50", "60", "70", "75", "80", "90", "95", "100"];
const DEGS = ["0", "1", "2", "3", "6", "12", "45", "90", "180"];
const MS = ["0", "75", "100", "150", "200", "300", "500", "700", "1000"];

// suggestions for the free-type inputs (any value, including [arbitrary], is accepted)
export const PRESETS = {
    w: SIZES, h: SIZES, minW: ["0", "full", "min", "max", "fit"], minH: ["0", "full", "screen", "min", "max", "fit"], maxW: MAX_W, maxH: ["none", "full", "screen", "min", "max", "fit"],
    gap: STEPS, gapX: STEPS, gapY: STEPS, spaceX: STEPS, spaceY: STEPS, z: ["0", "10", "20", "30", "40", "50", "auto"], order: ["first", "last", "none", "1", "2", "3"],
    gridCols: ["1", "2", "3", "4", "5", "6", "12", "none"], gridRows: ["1", "2", "3", "4", "5", "6", "none"], colSpan: ["1", "2", "3", "4", "6", "full"], rowSpan: ["1", "2", "3", "full"],
    inset: [...STEPS, "auto", "full"], top: [...STEPS, "auto", "full"], right: [...STEPS, "auto", "full"], bottom: [...STEPS, "auto", "full"], left: [...STEPS, "auto", "full"],
    fontSize: TEXT_SIZES, leading: ["none", "tight", "snug", "normal", "relaxed", "loose", "4", "5", "6", "7", "8", "9", "10"], tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"], lineClamp: ["1", "2", "3", "4", "5", "6", "none"],
    borderWidth: ["0", "1", "2", "4", "8"], borderT: ["0", "2", "4", "8"], borderR: ["0", "2", "4", "8"], borderB: ["0", "2", "4", "8"], borderL: ["0", "2", "4", "8"],
    radius: ["default", ...RADII], radiusTL: RADII, radiusTR: RADII, radiusBR: RADII, radiusBL: RADII, ring: ["0", "1", "2", "4", "8"],
    opacity: PCT, brightness: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"], rotate: DEGS, scale: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150"],
    translateX: [...STEPS, "full", "1/2"], translateY: [...STEPS, "full", "1/2"], duration: MS, delay: MS,
    spacing: STEPS,
};
for (const k of ["p", "px", "py", "pt", "pr", "pb", "pl"]) PRESETS[k] = STEPS;
for (const k of ["m", "mx", "my", "mt", "mr", "mb", "ml"]) PRESETS[k] = [...STEPS, "auto"];

const en = (prefix, list) => list.map((v) => [`${prefix}${v}`, v]);
export const OPTS = {
    display: ["block", "inline-block", "inline", "flex", "inline-flex", "grid", "inline-grid", "contents", "hidden"].map((v) => [v, v]),
    position: ["static", "relative", "absolute", "fixed", "sticky"].map((v) => [v, v]),
    overflow: en("overflow-", ["auto", "hidden", "visible", "scroll", "clip"]),
    overflowX: en("overflow-x-", ["auto", "hidden", "visible", "scroll", "clip"]),
    overflowY: en("overflow-y-", ["auto", "hidden", "visible", "scroll", "clip"]),
    visibility: [["visible", "visible"], ["invisible", "invisible"]],
    flexWrap: en("flex-", ["wrap", "nowrap", "wrap-reverse"]),
    justify: en("justify-", ["start", "center", "end", "between", "around", "evenly", "stretch"]),
    items: en("items-", ["start", "center", "end", "stretch", "baseline"]),
    content: en("content-", ["start", "center", "end", "between", "around", "evenly", "stretch"]),
    self: en("self-", ["auto", "start", "center", "end", "stretch", "baseline"]),
    flexNum: en("flex-", ["1", "auto", "initial", "none"]),
    objectFit: en("object-", ["contain", "cover", "fill", "none", "scale-down"]),
    fontFamily: en("font-", ["sans", "serif", "mono"]),
    fontWeight: en("font-", ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"]),
    textOverflow: [["truncate", "truncate"], ["text-ellipsis", "ellipsis"], ["text-clip", "clip"]],
    whitespace: en("whitespace-", ["normal", "nowrap", "pre", "pre-line", "pre-wrap"]),
    bgImage: [...en("bg-gradient-to-", ["t", "tr", "r", "br", "b", "bl", "l", "tl"]).map(([v, l]) => [v, "gradient " + l]), ["bg-none", "none"]],
    bgSize: en("bg-", ["auto", "cover", "contain"]),
    bgPosition: en("bg-", ["center", "top", "right", "bottom", "left", "left-top", "left-bottom", "right-top", "right-bottom"]),
    bgRepeat: en("bg-", ["repeat", "no-repeat", "repeat-x", "repeat-y"]),
    borderStyle: en("border-", ["solid", "dashed", "dotted", "double", "none"]),
    shadow: [["default", "default"], ...["sm", "md", "lg", "xl", "2xl", "inner", "none"].map((v) => [v, v])],
    blur: [["default", "default"], ...["none", "sm", "md", "lg", "xl", "2xl", "3xl"].map((v) => [v, v])],
    backdropBlur: [["default", "default"], ...["none", "sm", "md", "lg", "xl", "2xl", "3xl"].map((v) => [v, v])],
    grayscale: [["100", "full"], ["0", "off"]],
    mixBlend: en("mix-blend-", ["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference"]),
    transition: [["default", "default"], ...["none", "all", "colors", "opacity", "shadow", "transform"].map((v) => [v, v])],
    ease: en("ease-", ["linear", "in", "out", "in-out"]),
    cursor: en("cursor-", ["pointer", "default", "text", "move", "not-allowed", "wait", "grab", "grabbing", "crosshair", "help"]),
    pointerEvents: en("pointer-events-", ["none", "auto"]),
    userSelect: en("select-", ["none", "text", "all", "auto"]),
    textTransform: [["uppercase", "UPPER"], ["lowercase", "lower"], ["capitalize", "Title"], ["normal-case", "Normal"]],
};

const CSS_PROPS = ["background", "background-image", "background-color", "border", "border-radius", "box-shadow", "color", "cursor", "display", "filter", "font-family", "font-size", "font-weight", "gap", "grid-template-columns", "height", "justify-content", "letter-spacing", "line-height", "margin", "max-width", "min-height", "mix-blend-mode", "object-fit", "opacity", "outline", "overflow", "padding", "position", "text-align", "text-shadow", "transform", "transition", "width", "z-index", "backdrop-filter", "clip-path", "aspect-ratio", "animation", "-webkit-text-stroke", "scroll-snap-type"];

const DATALISTS = Object.entries(PRESETS).map(([k, list]) => `<datalist id="dl-${k}">${list.map((v) => `<option value="${esc(v)}"></option>`).join("")}</datalist>`).join("") +
    `<datalist id="dl-colors">${[...SPECIAL_COLORS, ...HUES.flatMap((h) => SHADES.map((s) => `${h}-${s}`))].map((v) => `<option value="${v}"></option>`).join("")}</datalist>` +
    `<datalist id="dl-fonts">${["system-ui", "Inter", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "monospace", "sans-serif", "serif"].map((v) => `<option value="${v}"></option>`).join("")}</datalist>` + `<datalist id="dl-cssprops">${CSS_PROPS.map((v) => `<option value="${v}"></option>`).join("")}</datalist>`;

export function mountDatalists() {
    const d = document.createElement("div");
    d.hidden = true;
    d.innerHTML = DATALISTS;
    document.body.appendChild(d);
}

// ── Selectors: what the selection looks like at the panel's breakpoint and state ──────────────────────────────────────────
// `ui` is the panel's state; left out, it is the store's current one (the editor), components pass the one they were drawn from.
/** The prefix new Tailwind classes get: "md:hover:", or "" for none. */
export const variant = (ui = panelStore.get()) => `${ui.bp ? ui.bp + ":" : ""}${ui.st ? ui.st + ":" : ""}`;
/** The value of a class group on the selection at that breakpoint and state, or "". */
export const val = (sel, k, ui = panelStore.get()) => { const r = getGroup(sel.classes, k, variant(ui)); return r ? r.value : ""; };
export const splitOpacity = (v) => { const m = String(v).match(/^(.*?)(?:\/(\d+))?$/); return [m[1], m[2] || ""]; };

const tokensOf = (s) => String(s.classes || "").split(/\s+/).filter(Boolean);
const isUtility = (tok) => { const base = parseToken(tok).base; return Object.keys(GROUPS).some((k) => GROUPS[k].re.test(base)); };

/** Whether a property nothing sets yet is written as a Tailwind class or as CSS: Tailwind, except on elements styled only by their design's own CSS. */
export function modeFor(s, ui = panelStore.get()) {
    if (s.added) return "tailwind";
    const toks = tokensOf(s);
    if (toks.length) return toks.some(isUtility) ? "tailwind" : "css";
    return ui.docTailwind ? "tailwind" : "css";
}

export const srcOf = (s, p) => ((s && s.sources) || {})[p] || { source: "default" };
export const ownsValue = (src) => src.source === "tailwind" || src.source === "inline";
/** Whether the element's own styling gives the value (a class, its style attribute, the design's CSS): drawn solid; else faint. */
export const styled = (src) => ["tailwind", "inline", "design"].includes(src.source) || (src.source === "tie" && Boolean(src.token));
/** What a row shows: the class's own value on a Tailwind row (64, 1/2, red-500), the computed value otherwise. */
export const shownOf = (s, p, src) => (src.source === "tailwind" && twShown(p, src.token)) || (s.computed || {})[p] || "";


// the tags the element can validly become (the frame works them out from where it sits and what it holds), grouped by kind
export const TAG_KINDS = [["Layout", /^(div|section|article|aside|header|footer|nav|main|form|figure|blockquote)$/], ["Text", /^(p|h[1-6]|span|label|strong|em|small|b|i|u|s|code|mark|pre)$/], ["Action", /^(a|button)$/], ["List", /^(ul|ol|li|menu)$/], ["Table", /^(td|th|thead|tbody|tfoot)$/], ["Definition", /^(dt|dd)$/]];
export const EXTRA_KEYS = ["bgImage", "gradFrom", "gradVia", "gradTo", "ring", "ringColor", "spaceX", "spaceY", "gridRows", "colSpan", "rowSpan", "order", "self", "flexNum", "grow", "lineClamp", "rotate", "scale", "translateX", "translateY", "transition", "duration", "delay", "ease", "blur", "backdropBlur", "brightness", "grayscale", "userSelect"];

/**
 * What the panel shows, for panel.js: one of
 *  - page: the page's info (pageInfo() in editor.js), when no element is selected;
 *  - design: { key, s }, the Design tab;
 *  - code: { key, path, source, indent, s }, the Code tab: the element's own code, then its classes, inline CSS and attributes;
 *  - classes: { key, s }, the same without the element's own code (the page body has none);
 *  - ai: { key, path, outer }, the AI tab.
 * `key` is the element's path: the panel gives each element fresh fields. `elementCode` ({ source, indent }) is the selected
 * element's code, worked out by the editor when the Code tab is open.
 */
export function inspectorView(s, page, elementCode) {
    if (!s) return { page };
    const key = s.path.join(".");
    const tab = panelStore.get().tab;
    if (tab === "design") return { design: { key, s } };
    if (tab === "ai") return { ai: { key, path: s.path, outer: s.outer } };
    return elementCode ? { code: { key, path: s.path, source: elementCode.source, indent: elementCode.indent, s } } : { classes: { key, s } };
}
