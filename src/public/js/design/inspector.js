import { HUES, SHADES, SPECIAL_COLORS, STEPS, SIZES, MAX_W, BREAKPOINTS, STATES, BREAKPOINT_WIDTH, GROUPS, getGroup, setGroup, parseToken } from "./class-groups.js";
import { CSS_SECTIONS, rgbToHex, parseInline } from "./css-props.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TEXT_SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
const RADII = ["none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];
const PCT = ["0", "5", "10", "20", "25", "30", "40", "50", "60", "70", "75", "80", "90", "95", "100"];
const DEGS = ["0", "1", "2", "3", "6", "12", "45", "90", "180"];
const MS = ["0", "75", "100", "150", "200", "300", "500", "700", "1000"];

// suggestions for the free-type inputs (any value, including [arbitrary], is accepted)
const PRESETS = {
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
const OPTS = {
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

// ── UI state ─────────────────────────────────────────────────────────────────
export const ui = { closeInTabs: false, styleMode: "auto", docTailwind: true, tab: "design", bp: "", st: "", open: new Set(["geom", "css-layout", "css-size", "css-spacing", "css-type", "css-fill", "css-border", "layout", "size", "spacing", "typography", "fill", "border"]), palette: null };
export const variant = () => `${ui.bp ? ui.bp + ":" : ""}${ui.st ? ui.st + ":" : ""}`;

export const val = (sel, k) => { const r = getGroup(sel.classes, k, variant()); return r ? r.value : ""; };
const splitOpacity = (v) => { const m = String(v).match(/^(.*?)(?:\/(\d+))?$/); return [m[1], m[2] || ""]; };

// ── Controls ─────────────────────────────────────────────────────────────────
const combo = (sel, k, label, cell) => `<label class="${cell ? "cell" : "row"}" title="${k}"><span class="${cell ? "clbl" : "lbl"}">${label}</span><input class="fi" data-g="${k}" list="dl-${PRESETS[k] ? k : "spacing"}" value="${esc(val(sel, k))}" placeholder="-" autocomplete="off"></label>`;
const select = (sel, k, label) => {
    const cur = val(sel, k);
    return `<label class="row"><span class="lbl">${label}</span><select class="fi" data-g="${k}"><option value="">-</option>${OPTS[k].map(([v, l]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
};
const seg = (sel, k, label, items) => {
    const cur = val(sel, k);
    return `<div class="row"><span class="lbl">${label}</span><div class="seg2">${items.map(([v, l, t]) => `<button type="button" data-seg="${k}" data-v="${cur === v ? "" : v}" title="${t || l}" class="${cur === v ? "on" : ""}">${l}</button>`).join("")}</div></div>`;
};
const two = (a, b) => `<div class="two">${a}${b}</div>`;
const four = (a, b, c, d) => `<div class="four">${a}${b}${c}${d}</div>`;

function colorRow(sel, k, label) {
    const [name, op] = splitOpacity(val(sel, k));
    const named = /^(?:black|white|transparent|current|inherit)$/.test(name) || /^[a-z]+-\d{2,3}$/.test(name);
    const arb = name.match(/^\[(.*)\]$/);
    const swatch = name ? (arb ? `style="background:${esc(arb[1].replace(/_/g, " "))}"` : "") : "";
    const swClass = name && named ? (/^(?:transparent|current|inherit)$/.test(name) ? "swatch-t" : `bg-${name}`) : "";
    let pal = "";
    if (ui.palette === k) {
        const cell = (v, cls) => `<button type="button" data-cv="${v}" title="${v}" class="sw2 ${cls} ${name === v ? "on" : ""}"></button>`;
        pal = `<div class="pal"><div class="palrow">${SPECIAL_COLORS.map((c) => cell(c, c === "black" ? "bg-black" : c === "white" ? "bg-white" : "swatch-t")).join("")}<label class="sw2 custom" title="Custom color"><input type="color" data-ccustom="${k}" value="${arb && /^#[0-9a-f]{6}$/i.test(arb[1]) ? arb[1] : "#111"}"></label><button type="button" data-cv="" class="clear">None</button></div>${HUES.map((h) => `<div class="palrow">${SHADES.map((s) => cell(`${h}-${s}`, `bg-${h}-${s}`)).join("")}</div>`).join("")}</div>`;
    }
    return `<div class="crow"><span class="lbl">${label}</span><button type="button" data-pal="${k}" class="sw ${swClass}" ${swatch} title="Pick a color"></button><input class="fi grow" data-cname="${k}" list="dl-colors" value="${esc(name)}" placeholder="none" autocomplete="off"><input class="fi op" data-cop="${k}" value="${esc(op)}" placeholder="100" title="Opacity %"><span class="pct">%</span></div>${pal}`;
}

const box = (sel) => {
    const i = (k, ph) => `<input class="bmi" data-g="${k}" list="dl-${k.startsWith("m") ? "mt" : "pt"}" value="${esc(val(sel, k))}" placeholder="${ph}" title="${k}" autocomplete="off">`;
    return `<div class="bm"><span class="bml">margin</span><div class="bmr">${i("mt", "-")}</div>
        <div class="bmr mid">${i("ml", "-")}<div class="bp"><span class="bml">padding</span><div class="bmr">${i("pt", "-")}</div><div class="bmr mid">${i("pl", "-")}<div class="bc">${esc(sel.tag)}</div>${i("pr", "-")}</div><div class="bmr">${i("pb", "-")}</div></div>${i("mr", "-")}</div>
        <div class="bmr">${i("mb", "-")}</div></div>`;
};

const SECTIONS = [
    ["layout", "Layout", ["display", "position", "overflow", "flexDir", "justify", "items", "gap", "gridCols", "z"], (s) =>
        select(s, "display", "Display") + select(s, "position", "Position") + two(select(s, "overflowX", "X"), select(s, "overflowY", "Y")).replace(/class="row"/g, 'class="row compact"') +
        two(combo(s, "z", "Z", true), select(s, "visibility", "Vis").replace('class="row"', 'class="row compact"')) +
        `<p class="sub">Flex</p>` +
        seg(s, "flexDir", "Direction", [["flex-row", "Row"], ["flex-col", "Column"], ["flex-row-reverse", "Row ←", "row-reverse"], ["flex-col-reverse", "Col ↑", "col-reverse"]]) +
        select(s, "flexWrap", "Wrap") + select(s, "justify", "Justify") + select(s, "items", "Align") + select(s, "content", "Content") +
        two(combo(s, "gap", "Gap", true), combo(s, "gapX", "X", true)) + two(combo(s, "gapY", "Y", true), "<span></span>") +
        `<p class="sub">Grid</p>` + two(combo(s, "gridCols", "Cols", true), combo(s, "gridRows", "Rows", true)) +
        `<p class="sub">As a child</p>` + select(s, "self", "Align self") + select(s, "flexNum", "Flex") +
        two(combo(s, "colSpan", "Col span", true), combo(s, "rowSpan", "Row span", true)) + two(combo(s, "order", "Order", true), seg(s, "grow", "Grow", [["grow", "Grow"], ["grow-0", "No grow"]]))],
    ["size", "Size", ["w", "h", "minW", "maxW", "minH", "maxH", "aspect"], (s) =>
        two(combo(s, "w", "W", true), combo(s, "h", "H", true)) + two(combo(s, "minW", "Min W", true), combo(s, "maxW", "Max W", true)) + two(combo(s, "minH", "Min H", true), combo(s, "maxH", "Max H", true)) +
        (s.tag === "img" || s.tag === "video" ? select(s, "objectFit", "Object fit") : "")],
    ["spacing", "Spacing", ["p", "px", "py", "m", "mx", "my", "pt", "pr", "pb", "pl", "mt", "mr", "mb", "ml", "spaceX", "spaceY"], (s) =>
        box(s) + two(combo(s, "p", "Pad", true), combo(s, "m", "Mar", true)) + two(combo(s, "px", "Pad X", true), combo(s, "mx", "Mar X", true)) + two(combo(s, "py", "Pad Y", true), combo(s, "my", "Mar Y", true)) +
        two(combo(s, "spaceX", "Space X", true), combo(s, "spaceY", "Space Y", true))],
    ["position", "Position offsets", ["inset", "top", "right", "bottom", "left"], (s) =>
        two(combo(s, "inset", "Inset", true), combo(s, "top", "Top", true)) + two(combo(s, "left", "Left", true), combo(s, "right", "Right", true)) + two(combo(s, "bottom", "Bottom", true), "<span></span>")],
    ["typography", "Typography", ["fontFamily", "fontSize", "fontWeight", "textColor", "leading", "tracking", "textAlign"], (s) =>
        select(s, "fontFamily", "Family") + select(s, "fontWeight", "Weight") + two(combo(s, "fontSize", "Size", true), combo(s, "leading", "Line", true)) + two(combo(s, "tracking", "Track", true), combo(s, "lineClamp", "Clamp", true)) +
        seg(s, "textAlign", "Align", [["text-left", "Left"], ["text-center", "Center"], ["text-right", "Right"], ["text-justify", "Just."]]) +
        seg(s, "textDecoration", "Decor", [["underline", "U", "underline"], ["line-through", "S", "line-through"], ["no-underline", "None"]]) +
        seg(s, "fontStyle", "Style", [["italic", "Italic"], ["not-italic", "Normal"]]) + select(s, "textTransform", "Case") + select(s, "textOverflow", "Overflow") + select(s, "whitespace", "Wrap") +
        colorRow(s, "textColor", "Color")],
    ["fill", "Fill", ["bgColor", "bgImage", "gradFrom", "gradTo", "bgSize"], (s) =>
        colorRow(s, "bgColor", "Color") + `<p class="sub">Gradient</p>` + select(s, "bgImage", "Direction") + colorRow(s, "gradFrom", "From") + colorRow(s, "gradVia", "Via") + colorRow(s, "gradTo", "To") +
        `<p class="sub">Image</p>` + select(s, "bgSize", "Size") + select(s, "bgPosition", "Position") + select(s, "bgRepeat", "Repeat") +
        (s.tag === "svg" || s.tag === "path" ? colorRow(s, "fill", "SVG fill") + colorRow(s, "stroke", "SVG stroke") : "")],
    ["border", "Border", ["borderWidth", "borderT", "borderColor", "radius", "radiusTL", "ring"], (s) =>
        two(combo(s, "borderWidth", "All", true), select(s, "borderStyle", "Style").replace('class="row"', 'class="row compact"')) +
        four(combo(s, "borderT", "T", true), combo(s, "borderR", "R", true), combo(s, "borderB", "B", true), combo(s, "borderL", "L", true)) + colorRow(s, "borderColor", "Color") +
        `<p class="sub">Radius</p>` + combo(s, "radius", "All", false) + four(combo(s, "radiusTL", "TL", true), combo(s, "radiusTR", "TR", true), combo(s, "radiusBR", "BR", true), combo(s, "radiusBL", "BL", true)) +
        `<p class="sub">Ring</p>` + two(combo(s, "ring", "Width", true), "<span></span>") + colorRow(s, "ringColor", "Color")],
    ["effects", "Effects", ["shadow", "opacity", "blur", "backdropBlur", "rotate", "scale", "mixBlend"], (s) =>
        select(s, "shadow", "Shadow") + colorRow(s, "shadowColor", "Shadow color") + two(combo(s, "opacity", "Opacity", true), combo(s, "brightness", "Bright", true)) +
        select(s, "blur", "Blur") + select(s, "backdropBlur", "Backdrop") + select(s, "grayscale", "Grayscale") + select(s, "mixBlend", "Blend") +
        `<p class="sub">Transform</p>` + two(combo(s, "rotate", "Rotate", true), combo(s, "scale", "Scale", true)) + two(combo(s, "translateX", "Move X", true), combo(s, "translateY", "Move Y", true))],
    ["motion", "Motion and interaction", ["transition", "duration", "ease", "cursor"], (s) =>
        select(s, "transition", "Transition") + two(combo(s, "duration", "Time", true), combo(s, "delay", "Delay", true)) + select(s, "ease", "Easing") +
        select(s, "cursor", "Cursor") + select(s, "pointerEvents", "Pointer") + select(s, "userSelect", "Select")],
];

const section = (s, id, title, keys, body) => {
    const open = ui.open.has(id);
    const set = keys.some((k) => val(s, k));
    return `<div class="sec"><button type="button" class="sech" data-sec="${id}"><span class="car">${open ? "▾" : "▸"}</span><span class="t">${title}</span>${set ? '<i class="dot"></i>' : ""}</button>${open ? `<div class="secb">${body(s)}</div>` : ""}</div>`;
};

// ── Tabs ─────────────────────────────────────────────────────────────────────
const crumbs = (s) => s.crumbs.map((c, i) => `<button type="button" data-crumb="${(c.path || []).join(".")}" class="${i === s.crumbs.length - 1 ? "cur" : ""}">${c.tag}</button>`).join('<span class="sl">/</span>');

const actions = (s) => (s.tag === "body" ? "" : `<div class="acts"><button type="button" data-do="up" title="Move earlier">Up</button><button type="button" data-do="down" title="Move later">Down</button><button type="button" data-do="duplicate" title="Ctrl/Cmd+D">Duplicate</button><button type="button" data-do="remove" class="danger" title="Delete">Delete</button></div>`);

const variantBar = () => `<div class="vbar"><select data-bp class="fi">${BREAKPOINTS.map((b) => `<option value="${b}" ${ui.bp === b ? "selected" : ""}>${b ? b + " and up" : "Base (all sizes)"}</option>`).join("")}</select><select data-st class="fi">${STATES.map((b) => `<option value="${b}" ${ui.st === b ? "selected" : ""}>${b || "Default state"}</option>`).join("")}</select></div>${variant() ? `<p class="vnote">Editing <code>${variant()}</code> classes</p>` : ""}`;

const contentFields = (s) => {
    const fields = [];
    if (s.tag === "img") fields.push(["src", "Image URL"], ["alt", "Alt text"]);
    if (s.tag === "a") fields.push(["href", "Link"], ["target", "Target"]);
    if (["input", "textarea"].includes(s.tag)) fields.push(["placeholder", "Placeholder"], ["type", "Type"], ["value", "Value"]);
    const text = s.leaf && !["img", "input", "hr", "br"].includes(s.tag) ? `<textarea class="fi area" rows="3" data-live data-field="text" placeholder="Text">${esc(s.text)}</textarea>` : "";
    const rows = fields.map(([a, l]) => `<label class="row"><span class="lbl">${l}</span><input class="fi" data-live data-attr="${a}" value="${esc(s.attrs[a] || "")}"></label>`).join("");
    return text || rows ? `<div class="sec"><div class="secb nopad"><p class="sub first">Content</p>${text}${rows}</div></div>` : "";
};

function geomBody(s) {
    const g = s.geom || {};
    const abs = Boolean(g.abs);
    const cell = (k, label, v, enabled) => `<label class="cell ${enabled ? "" : "opacity-50"}"><span class="clbl">${label}</span><input class="fi" data-geom="${k}" value="${esc(v ?? "")}" ${enabled ? "" : "disabled"} autocomplete="off"></label>`;
    const alignBtn = (m, l, t) => `<button type="button" data-align="${m}" title="${t}" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50">${l}</button>`;
    return `${two(cell("x", "X", g.x, abs), cell("y", "Y", g.y, abs))}${two(cell("w", "W", g.w, true), cell("h", "H", g.h, true))}${two(cell("rot", "Rot", g.rot, abs), `<button type="button" data-free="${abs ? "off" : "on"}" class="h-6 rounded-md border ${abs ? "border-[#111] bg-[#e5f4ff] text-[#111]" : "border-neutral-200 hover:bg-neutral-50"} text-[11px]" title="Position this element freely (position: absolute) so you can drag it anywhere">${abs ? "Free position ✓" : "Free position"}</button>`)}
        ${abs ? `<div class="flex gap-1">${alignBtn("left", "Left", "Align left")}${alignBtn("hcenter", "Center", "Align horizontal centers")}${alignBtn("right", "Right", "Align right")}${alignBtn("top", "Top", "Align top")}${alignBtn("vcenter", "Middle", "Align vertical centers")}${alignBtn("bottom", "Bottom", "Align bottom")}</div>` : ""}
        ${(s.count || 1) > 2 ? `<div class="flex gap-1">${alignBtn("distribute-h", "Space horizontally", "Distribute horizontally")}${alignBtn("distribute-v", "Space vertically", "Distribute vertically")}</div>` : ""}
        <div class="flex gap-1">${(s.count || 1) > 1 ? `<button type="button" data-do="group" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50" title="Ctrl/Cmd+G">Group</button>` : ""}${abs ? `<button type="button" data-do="ungroup" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50" title="Ctrl/Cmd+Shift+G">Ungroup</button>` : ""}</div>`;
}


// ── CSS mode: reads computed styles, writes inline styles (works whatever styled the element) ──
const tokensOf = (s) => String(s.classes || "").split(/\s+/).filter(Boolean);
const isUtility = (tok) => { const base = parseToken(tok).base; return Object.keys(GROUPS).some((k) => GROUPS[k].re.test(base)); };

/** Auto picks Tailwind for Tailwind-styled elements and CSS for elements styled by the design's own CSS. */
export function modeFor(s) {
    if (ui.styleMode !== "auto") return ui.styleMode;
    const toks = tokensOf(s);
    if (toks.length) return toks.some(isUtility) ? "tailwind" : "css";
    return ui.docTailwind ? "tailwind" : "css";
}

const cssField = (s, c, inline) => {
    const set = inline[c.p] !== undefined;
    const comp = (s.computed || {})[c.p] ?? "";
    const shown = set ? inline[c.p] : comp;
    const cls = set ? "is-set" : "";
    let control;
    if (c.t === "select") {
        const opts = c.o.includes(shown) || !shown ? c.o : [shown, ...c.o];
        control = `<select class="fi ${cls}" data-css="${c.p}">${opts.map((o) => `<option value="${esc(o)}" ${o === shown ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    } else if (c.t === "seg") {
        control = `<div class="seg2">${c.o.map((o) => `<button type="button" data-cssseg="${c.p}" data-cssv="${o}" class="${shown === o || (o === "left" && shown === "start") ? "on" : ""}">${o[0].toUpperCase() + o.slice(1)}</button>`).join("")}</div>`;
    } else if (c.t === "color") {
        control = `<input type="color" class="cinp" data-csscolor="${c.p}" value="${rgbToHex(shown) || "#000000"}" title="Pick a color"><input class="fi ${cls}" data-css="${c.p}" value="${esc(shown)}" autocomplete="off">`;
    } else {
        control = `<input class="fi ${cls}" data-css="${c.p}" value="${esc(shown)}" ${c.list ? `list="${c.list}"` : ""} autocomplete="off">`;
    }
    return `<div class="row" title="${c.p}"><span class="lbl">${c.l}</span><div class="flex min-w-0 flex-1 items-center gap-1">${control}${set ? `<button type="button" data-cssreset="${c.p}" class="rst" title="Remove my inline value">×</button>` : ""}</div></div>`;
};

const cssBox = (s, inline) => {
    const i = (p, ph) => `<input class="bmi" data-css="${p}" value="${esc((inline[p] !== undefined ? inline[p] : (s.computed || {})[p] ?? "").replace(/px$/, ""))}" placeholder="${ph}" title="${p}" autocomplete="off">`;
    return `<div class="bm"><span class="bml">margin</span><div class="bmr">${i("margin-top", "-")}</div>
        <div class="bmr mid">${i("margin-left", "-")}<div class="bp"><span class="bml">padding</span><div class="bmr">${i("padding-top", "-")}</div><div class="bmr mid">${i("padding-left", "-")}<div class="bc">${esc(s.tag)}</div>${i("padding-right", "-")}</div><div class="bmr">${i("padding-bottom", "-")}</div></div>${i("margin-right", "-")}</div>
        <div class="bmr">${i("margin-bottom", "-")}</div></div>`;
};

function cssSections(s) {
    const inline = parseInline(s.style);
    return CSS_SECTIONS.map(([id, title, controls]) => {
        const keys = controls === "box" ? [] : controls.map((c) => c.p);
        const hasSet = controls === "box" ? Object.keys(inline).some((k) => /^(margin|padding)/.test(k)) : keys.some((k) => inline[k] !== undefined);
        const open = ui.open.has(id);
        const body = controls === "box" ? cssBox(s, inline) : controls.map((c) => cssField(s, c, inline)).join("");
        return `<div class="sec"><button type="button" class="sech" data-sec="${id}"><span class="car">${open ? "▾" : "▸"}</span><span class="t">${title}</span>${hasSet ? '<i class="dot"></i>' : ""}</button>${open ? `<div class="secb">${body}</div>` : ""}</div>`;
    }).join("");
}

const modeBar = (s, mode) => `<div class="px-2 pt-2"><div class="seg2">${[["auto", "Auto"], ["tailwind", "Tailwind"], ["css", "CSS"]].map(([v, l]) => `<button type="button" data-stylemode="${v}" class="${ui.styleMode === v ? "on" : ""}">${l}</button>`).join("")}</div>
    <p class="muted" style="padding:4px 2px 0">${mode === "css" ? "Styling with <strong>CSS</strong>. Changes are saved as inline styles, which override the design's own stylesheet." : "Styling with <strong>Tailwind</strong> classes."}${ui.styleMode === "auto" ? " (picked automatically for this element)" : ""}</p></div>`;

function designTab(s) {
    const mode = modeFor(s);
    return modeBar(s, mode) + (mode === "tailwind" ? variantBar() : "") + `<div class="crumbs">${crumbs(s)}</div>` + actions(s) + contentFields(s) + section(s, "geom", "Position and size", ["w"], geomBody) +
        (mode === "css" ? cssSections(s) : SECTIONS.map(([id, title, keys, body]) => section(s, id, title, keys, body)).join(""));
}

function classesTab(s) {
    const toks = s.classes.split(/\s+/).filter(Boolean);
    const chips = toks.map((t, i) => `<span class="chip ${parseToken(t).variant ? "var" : ""}">${esc(t)}<button type="button" data-rm="${i}" title="Remove">×</button></span>`).join("");
    const styleRows = (s.style || "").split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(":"); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; });
    const stRow = ([k, v], i) => `<div class="kv" data-stylerow><input class="fi" data-live list="dl-cssprops" placeholder="property" value="${esc(k)}"><input class="fi" data-live placeholder="value" value="${esc(v)}"></div>`;
    const attrRows = Object.entries(s.attrs);
    const aRow = ([k, v]) => `<div class="kv" data-arow data-old="${esc(k)}"><input class="fi" data-live placeholder="attribute" value="${esc(k)}"><input class="fi" data-live placeholder="value" value="${esc(v)}"></div>`;
    return `<div class="sec"><div class="secb nopad"><p class="sub first">Classes <span class="muted">${toks.length}</span></p><div class="chips">${chips || '<span class="muted">No classes</span>'}</div>
        <input class="fi" data-live data-addclass placeholder="Add classes, press Enter (hover:bg-red-500)" autocomplete="off">
        <p class="sub">Edit all</p><textarea class="fi area mono" rows="4" data-live data-field="classes" spellcheck="false">${esc(s.classes)}</textarea></div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Custom CSS <span class="muted">style attribute</span></p>${[...styleRows, ["", ""]].map(stRow).join("")}</div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Attributes</p>${[...attrRows, ["", ""]].map(aRow).join("")}</div></div>`;
}

function aiTab() {
    return `<div class="sec"><div class="secb nopad"><p class="sub first">Ask AI about this element</p><textarea id="aiInput" class="fi area" rows="4" placeholder="e.g. make this a dark card with a larger title"></textarea><button type="button" data-do="ai" class="primary">Apply to this element</button><p id="aiNote" class="hidden"></p><p class="muted">Changes only the selected element. Undo with Ctrl/Cmd+Z.</p></div></div>`;
}

/** What the panel shows when a page is selected but no element in it: the page's own name, size, position and details. */
function pageHtml(pg) {
    const cell = (k, label, v, ph = "") => `<label class="cell"><span class="clbl">${label}</span><input class="fi" data-pg="${k}" value="${esc(v ?? "")}" placeholder="${ph}" autocomplete="off"></label>`;
    const dev = (w, l) => `<button type="button" data-pgw="${w}" class="flex-1 rounded border py-1 text-[10px] ${pg.w === w ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 hover:bg-neutral-50"}">${l}</button>`;
    const btn = (act, l) => `<button type="button" data-pgact="${act}" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50">${l}</button>`;
    return `<div class="sec"><div class="secb nopad"><p class="sub first">Page</p>
            <label class="row"><span class="lbl">Name</span><input class="fi" data-pg="name" value="${esc(pg.name)}" autocomplete="off"></label>
            <div class="row"><span class="lbl">Version</span><span class="text-[11px] text-neutral-700">${pg.isNew ? "not saved yet" : `v${esc(pg.version)}`}${pg.project ? ` · ${esc(pg.project)}` : ""}</span></div></div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Size</p>
            <div class="flex gap-1">${dev(1280, "Desktop")}${dev(768, "Tablet")}${dev(390, "Mobile")}</div>
            ${two(cell("w", "W", pg.w), cell("h", "H", pg.auto ? "" : pg.h, "auto"))}
            <p class="text-[10px] text-neutral-500">Leave the height empty and it follows the content.</p></div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Position on the canvas</p>
            ${two(cell("x", "X", pg.x), cell("y", "Y", pg.y))}</div></div>
        <div class="sec"><div class="secb nopad"><div class="flex gap-1">${btn("fit", "Zoom to fit")}${btn("details", "Details…")}</div>
            <p class="text-[10px] text-neutral-500">Click an element in the page to edit it.</p></div></div>`;
}

export function renderInspectorHtml(s, page) {
    if (!s && page) return `<div class="itabs"><span class="px-1 text-[11px] font-medium text-neutral-800">Page</span>${ui.closeInTabs ? '<button type="button" data-closepanel title="Close" style="padding:0;margin-left:auto" class="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' : ""}</div>${pageHtml(page)}`;
    const tabs = `<div class="itabs">${[["design", "Design"], ["classes", "Classes and CSS"], ["ai", "AI"]].map(([k, l]) => `<button type="button" data-tab="${k}" class="${ui.tab === k ? "on" : ""}">${l}</button>`).join("")}${ui.closeInTabs ? `<button type="button" data-closepanel title="Close" style="padding:0" class="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` : ""}</div>`;
    if (!s) return tabs + `<div class="empty">Select an element on the canvas, or in Layers, to edit it.</div>`;
    return tabs + (ui.tab === "design" ? designTab(s) : ui.tab === "classes" ? classesTab(s) : aiTab());
}
