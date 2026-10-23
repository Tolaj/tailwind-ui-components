import { HUES, SHADES, SPECIAL_COLORS, STEPS, SIZES, MAX_W, BREAKPOINTS, STATES, BREAKPOINT_WIDTH, GROUPS, getGroup, setGroup, parseToken } from "./class-groups.js";
import { CSS_SECTIONS, rgbToHex } from "./css-props.js";
import { twShown, variantOf } from "./prop-tailwind.js";

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
export const ui = { closeInTabs: false, docTailwind: true, closed: new Set(), tab: "design", bp: "", st: "", open: new Set(["geom", "css-layout", "css-size", "css-spacing", "css-type", "css-fill", "css-border", "layout", "size", "spacing", "typography", "fill", "border"]), palette: null };
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

// Tailwind-only controls with no single CSS property of their own (a gradient, a ring, space between children...). Everything
// that is one CSS property lives in the property rows below, which edit wherever the value comes from.
const EXTRA_KEYS = ["bgImage", "gradFrom", "gradVia", "gradTo", "ring", "ringColor", "spaceX", "spaceY", "gridRows", "colSpan", "rowSpan", "order", "self", "flexNum", "grow", "lineClamp", "rotate", "scale", "translateX", "translateY", "transition", "duration", "delay", "ease", "blur", "backdropBlur", "brightness", "grayscale", "userSelect"];
const extrasBody = (s) =>
    `<p class="sub first">Gradient</p>` + select(s, "bgImage", "Direction") + colorRow(s, "gradFrom", "From") + colorRow(s, "gradVia", "Via") + colorRow(s, "gradTo", "To") +
    `<p class="sub">Ring</p>` + two(combo(s, "ring", "Width", true), "<span></span>") + colorRow(s, "ringColor", "Color") +
    `<p class="sub">Children and grid</p>` + two(combo(s, "spaceX", "Space X", true), combo(s, "spaceY", "Space Y", true)) + two(combo(s, "gridRows", "Rows", true), combo(s, "order", "Order", true)) +
    two(combo(s, "colSpan", "Col span", true), combo(s, "rowSpan", "Row span", true)) + select(s, "self", "Align self") + select(s, "flexNum", "Flex") + seg(s, "grow", "Grow", [["grow", "Grow"], ["grow-0", "No grow"]]) + combo(s, "lineClamp", "Line clamp", false) +
    `<p class="sub">Transform</p>` + two(combo(s, "rotate", "Rotate", true), combo(s, "scale", "Scale", true)) + two(combo(s, "translateX", "Move X", true), combo(s, "translateY", "Move Y", true)) +
    `<p class="sub">Motion and filters</p>` + select(s, "transition", "Transition") + two(combo(s, "duration", "Time", true), combo(s, "delay", "Delay", true)) + select(s, "ease", "Easing") +
    select(s, "blur", "Blur") + select(s, "backdropBlur", "Backdrop") + two(combo(s, "brightness", "Bright", true), "<span></span>") + select(s, "grayscale", "Grayscale") + select(s, "userSelect", "Select");

const section = (s, id, title, keys, body) => {
    const open = ui.open.has(id);
    const set = keys.some((k) => val(s, k));
    return `<div class="sec"><button type="button" class="sech" data-sec="${id}"><span class="car">${open ? "▾" : "▸"}</span><span class="t">${title}</span>${set ? '<i class="dot"></i>' : ""}</button>${open ? `<div class="secb">${body(s)}</div>` : ""}</div>`;
};

// ── Tabs ─────────────────────────────────────────────────────────────────────
const crumbs = (s) => s.crumbs.map((c, i) => `<button type="button" data-crumb="${(c.path || []).join(".")}" class="${i === s.crumbs.length - 1 ? "cur" : ""}">${c.tag}</button>`).join('<span class="sl">/</span>');

const actions = (s) => (s.tag === "body" ? "" : `<div class="acts"><button type="button" data-do="up" title="Move earlier">Up</button><button type="button" data-do="down" title="Move later">Down</button><button type="button" data-do="duplicate" title="Ctrl/Cmd+D">Duplicate</button><button type="button" data-do="remove" class="danger" title="Delete">Delete</button></div>`);

