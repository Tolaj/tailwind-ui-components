// The converter's knowledge that is data, not logic: which free font stands in for a paid one, and which layer names mean a button, a
// nav bar... The plugin carries this copy and refreshes it from Windcraft's server when it opens (GET /api/figma/rules), so these
// lists can be improved without publishing a new plugin version. Only plain data, never code: patterns are text, compiled here.

export const DEFAULT_RULES = {
    version: "2026-10-28.1",
    // [a pattern for the font's name (case-insensitive), the Google Fonts family to load in its place]
    fontSubstitutes: [
        ["^gilroy|^gotham|^proxima", "Montserrat"], ["^circular|^sofia", "DM Sans"], ["^avenir", "Nunito Sans"], ["^futura", "Jost"],
        ["^(sf pro|sf ui|helvetica|neue haas|graphik|akkurat|suisse|aeonik|general sans|satoshi)", "Inter"],
        ["^(chronicle|didot|bodoni|canela|gt super|tiempos|freight|ivar)", "Playfair Display"], ["^(georgia|times)", "Libre Baskerville"],
        ["^(sf mono|menlo|consolas|monaco)", "JetBrains Mono"],
    ],
    // words in a layer's name (whole words, any case) and the element they make
    words: {
        button: "button|btn|cta", link: "link", nav: "nav|navbar|navigation|menu bar", footer: "footer", header: "header|topbar|top bar|app bar",
        // a big layer straight under the page, named like a part of a page, is a <section>
        section: "section|hero|content|features?|pricing|testimonials?|about|contact|faq|team|blog|gallery|slider|showcase",
    },
};

const MAX_PATTERN = 200;
const compiles = (source) => { try { new RegExp(source, "i"); return true; } catch { return false; } };
const okPattern = (s) => typeof s === "string" && s.length > 0 && s.length <= MAX_PATTERN && compiles(s);

/**
 * Rules from data (the bundled copy, or what the server sent) made ready to use. Anything that is not the right shape, too long or
 * not a valid pattern is ignored and the bundled value is used instead, so bad data can never break a conversion.
 */
export function compileRules(data) {
    const d = data && typeof data === "object" ? data : {};
    const subs = Array.isArray(d.fontSubstitutes)
        ? d.fontSubstitutes.filter((e) => Array.isArray(e) && okPattern(e[0]) && typeof e[1] === "string" && e[1].length > 0 && e[1].length <= 60).slice(0, 500)
        : null;
    const words = {};
    for (const key of Object.keys(DEFAULT_RULES.words)) {
        const source = d.words && okPattern(d.words[key]) ? d.words[key] : DEFAULT_RULES.words[key];
        words[key] = new RegExp(`(^|[^a-z])(${source})([^a-z]|$)`, "i");
    }
    return {
        version: typeof d.version === "string" ? d.version.slice(0, 40) : DEFAULT_RULES.version,
        fontSubstitutes: (subs && subs.length ? subs : DEFAULT_RULES.fontSubstitutes).map(([p, family]) => [new RegExp(p, "i"), family]),
        words,
    };
}
