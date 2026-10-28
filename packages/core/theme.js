// A project's theme: a short list of choices that every part (the canvas, the previews, the catalog, the exports) reads.
//   brand    one colour (hex); the 11 steps of its scale (brand-50 … brand-950) are made from it, with the colour itself as brand-600
//   gray     which of Tailwind's neutral palettes `gray-*` means in this project (slate, gray, zinc, neutral, stone)
//   font     the sans font (a Google Fonts family, or "System")
//   radius   how round corners are (none, sm, md, lg, xl): the rounded-* sizes follow it
// tailwindConfig() is the object for `tailwind.config` (the play CDN, or a project's own tailwind.config.js); themeHead() is the HTML
// a preview document needs for it (the config, the font link). Pure functions: nothing here touches a page or a database.

export const GRAYS = ["slate", "gray", "zinc", "neutral", "stone"];
export const RADII = ["none", "sm", "md", "lg", "xl"];
export const SYSTEM_FONT = "System";
export const DEFAULT_THEME = Object.freeze({ brand: "#4f46e5", gray: "slate", font: "Inter", radius: "md" });

const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const PALETTES = {
    slate: ["f8fafc", "f1f5f9", "e2e8f0", "cbd5e1", "94a3b8", "64748b", "475569", "334155", "1e293b", "0f172a", "020617"],
    gray: ["f9fafb", "f3f4f6", "e5e7eb", "d1d5db", "9ca3af", "6b7280", "4b5563", "374151", "1f2937", "111827", "030712"],
    zinc: ["fafafa", "f4f4f5", "e4e4e7", "d4d4d8", "a1a1aa", "71717a", "52525b", "3f3f46", "27272a", "18181b", "09090b"],
    neutral: ["fafafa", "f5f5f5", "e5e5e5", "d4d4d4", "a3a3a3", "737373", "525252", "404040", "262626", "171717", "0a0a0a"],
    stone: ["fafaf9", "f5f5f4", "e7e5e4", "d6d3d1", "a8a29e", "78716c", "57534e", "44403c", "292524", "1c1917", "0c0a09"],
};
const RADIUS_PX = { none: 0, sm: 3, md: 6, lg: 10, xl: 16 };
const SYSTEM_STACK = ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"];

const HEX = /^#?([0-9a-f]{6})$/i;
const FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 ]{0,39}$/;

/** A theme from anything: every field checked, anything invalid replaced by the default. */
export function normalizeTheme(input) {
    const t = input && typeof input === "object" ? input : {};
    const hex = HEX.exec(String(t.brand || ""));
    return {
        brand: hex ? `#${hex[1].toLowerCase()}` : DEFAULT_THEME.brand,
        gray: GRAYS.includes(t.gray) ? t.gray : DEFAULT_THEME.gray,
        font: typeof t.font === "string" && (t.font === SYSTEM_FONT || FONT_NAME.test(t.font.trim())) ? t.font.trim() : DEFAULT_THEME.font,
        radius: RADII.includes(t.radius) ? t.radius : DEFAULT_THEME.radius,
    };
}

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** The 11 steps of the brand colour: the colour is 600; lighter steps mix it with white, darker ones with black. */
export function brandScale(hex) {
    const base = toRgb(normalizeTheme({ brand: hex }).brand), white = [255, 255, 255], black = [0, 0, 0];
    const mixes = { 50: [white, 0.92], 100: [white, 0.84], 200: [white, 0.68], 300: [white, 0.5], 400: [white, 0.28], 500: [white, 0.12], 700: [black, 0.18], 800: [black, 0.36], 900: [black, 0.52], 950: [black, 0.68] };
    return Object.fromEntries(STEPS.map((s) => [s, s === "600" ? toHex(base) : toHex(mix(base, ...mixes[s]))]));
}

/** One of Tailwind's neutral palettes as { 50: "#…", … 950: "#…" }. */
export const grayScale = (name) => Object.fromEntries(STEPS.map((s, i) => [s, `#${PALETTES[GRAYS.includes(name) ? name : DEFAULT_THEME.gray][i]}`]));

/** The rounded-* sizes for a radius choice, in px. */
export function radiusScale(radius) {
    const r = RADIUS_PX[RADII.includes(radius) ? radius : DEFAULT_THEME.radius];
    const px = (v) => `${Math.round(v * 100) / 100}px`;
    return { none: "0px", sm: px(r * 0.5), DEFAULT: px(r * 0.66), md: px(r), lg: px(r * 1.5), xl: px(r * 2), "2xl": px(r * 2.67), "3xl": px(r * 4), full: "9999px" };
}

/** The `tailwind.config` object for a theme (dark mode follows a `dark` class, so a page can switch it). */
export function tailwindConfig(theme) {
    const t = normalizeTheme(theme);
    return {
        darkMode: "class",
        theme: {
            extend: {
                colors: { brand: brandScale(t.brand), gray: grayScale(t.gray) },
                fontFamily: { sans: t.font === SYSTEM_FONT ? SYSTEM_STACK : [t.font, ...SYSTEM_STACK] },
                borderRadius: radiusScale(t.radius),
            },
        },
    };
}

/** The Google Fonts stylesheet URL for the theme's font, or null for the system font. */
export const fontUrl = (theme) => {
    const f = normalizeTheme(theme).font;
    return f === SYSTEM_FONT ? null : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
};

/** What a preview document's <head> needs after the Tailwind script: the font and the config. */
export function themeHead(theme) {
    const url = fontUrl(theme);
    const config = JSON.stringify(tailwindConfig(theme)).replace(/</g, "\\u003c");
    return `${url ? `<link rel="stylesheet" href="${url}">\n` : ""}<script data-wc-theme>tailwind.config = ${config};<\/script>`;
}
