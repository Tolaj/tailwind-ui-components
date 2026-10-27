// A Figma text node as a paragraph (or spans, when its style changes inside).
import { ClassBag, round, px, arb } from "./classes.js";
import { textColorOf } from "./paint.js";

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

/** 600 from a style name like "SemiBold Italic" (the longer names are tried first). */
export function weightOf(style = "") {
    const s = style.toLowerCase().replace(/[\s-]/g, "");
    const hit = WEIGHT_NAMES.find(([name]) => s.includes(name));
    return hit ? hit[1] : 400;
}

/** The look of one run of text. `fonts` collects each family with the weights used (for the page's font link). */
export function styleClasses(s, bag, fonts) {
    const family = s.fontName && s.fontName.family;
    const weight = s.fontWeight || weightOf(s.fontName && s.fontName.style);
    if (family) {
        bag.add(`font-['${arb(family)}',${genericFor(family)}]`);
        if (!fonts.has(family)) fonts.set(family, new Set());
        fonts.get(family).add(weight);
    }
    if (s.fontSize) bag.set("fontSize", px("fontSize", s.fontSize));
    if (WEIGHTS[weight] && weight !== 400) bag.set("fontWeight", WEIGHTS[weight]);
    if (s.fontName && /italic|oblique/i.test(s.fontName.style || "")) bag.set("fontStyle", "italic");
    const color = textColorOf(s.fills);
    if (color) bag.set("textColor", color);
    if (s.textDecoration === "UNDERLINE") bag.set("textDecoration", "underline");
    if (s.textDecoration === "STRIKETHROUGH") bag.set("textDecoration", "line-through");
    if (s.textCase === "UPPER") bag.set("textTransform", "uppercase");
    if (s.textCase === "LOWER") bag.set("textTransform", "lowercase");
    if (s.textCase === "TITLE") bag.set("textTransform", "capitalize");
    const ls = s.letterSpacing;
    if (ls && ls.value) bag.add(`tracking-[${ls.unit === "PERCENT" ? `${round(ls.value / 100, 3)}em` : `${round(ls.value)}px`}]`);
    return bag;
}

/** Line height: pixels become a scale step or `leading-[Npx]`; percent a unitless number. "Auto" writes nothing. */
function lineHeightClass(lh, bag) {
    if (!lh || lh.unit === "AUTO") return;
    if (lh.unit === "PIXELS") bag.set("leading", [12, 16, 20, 24, 28, 32, 36, 40].includes(round(lh.value)) ? String(round(lh.value) / 4) : `[${round(lh.value)}px]`);
    else if (lh.unit === "PERCENT") bag.set("leading", `[${round(lh.value / 100, 3)}]`);
}

const lines = (text) => escapeHtml(text).replace(/\r?\n|\u2028/g, "<br>");

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
    if (segs.length === 1) {
        styleClasses({ ...node, ...first }, bag, ctx.fonts);
        return { tag: "p", bag, inner: lines(first.characters) };
    }
    styleClasses({ ...node, ...first }, bag, ctx.fonts); // what the runs share is the first run's; each span repeats only what it changes
    const inner = segs.map((s) => {
        const sb = new ClassBag(ctx.warn);
        styleClasses({ ...node, ...s }, sb, ctx.fonts);
        const cls = sb.toString();
        return cls ? `<span class="${cls}">${lines(s.characters)}</span>` : lines(s.characters);
    }).join("");
    return { tag: "p", bag, inner };
}