const variantBar = () => `<div class="vbar"><select data-bp class="fi">${BREAKPOINTS.map((b) => `<option value="${b}" ${ui.bp === b ? "selected" : ""}>${b ? b + " and up" : "Base (all sizes)"}</option>`).join("")}</select><select data-st class="fi">${STATES.map((b) => `<option value="${b}" ${ui.st === b ? "selected" : ""}>${b || "Default state"}</option>`).join("")}</select></div>${variant() ? `<p class="vnote">New Tailwind classes get <code>${variant()}</code></p>` : ui.frameBp ? `<p class="vnote">At this frame width, sizes and spacing get <code>${ui.frameBp}</code> (the base class if none is set yet)</p>` : ""}`;

const contentFields = (s) => {
    const fields = [];
    if (s.tag === "img") fields.push(["src", "Image URL"], ["alt", "Alt text"]);
    if (s.tag === "a") fields.push(["href", "Link"], ["target", "Target"]);
    if (["input", "textarea"].includes(s.tag)) fields.push(["placeholder", "Placeholder"], ["type", "Type"], ["value", "Value"]);
    const text = s.leaf && !["img", "input", "hr", "br"].includes(s.tag) ? `<textarea class="fi area" rows="3" data-live data-field="text" placeholder="Text">${esc(s.text)}</textarea>` : "";
    const rows = fields.map(([a, l]) => `<label class="row"><span class="lbl">${l}</span><input class="fi" data-live data-attr="${a}" value="${esc(s.attrs[a] || "")}"></label>`).join("");
    return text || rows ? `<div class="sec"><div class="secb nopad"><p class="sub first">Content</p>${text}${rows}</div></div>` : "";
};

/** A child that flex sizes along its axis ignores a width (or height) set on it: say so, with a one-click way out. */
const flexNote = (s) => {
    const f = s.flexItem;
    if (!f || !f.sized) return "";
    const what = f.dir === "row" ? "width" : "height";
    return `<p class="hintnote">Its ${what} is set by the flex layout: it grows to fill the ${f.dir === "row" ? "row" : "column"}, so a ${what} you set here has no effect. <button type="button" data-do="flexnone">Size it myself</button></p>`;
};

/** The root's lock: locked by default (it follows the rules for its type), unlocked it is edited like any element. */
const LOCK_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0';
const lockRow = (locked) => `<div class="lockrow ${locked ? "on" : ""}">${LOCK_SVG}${locked ? 'v2"/></svg><span>Root locked</span><button type="button" data-rootlock="unlock">Unlock</button>' : '"/></svg><span>Root unlocked: edited like any element</span><button type="button" data-rootlock="lock">Lock</button>'}</div>`;

