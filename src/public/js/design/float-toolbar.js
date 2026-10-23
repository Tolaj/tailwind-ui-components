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
        ${item("free", abs ? "Back to page flow" : "Free position")}
        ${st.sel && st.sel.count > 1 ? item("group", "Group", "Ctrl+G") : ""}${abs && st.sel.leaf === false ? item("ungroup", "Ungroup", "Ctrl+Shift+G") : ""}
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
        <span class="sep"></span>${btn("align", ICONS[align], `Align ${align}`)}${more(st)}`;
}

function shapeBar(st) {
    const cs = (st.sel && st.sel.computed) || {};
    const fill = rgbToHex(cs["background-color"] || "");
    const radius = num(cs["border-radius"]);
    const hasText = st.sel && st.sel.leaf === false ? false : true;
    return `<span class="lbl2">Fill</span>${swatch("fill", fill, "Fill color")}${hasText ? `<span class="lbl2">Text</span>${swatch("text", rgbToHex(cs.color || "") || "#000000", "Text color")}` : ""}
        <span class="sep"></span><span class="flex items-center pl-1 text-neutral-500" title="Corner radius">${ICONS.radius}</span><input type="number" min="0" max="999" data-ftin="radius" value="${radius === "" ? 0 : radius}" title="Corner radius">
        ${more(st)}`;
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
    return st.kind === "text" ? textBar(st) : shapeBar(st);
}

export const FAMILY_STACKS = {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};
