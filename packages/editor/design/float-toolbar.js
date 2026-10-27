// The small toolbar that floats next to whatever is selected (text, a shape, or a whole frame).
// It only renders markup; editor.js places it and turns its clicks into edits.
import { rgbToHex } from "./css-props.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const ICONS = {
    bold: icon('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>'),
    italic: icon('<path d="M10 5h8M6 19h8M15 5 9 19"/>'),
    underline: icon('<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>'),
    link: icon('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    left: icon('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
    center: icon('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
    right: icon('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
    justify: icon('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'),
    radius: icon('<path d="M5 19v-7a7 7 0 0 1 7-7h7"/>'),
    border: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4.5" width="16" height="3.4" rx="1.2"/><rect x="4" y="10.3" width="16" height="2.4" rx="1.1"/><rect x="4" y="15.6" width="16" height="1.4" rx=".7"/></svg>',
    spacing: icon('<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" stroke-dasharray="3 2.6"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.6"/>'),
    sides: icon('<rect x="4" y="4" width="16" height="16" rx="3.5" stroke-dasharray="3.4 3"/>'),
    corners: icon('<path d="M4 9V7a3 3 0 0 1 3-3h2M15 4h2a3 3 0 0 1 3 3v2M20 15v2a3 3 0 0 1-3 3h-2M9 20H7a3 3 0 0 1-3-3v-2"/>'),
    none: icon('<circle cx="12" cy="12" r="8"/><path d="M6.3 6.3l11.4 11.4"/>'),
    solid: icon('<path d="M4 12h16"/>'),
    dashed: icon('<path d="M3 12h4M10 12h4M17 12h4"/>'),
    dotted: icon('<path d="M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01" stroke-width="2.4"/>'),
    more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>',
};

export const TEXT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button", "label", "li", "strong", "em", "small", "blockquote", "td", "th", "figcaption"]);
const SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : ""; };
const familyOf = (css) => {
    const first = String(css || "").split(",")[0].replace(/["']/g, "").trim().toLowerCase();
    if (/mono|courier|consolas|menlo/.test(first)) return "mono";
    if (/^(georgia|times|garamond|palatino|serif|ui-serif|cambria)/.test(first)) return "serif";
    return "sans";
};

const btn = (act, svg, title, on) => `<button type="button" class="tbtn ${on ? "on" : ""}" data-ft="${act}" title="${title}">${svg}</button>`;
const swatch = (kind, value, title) => `<label class="swatch" title="${title}" style="background:${value || "#fff"}${value ? "" : ";background-image:linear-gradient(135deg,transparent 46%,#e5484d 46%,#e5484d 54%,transparent 54%)"}"><input type="color" data-ftcol="${kind}" value="${value || "#000000"}"></label>`;

function moreMenu(st) {
    const abs = st.sel && st.sel.geom && st.sel.geom.abs;
    const item = (act, label, hint = "") => `<button type="button" data-ft="${act}" class="flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-left text-[12px] hover:bg-neutral-100"><span>${label}</span><span class="text-neutral-400">${hint}</span></button>`;
    return `<div class="pop absolute right-0 top-9 z-40 w-52 p-1">
        ${item("dup", "Duplicate", "Ctrl+D")}${item("up", "Move earlier")}${item("down", "Move later")}
        ${item("front", "Bring to front", "Ctrl+Shift+]")}${item("back", "Send to back", "Ctrl+Shift+[")}
        ${item("free", abs ? "Back to page flow" : "Free position")}
        ${st.sel && st.sel.count > 1 ? item("group", "Group", "Ctrl+G") : ""}${st.sel && (st.sel.group || (abs && st.sel.leaf === false)) ? item("ungroup", "Ungroup", "Ctrl+Shift+G") : ""}
        ${item("props", "All properties")}
        <div class="my-1 h-px bg-neutral-100"></div>${item("del", "Delete", "Del")}
    </div>`;
}

const more = (st) => `<span class="sep"></span><div class="relative">${btn("more", ICONS.more, "More", st.menu)}${st.menu ? moreMenu(st) : ""}</div>`;

function textBar(st) {
    const cs = (st.sel && st.sel.computed) || {};
    const size = num(cs["font-size"]);
    const fam = familyOf(cs["font-family"]);
    const color = rgbToHex(cs.color || "") || "#000000";
    const fill = rgbToHex(cs["background-color"] || "");
    const fmt = st.editing && st.fmt ? st.fmt : { bold: parseInt(cs["font-weight"], 10) >= 600, italic: cs["font-style"] === "italic", underline: /underline/.test(cs["text-decoration-line"] || "") };
    const align = ["center", "right", "justify"].includes(cs["text-align"]) ? cs["text-align"] : "left";
    const hasFill = st.sel && ["button", "a"].includes(st.sel.tag);
    return `<select data-ftsel="family" title="Font">${[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]].map(([v, l]) => `<option value="${v}" ${fam === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <input type="number" min="1" max="400" data-ftin="size" value="${size}" list="ft-sizes" title="Size">
        <datalist id="ft-sizes">${SIZES.map((n) => `<option value="${n}"></option>`).join("")}</datalist>
        <span class="sep"></span>${swatch("text", color, "Text color")}${hasFill ? swatch("fill", fill, "Fill color") : ""}
        <span class="sep"></span>${btn("bold", ICONS.bold, "Bold", fmt.bold)}${btn("italic", ICONS.italic, "Italic", fmt.italic)}${btn("underline", ICONS.underline, "Underline", fmt.underline)}${btn("link", ICONS.link, "Link")}
        <span class="sep"></span>${btn("align", ICONS[align], `Align ${align}`)}${st.editing ? "" : boxButtons(st)}${more(st)}`;
}

// Border, Radius and Spacing: three buttons, each opening a small panel above the bar (see popHtml)
const popBtn = (st, key, svg, title) => `<button type="button" class="tbtn ${st.pop === key ? "on" : ""}" data-ft="pop" data-arg="${key}" title="${title}">${svg}</button>`;
const boxButtons = (st) => `<span class="sep"></span>${popBtn(st, "border", ICONS.border, "Border")}${popBtn(st, "radius", ICONS.radius, "Corner radius")}${popBtn(st, "spacing", ICONS.spacing, "Padding and margin")}`;

function shapeBar(st) {
    const cs = (st.sel && st.sel.computed) || {};
    const fill = rgbToHex(cs["background-color"] || "");
    const hasText = st.sel && st.sel.leaf === false ? false : true;
    return `<span class="lbl2">Fill</span>${swatch("fill", fill, "Fill color")}${hasText ? `<span class="lbl2">Text</span>${swatch("text", rgbToHex(cs.color || "") || "#000000", "Text color")}` : ""}
        ${boxButtons(st)}${more(st)}`;
}

// ── The panels ───────────────────────────────────────────────────────────────
const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0; };
const field = (label, prop, value, min = 0) => `<label class="ffield"><span class="fl">${label}</span><input type="number" ${min === null ? "" : `min="${min}"`} step="1" data-ftp="${prop}" value="${value}"><span class="fu">px</span></label>`;
const sidesBtn = (key, open, svg = ICONS.sides) => `<button type="button" class="tbtn sidebtn ${open ? "on" : ""}" data-ft="side" data-arg="${key}" title="${open ? "Same on all sides" : "Each side on its own"}">${svg}</button>`;
/** Whether a group shows one field per side: your last choice, or automatically when the sides differ. */
const isOpen = (st, key, differs) => (st.sides && st.sides[key] !== undefined ? st.sides[key] : differs);
const same = (a) => a.every((v) => v === a[0]);
/** Four per-side fields in two rows, with the switch back to "all sides" at the end of the first row. */
const grid4 = (f, btn) => `<div class="fgrid">${f[0]}${f[1]}${btn}${f[2]}${f[3]}</div>`;

function borderPanel(st, cs) {
    const sides = ["top", "right", "bottom", "left"];
    const w = sides.map((d) => px(cs[`border-${d}-width`]));
    const seen = sides.find((d, i) => w[i] > 0) || "top";
    const kind = w.every((v) => v === 0) ? "none" : ["dashed", "dotted"].includes(cs[`border-${seen}-style`]) ? cs[`border-${seen}-style`] : "solid";
    const hex = (rgbToHex(cs[`border-${seen}-color`] || "") || "#000000").toUpperCase();
    const open = isOpen(st, "border", !same(w));
    const seg = ["none", "solid", "dashed", "dotted"].map((k) => `<button type="button" data-ft="bstyle" data-arg="${k}" title="${k[0].toUpperCase() + k.slice(1)}" class="${kind === k ? "on" : ""}">${ICONS[k]}</button>`).join("");
    const widths = open
        ? grid4(["top", "right", "bottom", "left"].map((d, i) => field(d[0].toUpperCase(), `bw-${d}`, w[i])), sidesBtn("border", true))
        : `<div class="frow">${field(ICONS.border, "bw-all", w[0])}${sidesBtn("border", false)}</div>`;
    return `<div class="fseg">${seg}</div>
        <div class="frow"><label class="swatch big" style="background:${hex}"><input type="color" data-ftp="border-color" value="${hex}"></label><input type="text" class="fhex" data-ftp="border-color-hex" value="${hex}" spellcheck="false"></div>
        ${widths}`;
}

function radiusPanel(st, cs) {
    const r = ["top-left", "top-right", "bottom-left", "bottom-right"].map((c) => px(cs[`border-${c}-radius`]));
    const open = isOpen(st, "radius", !same(r));
    return open
        ? grid4([["TL", "tl", 0], ["TR", "tr", 1], ["BL", "bl", 2], ["BR", "br", 3]].map(([l, k, i]) => field(l, `r-${k}`, r[i])), sidesBtn("radius", true, ICONS.corners))
        : `<div class="frow">${field("", "r-all", r[0])}${sidesBtn("radius", false, ICONS.corners)}</div>`;
}

function spacingPanel(st, cs) {
    const group = (key, title, prefix, min) => {
        const v = ["top", "right", "bottom", "left"].map((d) => px(cs[`${prefix}-${d}`]));
        const open = isOpen(st, key, v[0] !== v[2] || v[1] !== v[3]);
        const body = open
            ? grid4([["T", "top", 0], ["R", "right", 1], ["B", "bottom", 2], ["L", "left", 3]].map(([l, d, i]) => field(l, `${key}-${d}`, v[i], min)), sidesBtn(key, true))
            : `<div class="frow">${field("H", `${key}-h`, v[1], min)}${field("V", `${key}-v`, v[0], min)}${sidesBtn(key, false)}</div>`;
        return `<div class="fttl">${title}</div>${body}`;
    };
    return `${group("padding", "Padding", "padding", 0)}${group("margin", "Margin", "margin", null)}`;
}

/** The open panel, if any; placed by CSS above the bar (or below it when the bar is near the top). */
function popHtml(st) {
    if (!st.pop || !st.sel) return "";
    const cs = st.sel.computed || {};
    const body = st.pop === "border" ? borderPanel(st, cs) : st.pop === "radius" ? radiusPanel(st, cs) : spacingPanel(st, cs);
    return `<div class="ftpop">${body}</div>`;
}

export const DEVICES = [[1280, "Desktop"], [768, "Tablet"], [390, "Mobile"]];
function frameBar(st) {
    const f = st.frame;
    const preset = DEVICES.some(([w]) => w === f.w);
    // a Custom button appears once the frame has a size that isn't a preset, and keeps your last manual size within reach
    const custom = f.custom || (!preset ? { w: f.w, h: f.auto ? null : f.h } : null);
    const customBtn = custom
        ? `<button type="button" data-ftdev="custom" title="${custom.w} × ${custom.h || "auto"}" class="h-7 rounded-lg px-2 text-[12px] font-medium hover:bg-neutral-100 ${!preset ? "bg-neutral-100" : ""}">Custom</button>`
        : "";
    return `${DEVICES.map(([w, l]) => `<button type="button" data-ftdev="${w}" class="h-7 rounded-lg px-2 text-[12px] font-medium hover:bg-neutral-100 ${f.w === w ? "bg-neutral-100" : ""}">${l}</button>`).join("")}${customBtn}
        <span class="sep"></span><span class="lbl2">W</span><input type="number" min="120" max="8000" data-ftin="fw" value="${f.w}"><span class="lbl2">H</span><input type="number" min="120" max="20000" data-ftin="fh" value="${f.auto ? "" : f.h}" placeholder="auto" title="Leave empty to grow with the content">`;
}

export function toolbarHtml(st) {
    if (st.kind === "frame") return frameBar(st);
    return (st.kind === "text" ? textBar(st) : shapeBar(st)) + popHtml(st);
}

export const FAMILY_STACKS = {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};