function geomBody(s) {
    const g = s.geom || {};
    const abs = Boolean(g.abs);
    // a page's root, locked (the default): it fills the frame and stays put, so its size and position aren't edited here
    if (s.root) {
        const cell = (k, label, v) => `<label class="cell opacity-50"><span class="clbl">${label}</span><input class="fi" data-geom="${k}" value="${esc(v ?? "")}" disabled autocomplete="off"></label>`;
        return `${lockRow(true)}${two(cell("w", "W", g.w), cell("h", "H", g.h))}<p class="text-[10px] leading-relaxed text-neutral-500">The page's root: it fills the frame, so its size follows the frame's (Desktop, Tablet, Mobile), and it stays in place.</p>`;
    }
    const cell = (k, label, v, enabled) => `<label class="cell ${enabled ? "" : "opacity-50"}"><span class="clbl">${label}</span><input class="fi" data-geom="${k}" value="${esc(v ?? "")}" ${enabled ? "" : "disabled"} autocomplete="off"></label>`;
    const alignBtn = (m, l, t) => `<button type="button" data-align="${m}" title="${t}" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50">${l}</button>`;
    return `${s.isRoot && ui.designType === "page" ? lockRow(false) : ""}${flexNote(s)}${two(cell("x", "X", g.x, abs), cell("y", "Y", g.y, abs))}${two(cell("w", "W", g.w, true), cell("h", "H", g.h, true))}${two(cell("rot", "Rot", g.rot, abs), `<button type="button" data-free="${abs ? "off" : "on"}" class="h-6 rounded-md border ${abs ? "border-[#111] bg-[#e5f4ff] text-[#111]" : "border-neutral-200 hover:bg-neutral-50"} text-[11px]" title="Position this element freely (position: absolute) so you can drag it anywhere">${abs ? "Free position ✓" : "Free position"}</button>`)}
        ${abs ? `<div class="flex gap-1">${alignBtn("left", "Left", "Align left")}${alignBtn("hcenter", "Center", "Align horizontal centers")}${alignBtn("right", "Right", "Align right")}${alignBtn("top", "Top", "Align top")}${alignBtn("vcenter", "Middle", "Align vertical centers")}${alignBtn("bottom", "Bottom", "Align bottom")}</div>` : ""}
        ${(s.count || 1) > 2 ? `<div class="flex gap-1">${alignBtn("distribute-h", "Space horizontally", "Distribute horizontally")}${alignBtn("distribute-v", "Space vertically", "Distribute vertically")}</div>` : ""}
        <div class="flex gap-1">${(s.count || 1) > 1 ? `<button type="button" data-do="group" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50" title="Ctrl/Cmd+G">Group</button><button type="button" data-do="autolayout" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50" title="Shift+A: line them up in a row or column with even spacing">Auto layout</button>` : ""}${abs ? `<button type="button" data-do="ungroup" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50" title="Ctrl/Cmd+Shift+G">Ungroup</button>` : ""}</div>`;
}


// ── Property rows: each shows where its value comes from and is edited there (editor.js setProp) ──
const tokensOf = (s) => String(s.classes || "").split(/\s+/).filter(Boolean);
const isUtility = (tok) => { const base = parseToken(tok).base; return Object.keys(GROUPS).some((k) => GROUPS[k].re.test(base)); };

/** Whether a property nothing sets yet is written as a Tailwind class or as CSS: Tailwind, except on elements styled only by their design's own CSS. */
export function modeFor(s) {
    if (s.added) return "tailwind";
    const toks = tokensOf(s);
    if (toks.length) return toks.some(isUtility) ? "tailwind" : "css";
    return ui.docTailwind ? "tailwind" : "css";
}

export const srcOf = (s, p) => ((s && s.sources) || {})[p] || { source: "default" };
const bare = (v) => String(v || "").replace(/:$/, "");
function srcTag(src) {
    if (src.source === "tailwind" || (src.source === "tie" && src.token)) return `<span class="stag tw" title="Tailwind class ${esc(src.token)}">TW${variantOf(src.token) ? ` ${esc(bare(variantOf(src.token)))}` : ""}</span>`;
    if (src.source === "inline") return '<span class="stag css" title="This element\'s style attribute">CSS</span>';
    if (src.source === "design") return `<span class="stag css" title="The design's CSS: ${esc(src.selector)}. Edits are written as an inline style that overrides it.">CSS</span>`;
    if (src.source === "parent") return `<span class="stag up" title="Set by ${esc(src.token)} on a parent element">${esc(src.token)}</span>`;
    return "";
}
const ownsValue = (src) => src.source === "tailwind" || src.source === "inline";
/** What a row shows: the class's own value on a Tailwind row (64, 1/2, red-500), the computed value otherwise. */
const shownOf = (s, p, src) => (src.source === "tailwind" && twShown(p, src.token)) || (s.computed || {})[p] || "";

function propRow(s, c) {
    const src = srcOf(s, c.p);
    const shown = shownOf(s, c.p, src);
    const comp = (s.computed || {})[c.p] ?? "";
    let control;
    if (c.t === "select") {
        const opts = c.o.includes(comp) || !comp ? c.o : [comp, ...c.o];
        control = `<select class="fi" data-prop="${c.p}">${opts.map((o) => `<option value="${esc(o)}" ${o === comp ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    } else if (c.t === "seg") {
        control = `<div class="seg2">${c.o.map((o) => `<button type="button" data-propseg="${c.p}" data-v="${o}" class="${comp === o || (o === "left" && comp === "start") ? "on" : ""}">${o[0].toUpperCase() + o.slice(1)}</button>`).join("")}</div>`;
    } else if (c.t === "color") {
        control = `<input type="color" class="cinp" data-propcolor="${c.p}" value="${rgbToHex(comp) || "#000000"}" title="Pick a color"><input class="fi" data-prop="${c.p}" list="dl-colors" value="${esc(shown)}" autocomplete="off">`;
    } else {
        control = `<input class="fi" data-prop="${c.p}" value="${esc(shown)}" ${c.list ? `list="${c.list}"` : ""} autocomplete="off">`;
    }
    const reset = ownsValue(src) ? `<button type="button" data-propreset="${c.p}" class="rst" title="${src.source === "tailwind" ? `Remove ${esc(src.token)}` : "Remove the inline value"}">×</button>` : "";
    return `<div class="row" title="${c.p}"><span class="lbl">${c.l}</span><div class="flex min-w-0 flex-1 items-center gap-1">${control}${srcTag(src)}${reset}</div></div>`;
}

function propBox(s) {
    const i = (p, ph) => {
        const src = srcOf(s, p);
        const kind = src.source === "tailwind" ? "tw" : src.source === "inline" || src.source === "design" ? "css" : "";
        const why = src.source === "tailwind" ? `Tailwind: ${src.token}` : src.source === "inline" ? "CSS: style attribute" : src.source === "design" ? `CSS: ${src.selector}` : src.source === "parent" ? `from ${src.token} on a parent` : "not set";
        return `<input class="bmi ${kind}" data-prop="${p}" value="${esc(String(shownOf(s, p, src)).replace(/px$/, ""))}" placeholder="${ph}" title="${p} (${esc(why)})" autocomplete="off">`;
    };
    return `<div class="bm"><span class="bml">margin</span><div class="bmr">${i("margin-top", "-")}</div>
        <div class="bmr mid">${i("margin-left", "-")}<div class="bp"><span class="bml">padding</span><div class="bmr">${i("padding-top", "-")}</div><div class="bmr mid">${i("padding-left", "-")}<div class="bc">${esc(s.tag)}</div>${i("padding-right", "-")}</div><div class="bmr">${i("padding-bottom", "-")}</div></div>${i("margin-right", "-")}</div>
        <div class="bmr">${i("margin-bottom", "-")}</div></div>`;
}

/** Children stacked in the normal flow: make them a row, a column or a grid, keeping their spacing (editor.js arrange). */
const arrangeRow = (s) => (s.arrange ? `<div class="arrange"><span>Arrange ${s.arrange.count} children</span>${[["row", "Row"], ["col", "Column"], ["grid", "Grid"]].map(([k, l]) => `<button type="button" data-arrange="${k}">${l}</button>`).join("")}</div>` : "");

function propSections(s) {
    return CSS_SECTIONS.map(([id, title, controls]) => {
        const props = controls === "box" ? ["margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left"] : controls.map((c) => c.p);
        const hasSet = props.some((p) => ownsValue(srcOf(s, p)));
        const open = ui.open.has(id) || (id === "css-offsets" && s.geom && s.geom.abs && !ui.closed.has(id)); // a free element is placed by these
        const body = (id === "css-layout" ? arrangeRow(s) : "") + (controls === "box" ? propBox(s) : controls.map((c) => propRow(s, c)).join(""));
        return `<div class="sec"><button type="button" class="sech" data-sec="${id}" data-open="${open}"><span class="car">${open ? "▾" : "▸"}</span><span class="t">${title}</span>${hasSet ? '<i class="dot"></i>' : ""}</button>${open ? `<div class="secb">${body}</div>` : ""}</div>`;
    }).join("");
}

const legend = (s) => `<p class="legend"><span class="stag tw">TW</span> Tailwind class <span class="stag css">CSS</span> style. Edits go where the value comes from; anything new is written as ${modeFor(s) === "tailwind" ? "Tailwind" : "CSS"}.</p>`;

// the tags an element can be switched to: structure and text (an image, an input or a line keeps its own)
const TAGS = ["div", "main", "section", "header", "footer", "nav", "article", "aside", "form", "p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "a", "button", "label", "ul", "ol", "li", "figure", "blockquote"];
const tagRow = (s) => (s.tag === "body" || !TAGS.includes(s.tag) ? "" : `<label class="row tagrow"><span class="lbl">Tag</span><select class="fi" data-tag>${TAGS.map((t) => `<option value="${t}" ${t === s.tag ? "selected" : ""}>&lt;${t}&gt;</option>`).join("")}</select></label>`);

function designTab(s) {
    return `<div class="crumbs">${crumbs(s)}</div>` + tagRow(s) + actions(s) + legend(s) + variantBar() + contentFields(s) + section(s, "geom", "Position and size", ["w"], geomBody) +
        propSections(s) + section(s, "tw-extras", "Tailwind extras", EXTRA_KEYS, extrasBody);
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
/** The page's type, and its root: the one top-level element (or the virtual one an empty design shows), or a way to make one. */
function rootHtml(pg) {
    const r = pg.root || {};
    const typeSeg = `<div class="row"><span class="lbl">Type</span><div class="seg2">${[["page", "Page"], ["component", "Component"]].map(([v, l]) => `<button type="button" data-pgtype="${v}" class="${pg.type === v ? "on" : ""}">${l}</button>`).join("")}</div></div>`;
    let body;
    if (r.several) body = `<p class="text-[10.5px] leading-relaxed text-neutral-500">This design has several top-level elements, so no single root to style.</p><button type="button" data-rootact="wrap" class="mt-1 w-full rounded border border-neutral-200 py-1 text-[10.5px] hover:bg-neutral-50">Wrap in a root</button>`;
    else if (r.loading) body = '<p class="text-[10.5px] text-neutral-500">Reading the root...</p>';
    else {
        const defaults = { bg: "#ffffff", color: "#000000" }; // what an empty colour field starts the picker on
        const bg = r.virtual ? (/\bbg-white\b/.test(r.classes || "") ? "#ffffff" : "") : rgbToHex(r.bg) || "";
        const color = r.virtual ? "" : rgbToHex(r.color) || "";
        const fontNow = /\bfont-serif\b/.test(r.classes || "") ? "serif" : /\bfont-mono\b/.test(r.classes || "") ? "mono" : !r.virtual && /mono/i.test(r.font || "") ? "mono" : !r.virtual && /serif/i.test(r.font || "") && !/sans-serif\s*$/i.test(r.font || "") && !/^ui-sans/i.test(r.font || "") ? "serif" : "sans";
        const swatch = (prop, label, v, fallback) => `<div class="row"><span class="lbl">${label}</span><div class="flex min-w-0 flex-1 items-center gap-1"><input type="color" class="cinp" data-rootcolor="${prop}" value="${v || fallback}" title="Pick a colour"><span class="text-[10.5px] text-neutral-600">${v ? v.toUpperCase() : "none"}</span></div></div>`;
        const tags = ["main", "div", "section", "article", "header", "footer", "form"];
        body = `<label class="row"><span class="lbl">Tag</span><select class="fi" data-roottag>${(tags.includes(r.tag) ? tags : [r.tag, ...tags]).map((t) => `<option value="${t}" ${t === r.tag ? "selected" : ""}>&lt;${t}&gt;</option>`).join("")}</select></label>
            ${swatch("background-color", "Background", bg, defaults.bg)}${swatch("color", "Text", color, defaults.color)}
            <label class="row"><span class="lbl">Font</span><select class="fi" data-rootfont>${["sans", "serif", "mono"].map((f) => `<option value="${f}" ${f === fontNow ? "selected" : ""}>${f[0].toUpperCase() + f.slice(1)}</option>`).join("")}</select></label>
            ${r.virtual ? '<p class="text-[10px] text-neutral-500">Not in the code yet: your first change here adds it.</p>' : `${pg.type === "page" ? lockRow(!pg.rootUnlocked) : ""}<button type="button" data-rootact="select" class="w-full rounded border border-neutral-200 py-1 text-[10.5px] hover:bg-neutral-50">Select the root</button>`}`;
    }
    return `<div class="sec"><div class="secb nopad"><p class="sub first">Design</p>${typeSeg}</div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Root ${r.tag && !r.several && !r.loading ? `<span class="muted">&lt;${esc(r.tag)}&gt;</span>` : ""}</p>${body}</div></div>`;
}

function pageHtml(pg) {
    const cell = (k, label, v, ph = "") => `<label class="cell"><span class="clbl">${label}</span><input class="fi" data-pg="${k}" value="${esc(v ?? "")}" placeholder="${ph}" autocomplete="off"></label>`;
    const dev = (w, l) => `<button type="button" data-pgw="${w}" class="flex-1 rounded border py-1 text-[10px] ${pg.w === w ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 hover:bg-neutral-50"}">${l}</button>`;
    const btn = (act, l) => `<button type="button" data-pgact="${act}" class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50">${l}</button>`;
    return `<div class="sec"><div class="secb nopad"><p class="sub first">Page</p>
            <label class="row"><span class="lbl">Name</span><input class="fi" data-pg="name" value="${esc(pg.name)}" autocomplete="off"></label>
            <div class="row"><span class="lbl">Version</span><span class="text-[11px] text-neutral-700">${pg.isNew ? "not saved yet" : `v${esc(pg.version)}`}${pg.project ? ` · ${esc(pg.project)}` : ""}</span></div></div></div>
        ${rootHtml(pg)}
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
