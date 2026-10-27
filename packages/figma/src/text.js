// A Figma text node as a paragraph (or spans, when its style changes inside).
import { ClassBag, round, px, arb } from "./classes.js";
import { textColorOf } from "./paint.js";
import { colorValue } from "./color.js";
import { GROUPS } from "@windcraft/core/class-groups.js";
import { onGoogleFonts } from "./fonts.js";

const WEIGHTS = { 100: "font-thin", 200: "font-extralight", 300: "font-light", 400: "font-normal", 500: "font-medium", 600: "font-semibold", 700: "font-bold", 800: "font-extrabold", 900: "font-black" };
const WEIGHT_NAMES = [["thin", 100], ["hairline", 100], ["extralight", 200], ["ultralight", 200], ["light", 300], ["regular", 400], ["normal", 400], ["medium", 500], ["semibold", 600], ["demibold", 600], ["extrabold", 800], ["ultrabold", 800], ["bold", 700], ["black", 900], ["heavy", 900]];
const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The generic family a browser falls back to when the font is not there. */
export function genericFor(family) {
    if (/mono|code|courier|consolas|menlo/i.test(family)) return "monospace";
    if (/sans|grotesk|gothic|helvet|arial|inter\b|roboto|gilroy|poppins|montserrat|nunito/i.test(family)) return "sans-serif";
    if (/serif|display|chronicle|times|georgia|garamond|playfair|merriweather|lora\b|baskerville|didot|bodoni|caslon|cormorant|libre franklin|spectral|crimson/i.test(family)) return "serif";
    return "sans-serif";
}

/** The Google Fonts family to load in place of one that is not on Google Fonts (the rules list which), or undefined. The original name stays first in the font list, so the real font wins once it is available. */
export const substituteFor = (family, subs) => (subs.find(([re]) => re.test(family)) || [])[1];

/** 600 from a style name like "SemiBold Italic" (the longer names are tried first). */
export function weightOf(style = "") {
    const s = style.toLowerCase().replace(/[\s-]/g, "");
    const hit = WEIGHT_NAMES.find(([name]) => s.includes(name));
    return hit ? hit[1] : 400;
}

/** The look of one run of text. `fonts` collects each family with the weights used (for the page's font link). */
export function styleClasses(s, bag, fonts, rules) {
    const family = s.fontName && s.fontName.family;
    const weight = s.fontWeight || weightOf(s.fontName && s.fontName.style);
    if (family) {
        // a stand-in: the hand-made rules first, then one chosen by measuring the real font in the design (fonts.js)
        const sub = substituteFor(family, rules.fontSubstitutes) || (!onGoogleFonts(family) && fonts.picks && fonts.picks.get(family)) || undefined;
        bag.add(`font-['${arb(family)}',${sub ? `'${arb(sub)}',` : ""}${genericFor(sub || family)}]`);
        if (sub) (fonts.replaced = fonts.replaced || new Map()).set(family, sub);
        if (!onGoogleFonts(family)) { // a font Google does not have: the user can upload its file
            fonts.custom = fonts.custom || new Map();
            if (!fonts.custom.has(family)) fonts.custom.set(family, new Set());
            fonts.custom.get(family).add(weight);
        }
        const load = sub || family; // the family the page asks Google Fonts for (only a family Google has: another would be an error)
        if (onGoogleFonts(load)) { if (!fonts.has(load)) fonts.set(load, new Set()); fonts.get(load).add(weight); }
    }
    if (s.fontSize) bag.set("fontSize", px("fontSize", s.fontSize));
    if (WEIGHTS[weight] && weight !== 400) bag.set("fontWeight", WEIGHTS[weight]);
    if (s.fontName && /italic|oblique/i.test(s.fontName.style || "")) bag.set("fontStyle", "italic");
    const color = textColorOf(s.fills);
    if (color) bag.set("textColor", color);
    if (s.textDecoration === "UNDERLINE") bag.set("textDecoration", "underline");
    if (s.textDecoration === "STRIKETHROUGH") bag.set("textDecoration", "line-through");
    if (s.textDecoration === "UNDERLINE" || s.textDecoration === "STRIKETHROUGH") decorationDetails(s, bag);
    if (s.textCase === "UPPER") bag.set("textTransform", "uppercase");
    if (s.textCase === "LOWER") bag.set("textTransform", "lowercase");
    if (s.textCase === "TITLE") bag.set("textTransform", "capitalize");
    const ls = s.letterSpacing;
    if (ls && ls.value) bag.add(`tracking-[${ls.unit === "PERCENT" ? `${round(ls.value / 100, 3)}em` : `${round(ls.value)}px`}]`);
    return bag;
}

