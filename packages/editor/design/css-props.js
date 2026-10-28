// Property-based style panel: works on ANY element, whatever styled it (Tailwind, a stylesheet,
// Bootstrap, inline styles). It reads computed CSS and writes inline styles, which always win.
const sel = (o) => ({ t: "select", o });
const FLEX = ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"];

export const CSS_SECTIONS = [
    ["css-layout", "Layout", [
        { p: "display", l: "Display", ...sel(["block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid", "none", "contents"]) },
        { p: "position", l: "Position", ...sel(["static", "relative", "absolute", "fixed", "sticky"]) },
        { p: "overflow", l: "Overflow", ...sel(["visible", "hidden", "auto", "scroll", "clip"]) },
        { p: "z-index", l: "Z-index", t: "text" },
        { p: "flex-direction", l: "Direction", ...sel(["row", "row-reverse", "column", "column-reverse"]) },
        { p: "flex-wrap", l: "Wrap", ...sel(["nowrap", "wrap", "wrap-reverse"]) },
        { p: "justify-content", l: "Justify", ...sel(["normal", ...FLEX, "stretch"]) },
        { p: "align-items", l: "Align", ...sel(["normal", "stretch", "flex-start", "center", "flex-end", "baseline"]) },
        { p: "gap", l: "Gap", t: "text" },
        { p: "grid-template-columns", l: "Grid cols", t: "text" },
    ]],
    ["css-size", "Size", [
        { p: "width", l: "Width", t: "text" }, { p: "height", l: "Height", t: "text" },
        { p: "min-width", l: "Min W", t: "text" }, { p: "max-width", l: "Max W", t: "text" },
        { p: "min-height", l: "Min H", t: "text" }, { p: "max-height", l: "Max H", t: "text" },
        { p: "aspect-ratio", l: "Ratio", t: "text" },
    ]],
    ["css-spacing", "Spacing", "box"],
    ["css-offsets", "Position offsets", [
        { p: "top", l: "Top", t: "text" }, { p: "right", l: "Right", t: "text" }, { p: "bottom", l: "Bottom", t: "text" }, { p: "left", l: "Left", t: "text" },
    ]],
    ["css-type", "Typography", [
        { p: "font-family", l: "Family", t: "text", list: "dl-fonts" },
        { p: "font-size", l: "Size", t: "text" },
        { p: "font-weight", l: "Weight", ...sel(["100", "200", "300", "400", "500", "600", "700", "800", "900"]) },
        { p: "line-height", l: "Line", t: "text" },
        { p: "letter-spacing", l: "Tracking", t: "text" },
        { p: "text-align", l: "Align", t: "seg", o: ["left", "center", "right", "justify"] },
        { p: "text-decoration-line", l: "Decor", ...sel(["none", "underline", "line-through", "overline"]) },
        { p: "text-transform", l: "Case", ...sel(["none", "uppercase", "lowercase", "capitalize"]) },
        { p: "font-style", l: "Style", ...sel(["normal", "italic"]) },
        { p: "white-space", l: "Wrap", ...sel(["normal", "nowrap", "pre", "pre-wrap", "pre-line"]) },
        { p: "color", l: "Color", t: "color" },
    ]],
    ["css-fill", "Fill", [
        { p: "background-color", l: "Color", t: "color" },
        { p: "background-image", l: "Image", t: "text" },
        { p: "background-size", l: "Size", ...sel(["auto", "cover", "contain"]) },
        { p: "background-position", l: "Position", t: "text" },
        { p: "background-repeat", l: "Repeat", ...sel(["repeat", "no-repeat", "repeat-x", "repeat-y"]) },
    ]],
    ["css-border", "Border and radius", [
        { p: "border-top-width", l: "Width", t: "text" },
        { p: "border-top-style", l: "Style", ...sel(["none", "solid", "dashed", "dotted", "double"]) },
        { p: "border-top-color", l: "Color", t: "color" },
        { p: "border-radius", l: "Radius", t: "text" },
        { p: "outline", l: "Outline", t: "text" },
    ]],
    ["css-effects", "Effects", [
        { p: "box-shadow", l: "Shadow", t: "text" },
        { p: "opacity", l: "Opacity", t: "text" },
        { p: "filter", l: "Filter", t: "text" },
        { p: "backdrop-filter", l: "Backdrop", t: "text" },
        { p: "transform", l: "Transform", t: "text" },
        { p: "transition", l: "Transition", t: "text" },
        { p: "cursor", l: "Cursor", ...sel(["auto", "default", "pointer", "text", "move", "not-allowed", "grab", "crosshair"]) },
        { p: "mix-blend-mode", l: "Blend", ...sel(["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference"]) },
        { p: "pointer-events", l: "Pointer", ...sel(["auto", "none"]) },
        { p: "object-fit", l: "Object fit", ...sel(["fill", "contain", "cover", "none", "scale-down"]) },
    ]],
];

export const BOX_PROPS = ["margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left"];

/** What the floating bar's Border, Radius and Spacing popovers read, side by side and corner by corner. */
export const TOOLBAR_PROPS = [
    ...["top", "right", "bottom", "left"].flatMap((d) => [`border-${d}-width`, `border-${d}-style`, `border-${d}-color`]),
    "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius",
];

/** Every property the panel can show, sent to the in-frame agent so it can report computed values. */
export const CSS_PROP_LIST = [...new Set([
    "align-self", "flex-grow", "flex-shrink", "flex-basis", "column-gap", "row-gap", "scale", "justify-items", "grid-template-rows", // Position, Layout, item (figma-sections.js)
    "outline-style", "outline-offset", "user-select", "visibility", "object-position", "text-overflow", "border-top-left-radius", // style-sections.js
    ...CSS_SECTIONS.flatMap(([, , c]) => (c === "box" ? [] : c.map((x) => x.p))),
    ...BOX_PROPS,
    ...TOOLBAR_PROPS,
])];

const LENGTH = new Set(["width", "height", "min-width", "max-width", "min-height", "max-height", "top", "right", "bottom", "left", "gap", "font-size", "line-height", "letter-spacing", "border-top-width", "border-radius", ...BOX_PROPS]);

/** A bare number means pixels for length properties (24 -> 24px). */
export function normalizeValue(prop, value) {
    const v = String(value).trim();
    if (LENGTH.has(prop) && /^-?\d*\.?\d+$/.test(v) && Number(v) !== 0) return `${v}px`;
    return v;
}

export function rgbToHex(value) {
    const m = String(value).match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/);
    if (!m) return /^#[0-9a-f]{6}$/i.test(value) ? value : "";
    if (m[4] !== undefined && Number(m[4]) === 0) return "";
    return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

/** "color: red; padding: 4px" -> { color: "red", padding: "4px" } */
export function parseInline(style) {
    const out = {};
    String(style || "").split(";").forEach((d) => {
        const i = d.indexOf(":");
        if (i > 0) out[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim();
    });
    return out;
}
