import { HUES, SHADES, SPECIAL_COLORS, STEPS, SIZES, MAX_W, BREAKPOINTS, STATES, BREAKPOINT_WIDTH, getGroup, setGroup, parseToken } from "./class-groups.js";

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
    `<datalist id="dl-cssprops">${CSS_PROPS.map((v) => `<option value="${v}"></option>`).join("")}</datalist>`;

export function mountDatalists() {
    const d = document.createElement("div");
    d.hidden = true;
    d.innerHTML = DATALISTS;
    document.body.appendChild(d);
}

// ── UI state ─────────────────────────────────────────────────────────────────
export const ui = { tab: "design", bp: "", st: "", open: new Set(["layout", "size", "spacing", "typography", "fill", "border"]), palette: null };
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
        pal = `<div class="pal"><div class="palrow">${SPECIAL_COLORS.map((c) => cell(c, c === "black" ? "bg-black" : c === "white" ? "bg-white" : "swatch-t")).join("")}<label class="sw2 custom" title="Custom color"><input type="color" data-ccustom="${k}" value="${arb && /^#[0-9a-f]{6}$/i.test(arb[1]) ? arb[1] : "#3b82f6"}"></label><button type="button" data-cv="" class="clear">None</button></div>${HUES.map((h) => `<div class="palrow">${SHADES.map((s) => cell(`${h}-${s}`, `bg-${h}-${s}`)).join("")}</div>`).join("")}</div>`;
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

function designTab(s) {
    return variantBar() + `<div class="crumbs">${crumbs(s)}</div>` + actions(s) + contentFields(s) + SECTIONS.map(([id, title, keys, body]) => section(s, id, title, keys, body)).join("");
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

export function renderInspectorHtml(s) {
    const tabs = `<div class="itabs">${[["design", "Design"], ["classes", "Classes and CSS"], ["ai", "AI"]].map(([k, l]) => `<button type="button" data-tab="${k}" class="${ui.tab === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
    if (!s) return tabs + `<div class="empty">Select an element on the canvas, or in Layers, to edit it.</div>`;
    return tabs + (ui.tab === "design" ? designTab(s) : ui.tab === "classes" ? classesTab(s) : aiTab());
}