/** The style, thickness, offset, colour and ink-skipping of an underline or strike-through. */
function decorationDetails(s, bag) {
    const style = { DOTTED: "dotted", WAVY: "wavy" }[s.textDecorationStyle];
    if (style) bag.add(`decoration-${style}`);
    const length = (o) => (o && typeof o === "object" && Number.isFinite(o.value) ? (o.unit === "PERCENT" ? `${round(o.value / 100, 3)}em` : `${round(o.value)}px`) : null);
    const offset = length(s.textDecorationOffset), thickness = length(s.textDecorationThickness);
    if (offset && s.textDecoration === "UNDERLINE") bag.add(`underline-offset-[${offset}]`);
    if (thickness) bag.add(`decoration-[${thickness}]`);
    const paint = s.textDecorationColor && s.textDecorationColor.value;
    const color = paint && typeof paint === "object" ? (paint.color ? colorValue(paint.color, paint.opacity ?? 1) : "r" in paint ? colorValue(paint, paint.a ?? 1) : null) : null;
    if (color) bag.add(`decoration-[${color}]`);
    if (s.textDecorationSkipInk === false) bag.add("[text-decoration-skip-ink:none]");
}

/** Line height: pixels become a scale step or `leading-[Npx]`; percent a unitless number. "Auto" writes nothing. */
function lineHeightClass(lh, bag) {
    if (!lh || lh.unit === "AUTO") return;
    if (lh.unit === "PIXELS") bag.set("leading", [12, 16, 20, 24, 28, 32, 36, 40].includes(round(lh.value)) ? String(round(lh.value) / 4) : `[${round(lh.value)}px]`);
    else if (lh.unit === "PERCENT") bag.set("leading", `[${round(lh.value / 100, 3)}]`);
}

const lines = (text) => escapeHtml(text).replace(/\r?\n|\u2028/g, "<br>");

/** A run of text that is a link in the design becomes an <a> (only web, mail and phone addresses: nothing that could run code). */
function linked(seg, html) {
    const url = seg.hyperlink && seg.hyperlink.type === "URL" ? String(seg.hyperlink.value || "") : "";
    return /^(https?:\/\/|mailto:|tel:)/i.test(url) ? `<a href="${url.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" target="_blank" rel="noopener">${html}</a>` : html;
}

/** How many lines fit a fixed-height box (for text cut with "…" in Figma without a line count). */
function linesThatFit(node, first) {
    const lh = (node.lineHeight || first.lineHeight || {});
    const linePx = lh.unit === "PIXELS" ? lh.value : (first.fontSize || node.fontSize || 16) * (lh.unit === "PERCENT" ? lh.value / 100 : 1.2);
    return Math.max(1, Math.floor((node.height || linePx) / linePx + 0.01));
}

/**
 * The text node's element as { tag, bag, inner }: `bag` has the text's own classes (the caller adds size and position),
 * `inner` is the escaped text, or spans when the style changes inside.
 */
export function textElement(node, ctx) {
    const bag = new ClassBag(ctx.warn);
    const segs = node.segments && node.segments.length ? node.segments : [{ characters: node.characters, ...node }];
    const first = segs[0];
    lineHeightClass(node.lineHeight || first.lineHeight, bag);
    if (node.textAlignHorizontal && node.textAlignHorizontal !== "LEFT") bag.set("textAlign", `text-${node.textAlignHorizontal.toLowerCase()}`);
    if (node.textAutoResize === "WIDTH_AND_HEIGHT") bag.set("whitespace", "whitespace-nowrap");
    // text cut with "…" at a number of lines
    const truncating = node.textTruncation === "ENDING";
    if (truncating) { const n = node.maxLines || linesThatFit(node, first); bag.add(n <= 6 ? `line-clamp-${n}` : `line-clamp-[${n}]`); }
    // a fixed box with its text in the middle or at the bottom (the box is a flex column, the text its one item)
    const vertical = !truncating && node.textAutoResize === "NONE" && { CENTER: "justify-center", BOTTOM: "justify-end" }[node.textAlignVertical];
    if (vertical) bag.set("display", "flex").set("flexDir", "flex-col").set("justify", vertical);
    const wrap = (html) => (vertical ? `<span>${html}</span>` : html);
    if (node.paragraphIndent > 0) bag.add(`indent-[${round(node.paragraphIndent)}px]`);
    styleClasses({ ...node, ...first }, bag, ctx.fonts, ctx.rules); // what the runs share is the first run's; each span repeats only what it changes
    const single = segs.length === 1;
    const run = (s, part) => {
        if (single) return linked(s, lines(part));
        const sb = new ClassBag(ctx.warn);
        styleClasses({ ...node, ...s }, sb, ctx.fonts, ctx.rules);
        const cls = sb.toString();
        return linked(s, cls ? `<span class="${cls}">${lines(part)}</span>` : lines(part));
    };
    // space between paragraphs: each paragraph (text between "\n") is a block with a margin under it; without it a "\n" is a line break
    const gap = node.paragraphSpacing > 0 ? node.paragraphSpacing : 0;
    if (gap && segs.some((s) => /\n/.test(s.characters))) {
        const paras = [[]];
        segs.forEach((s) => s.characters.split("\n").forEach((part, i) => { if (i > 0) paras.push([]); if (part) paras[paras.length - 1].push(run(s, part)); }));
        return { tag: "p", bag, inner: wrap(paras.map((runs) => `<span class="block ${GROUPS.mb.build(px("mb", gap))} last:mb-0">${runs.join("") || "<br>"}</span>`).join("")) };
    }
    return { tag: "p", bag, inner: wrap(segs.map((s) => run(s, s.characters)).join("")) };
}
