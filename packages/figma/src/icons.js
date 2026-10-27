// An icon exported from Figma has its colour written into the SVG (fill="#141414"). When the icon is one colour, the colour is moved
// out: the SVG uses currentColor and the wrapper gets a text-colour class, so recolouring the icon is one class in the Properties panel.

const NAMED = { white: "#ffffff", black: "#000000" }; // Figma writes pure white and black by name

/** "#aabbcc" for a colour written as a hex or as white/black, else null (none, a gradient reference, anything else). */
function hexOf(value) {
    const v = String(value).trim().toLowerCase();
    if (NAMED[v]) return NAMED[v];
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
    if (!m) return null;
    return m[1].length === 3 ? `#${[...m[1]].map((c) => c + c).join("")}` : v;
}

const PAINT_ATTR = /\s(fill|stroke)="([^"]*)"/g;

/**
 * @param {string} svg
 * @returns {{ svg: string, color: string } | null}  null when the icon is not one flat colour (gradients, filters, several colours...)
 */
export function recolourable(svg) {
    if (/<(linearGradient|radialGradient|pattern|image|filter|mask|style|foreignObject)\b/i.test(svg)) return null;
    if (/\sstyle="[^"]*(fill|stroke)/i.test(svg)) return null;
    const colours = new Set();
    let unknown = false;
    svg.replace(PAINT_ATTR, (m, attr, value) => {
        const v = value.trim().toLowerCase();
        if (v === "none" || v === "currentcolor") return m;
        const hex = hexOf(v);
        if (hex) colours.add(hex); else unknown = true; // url(#gradient), rgb(...), a name we do not know: leave the icon as it is
        return m;
    });
    if (unknown || colours.size !== 1) return null;
    return { color: [...colours][0], svg: svg.replace(PAINT_ATTR, (m, attr, value) => (hexOf(value) ? ` ${attr}="currentColor"` : m)) };
}
