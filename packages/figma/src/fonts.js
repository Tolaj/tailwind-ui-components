// Which free font stands in for one that is not on Google Fonts. The real font is measured from Figma itself: a text that sizes to its
// content has a width, so width / (letters x size) is how wide that font sets text. The free font (from font-data.js, measured the same
// way) whose width is closest is the stand-in, so a line wraps where it did in Figma. Hand-made rules (rules.js) are tried first.
import { GOOGLE_FAMILIES, CANDIDATES } from "./font-data.js";

const GOOGLE = new Set(GOOGLE_FAMILIES.map((f) => f.toLowerCase()));
export const onGoogleFonts = (family) => GOOGLE.has(String(family).toLowerCase());

const CANDIDATE_BY_NAME = new Map(CANDIDATES.map((c) => [c[0].toLowerCase(), c]));
// well-known families win a near tie: they are the ones people expect to see
const PREFERRED = new Set(["inter", "montserrat", "poppins", "roboto", "dm sans", "open sans", "lato", "nunito sans", "work sans", "manrope", "playfair display", "lora", "libre baskerville", "merriweather", "source serif 4", "dm serif display", "eb garamond", "jetbrains mono", "fira code", "ibm plex mono"]);

/** What kind of font a name sounds like: a monospace, a serif or (the usual case) a sans. */
export function kindOf(family) {
    if (/mono|code|courier|consolas|menlo|typewriter/i.test(family)) return "mono";
    if (/sans|grotesk|gothic|helvet|arial|roman\b.*sans/i.test(family)) return "sans";
    if (/serif|display|chronicle|times|georgia|garamond|didot|bodoni|canela|baskerville|playfair|caslon|cormorant|freight|tiempos|ivar|editorial|newsreader/i.test(family)) return "serif";
    return "sans";
}

const MIN_CHARS = 30; // below this much text the width says too little
const MAX_ERROR = 0.1; // a stand-in whose width is more than 10% off is no better than the browser's default

const isBold = (n) => (n.fontWeight || 0) >= 600 || /bold|black|heavy|semi|demi/i.test((n.fontName && n.fontName.style) || "");

/** The width samples in a design: for each font family, [{ bold, chars, ratio }]. Only single-line texts that size to their content. */
export function collectSamples(root) {
    const byFamily = new Map();
    (function walk(n) {
        if (n.visible === false) return;
        if (n.type === "TEXT" && n.fontName && n.fontName.family && typeof n.characters === "string" && n.textAutoResize === "WIDTH_AND_HEIGHT"
            && !/[\n\u2028]/.test(n.characters) && !(n.segments && n.segments.length > 1) && (!n.textCase || n.textCase === "ORIGINAL")) {
            const chars = [...n.characters].length, size = n.fontSize;
            const ls = n.letterSpacing && n.letterSpacing.value ? (n.letterSpacing.unit === "PERCENT" ? (n.letterSpacing.value / 100) * size : n.letterSpacing.value) : 0;
            const ratio = size && n.width > 0 ? (n.width - ls * chars) / (chars * size) : 0;
            if (chars >= 4 && ratio > 0.2 && ratio < 1.2) {
                if (!byFamily.has(n.fontName.family)) byFamily.set(n.fontName.family, []);
                byFamily.get(n.fontName.family).push({ bold: isBold(n), chars, ratio });
            }
        }
        (n.children || []).forEach(walk);
    })(root);
    return byFamily;
}

/** How a free font sets text, as a share of its size: its regular and its bold measure. */
const expected = (candidate, bold) => (bold ? candidate[3] : candidate[2]);

/**
 * How much wider (>1) or narrower (<1) text in this design is than the measured sample, taken from the families that are on Google Fonts
 * (their real widths are known). It corrects for the sentence the fonts were measured on not being the design's own text.
 */
function calibration(samples) {
    const factors = [];
    for (const [family, list] of samples) {
        const c = CANDIDATE_BY_NAME.get(family.toLowerCase());
        const chars = list.reduce((n, s) => n + s.chars, 0);
        if (!c || chars < MIN_CHARS) continue;
        factors.push(list.reduce((n, s) => n + (s.ratio / expected(c, s.bold)) * s.chars, 0) / chars);
    }
    if (!factors.length) return 1;
    factors.sort((a, b) => a - b);
    return Math.min(1.25, Math.max(0.8, factors[Math.floor(factors.length / 2)]));
}

/** The free font that sets text as wide as `list` (a family's samples) does, or undefined when none is close enough. */
export function bestMatch(family, list, k = 1) {
    const chars = list.reduce((n, s) => n + s.chars, 0);
    if (chars < MIN_CHARS) return undefined;
    const kind = kindOf(family);
    const mean = list.reduce((n, s) => n + (s.ratio / k) * s.chars, 0) / chars;
    let best, bestScore = Infinity, bestError = Infinity;
    for (const c of CANDIDATES) {
        if (c[1] !== kind) continue;
        const error = list.reduce((n, s) => n + Math.abs(s.ratio / k - expected(c, s.bold)) * s.chars, 0) / chars / mean;
        const score = error - (PREFERRED.has(c[0].toLowerCase()) ? 0.012 : 0);
        if (score < bestScore) { best = c[0]; bestScore = score; bestError = error; }
    }
    return bestError <= MAX_ERROR ? best : undefined;
}

/**
 * Stand-ins for the design's fonts that are not on Google Fonts and have no hand-made rule: Map(family -> free family).
 * @param {object} root   the design (layer data)
 * @param {(family: string) => string | undefined} hasRule   the rules' own stand-in for a family, if any
 */
export function pickSubstitutes(root, hasRule) {
    const picks = new Map();
    const samples = collectSamples(root);
    if (!samples.size) return picks;
    const k = calibration(samples);
    for (const [family, list] of samples) {
        if (onGoogleFonts(family) || hasRule(family)) continue;
        const best = bestMatch(family, list, k);
        if (best) picks.set(family, best);
    }
    return picks;
}
