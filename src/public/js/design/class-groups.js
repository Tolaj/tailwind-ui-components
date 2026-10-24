// A registry of Tailwind utility groups. Each group is a set of mutually exclusive classes
// (for example every font size). Controls read and write a group for a chosen variant
// (breakpoint and state), e.g. "md:hover:".
export const HUES = ["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
export const SPECIAL_COLORS = ["black", "white", "transparent", "current"];

export const STEPS = ["0", "px", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96"];
export const SIZES = [...STEPS, "auto", "full", "screen", "min", "max", "fit", "1/2", "1/3", "2/3", "1/4", "3/4", "1/5", "2/5", "3/5", "4/5"];
export const MAX_W = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "full", "prose", "screen-sm", "screen-md", "screen-lg", "screen-xl"];

const STEP = "\\d+(?:\\.5)?|px";
const SIZE = `${STEP}|auto|full|screen|min|max|fit|\\d+/\\d+`;
const ARB = "\\[[^\\]]+\\]";
const HUE_RE = HUES.join("|");
const COLOR = `(?:(?:${HUE_RE})-\\d{2,3}|black|white|transparent|current|inherit|\\[(?:#|rgb|hsl|var)[^\\]]*\\])(?:/\\d+|/\\[[^\\]]+\\])?`;

const normArb = (v) => {
    v = String(v).trim();
    if (/^\[.*\]$/.test(v)) return v;
    if (/^-?\d*\.?\d+(px|rem|em|%|vh|vw|vmin|vmax|ch|deg|ms|s|fr)$/.test(v) || /^(calc|var|min|max|clamp)\(/.test(v)) return `[${v}]`;
    return v;
};
const normColor = (v) => {
    v = String(v).trim();
    if (/^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/.test(v)) return `[${v.replace(/\s+/g, "_")}]`;
    return v;
};

// prefix-value utility (w-4, -mt-2, gap-x-[10px])
const P = (prefix, vals, { neg = false, arb = true } = {}) => ({
    re: new RegExp(`^(${neg ? "-?" : ""})${prefix}-(${vals}${arb ? `|${ARB}` : ""})$`),
    read: (m) => (m[1] || "") + m[2],
    build: (v) => {
        let sign = "";
        v = String(v).trim();
        if (neg && v.startsWith("-")) { sign = "-"; v = v.slice(1); }
        return `${sign}${prefix}-${normArb(v)}`;
    },
});
// exact words (display: flex)
const E = (alts) => ({ re: new RegExp(`^(${alts})$`), read: (m) => m[1], build: (v) => v });
// color utility with optional /opacity
const C = (prefix) => ({
    re: new RegExp(`^${prefix}-(${COLOR})$`),
    read: (m) => m[1],
    build: (v) => `${prefix}-${normColor(v)}`,
});

export const GROUPS = {
    // layout
    display: E("block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents|table|flow-root"),
    position: E("static|fixed|absolute|relative|sticky"),
    overflow: E("overflow-(?:auto|hidden|visible|scroll|clip)"),
    overflowX: E("overflow-x-(?:auto|hidden|visible|scroll|clip)"),
    overflowY: E("overflow-y-(?:auto|hidden|visible|scroll|clip)"),
    z: P("z", "\\d+|auto", { neg: true }),
    visibility: E("visible|invisible"),
    // flex and grid
    flexDir: E("flex-(?:row|col|row-reverse|col-reverse)"),
    flexWrap: E("flex-(?:wrap|nowrap|wrap-reverse)"),
    justify: E("justify-(?:start|center|end|between|around|evenly|stretch|normal)"),
    items: E("items-(?:start|center|end|stretch|baseline)"),
    content: E("content-(?:start|center|end|between|around|evenly|stretch)"),
    self: E("self-(?:auto|start|center|end|stretch|baseline)"),
    grow: E("grow|grow-0"),
    shrink: E("shrink|shrink-0"),
    flexNum: E("flex-(?:1|auto|initial|none)"),
    gap: P("gap", STEP),
    gapX: P("gap-x", STEP),
    gapY: P("gap-y", STEP),
    gridCols: P("grid-cols", "\\d+|none|subgrid"),
    gridRows: P("grid-rows", "\\d+|none|subgrid"),
    colSpan: P("col-span", "\\d+|full"),
    rowSpan: P("row-span", "\\d+|full"),
    order: P("order", "\\d+|first|last|none", { neg: true }),
    // size
    w: P("w", SIZE),
    h: P("h", SIZE),
    minW: P("min-w", `${STEP}|full|min|max|fit`),
    maxW: P("max-w", `${STEP}|${MAX_W.join("|")}|fit|min|max`),
    minH: P("min-h", `${STEP}|full|screen|min|max|fit`),
    maxH: P("max-h", `${STEP}|full|screen|min|max|fit|none`),
    aspect: P("aspect", "auto|square|video"),
    objectFit: E("object-(?:contain|cover|fill|none|scale-down)"),
    // spacing
    p: P("p", STEP), px: P("px", STEP), py: P("py", STEP), pt: P("pt", STEP), pr: P("pr", STEP), pb: P("pb", STEP), pl: P("pl", STEP),
    m: P("m", `${STEP}|auto`, { neg: true }), mx: P("mx", `${STEP}|auto`, { neg: true }), my: P("my", `${STEP}|auto`, { neg: true }),
    mt: P("mt", `${STEP}|auto`, { neg: true }), mr: P("mr", `${STEP}|auto`, { neg: true }), mb: P("mb", `${STEP}|auto`, { neg: true }), ml: P("ml", `${STEP}|auto`, { neg: true }),
    spaceX: P("space-x", STEP, { neg: true }),
    spaceY: P("space-y", STEP, { neg: true }),
    // position offsets
    inset: P("inset", `${STEP}|auto|full|\\d+/\\d+`, { neg: true }),
    top: P("top", `${STEP}|auto|full|\\d+/\\d+`, { neg: true }),
    right: P("right", `${STEP}|auto|full|\\d+/\\d+`, { neg: true }),
    bottom: P("bottom", `${STEP}|auto|full|\\d+/\\d+`, { neg: true }),
    left: P("left", `${STEP}|auto|full|\\d+/\\d+`, { neg: true }),
    // typography
    fontFamily: E("font-(?:sans|serif|mono)"),
    fontSize: { re: /^text-(xs|sm|base|lg|xl|[2-9]xl|\[\d[^\]]*\])$/, read: (m) => m[1], build: (v) => `text-${normArb(v)}` },
    fontWeight: E("font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)"),
    fontStyle: E("italic|not-italic"),
    leading: P("leading", "none|tight|snug|normal|relaxed|loose|\\d+"),
    tracking: P("tracking", "tighter|tight|normal|wide|wider|widest"),
    textAlign: E("text-(?:left|center|right|justify|start|end)"),
    textColor: C("text"),
    textDecoration: E("underline|overline|line-through|no-underline"),
    textTransform: E("uppercase|lowercase|capitalize|normal-case"),
    textOverflow: E("truncate|text-ellipsis|text-clip"),
    whitespace: E("whitespace-(?:normal|nowrap|pre|pre-line|pre-wrap|break-spaces)"),
    lineClamp: P("line-clamp", "\\d+|none"),
    // background
    bgColor: C("bg"),
    bgImage: E("bg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)|bg-none"),
    gradFrom: C("from"), gradVia: C("via"), gradTo: C("to"),
    bgSize: E("bg-(?:auto|cover|contain)"),
    bgPosition: E("bg-(?:center|top|right|bottom|left|left-top|left-bottom|right-top|right-bottom)"),
    bgRepeat: E("bg-(?:repeat|no-repeat|repeat-x|repeat-y)"),
    fill: C("fill"), stroke: C("stroke"),
    // border
    borderWidth: { re: /^border(?:-([0248]|\[[^\]]+\]))?$/, read: (m) => m[1] || "1", build: (v) => (v === "1" || v === "" ? "border" : `border-${normArb(v)}`) },
    borderT: P("border-t", "[0248]"), borderR: P("border-r", "[0248]"), borderB: P("border-b", "[0248]"), borderL: P("border-l", "[0248]"),
    borderStyle: E("border-(?:solid|dashed|dotted|double|none)"),
    borderColor: C("border"),
    radius: { re: /^rounded(?:-(none|sm|md|lg|xl|2xl|3xl|full|\[[^\]]+\]))?$/, read: (m) => m[1] || "", build: (v) => (v === "" || v === "default" ? "rounded" : `rounded-${normArb(v)}`) },
    radiusTL: P("rounded-tl", "none|sm|md|lg|xl|2xl|3xl|full"), radiusTR: P("rounded-tr", "none|sm|md|lg|xl|2xl|3xl|full"),
    radiusBR: P("rounded-br", "none|sm|md|lg|xl|2xl|3xl|full"), radiusBL: P("rounded-bl", "none|sm|md|lg|xl|2xl|3xl|full"),
    ring: { re: /^ring(?:-([0124-8]))?$/, read: (m) => m[1] || "3", build: (v) => (v === "3" ? "ring" : `ring-${v}`) },
    ringColor: C("ring"),
    // effects
    shadow: { re: /^shadow(?:-(sm|md|lg|xl|2xl|inner|none))?$/, read: (m) => m[1] || "default", build: (v) => (v === "default" || v === "" ? "shadow" : `shadow-${v}`) },
    shadowColor: C("shadow"),
    opacity: P("opacity", "\\d+"),
    blur: { re: /^blur(?:-(none|sm|md|lg|xl|2xl|3xl))?$/, read: (m) => m[1] || "default", build: (v) => (v === "default" ? "blur" : `blur-${v}`) },
    backdropBlur: { re: /^backdrop-blur(?:-(none|sm|md|lg|xl|2xl|3xl))?$/, read: (m) => m[1] || "default", build: (v) => (v === "default" ? "backdrop-blur" : `backdrop-blur-${v}`) },
    brightness: P("brightness", "\\d+"),
    grayscale: { re: /^grayscale(?:-(0))?$/, read: (m) => m[1] || "100", build: (v) => (v === "0" ? "grayscale-0" : "grayscale") },
    mixBlend: E("mix-blend-(?:normal|multiply|screen|overlay|darken|lighten|difference)"),
    rotate: P("rotate", "\\d+", { neg: true }),
    scale: P("scale", "\\d+"),
    translateX: P("translate-x", `${STEP}|full|\\d+/\\d+`, { neg: true }),
    translateY: P("translate-y", `${STEP}|full|\\d+/\\d+`, { neg: true }),
    // motion and interaction
    transition: { re: /^transition(?:-(none|all|colors|opacity|shadow|transform))?$/, read: (m) => m[1] || "default", build: (v) => (v === "default" ? "transition" : `transition-${v}`) },
    duration: P("duration", "\\d+"),
    ease: E("ease-(?:linear|in|out|in-out)"),
    delay: P("delay", "\\d+"),
    cursor: E("cursor-(?:pointer|default|text|move|not-allowed|wait|grab|grabbing|crosshair|help|auto)"),
    pointerEvents: E("pointer-events-(?:none|auto)"),
    userSelect: E("select-(?:none|text|all|auto)"),
};

export const BREAKPOINTS = ["", "sm", "md", "lg", "xl", "2xl"];
export const STATES = ["", "hover", "focus", "active", "disabled", "dark", "group-hover", "focus-within", "first", "last", "odd", "even"];
export const BREAKPOINT_WIDTH = { "": 390, sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

const split = (str) => String(str || "").split(/\s+/).filter(Boolean);

/** "md:hover:bg-red-500" -> { variant: "md:hover:", base: "bg-red-500" } (ignores colons inside [...]) */
export function parseToken(tok) {
    let depth = 0, cut = -1;
    for (let i = 0; i < tok.length; i++) {
        if (tok[i] === "[") depth++;
        else if (tok[i] === "]") depth--;
        else if (tok[i] === ":" && depth === 0) cut = i;
    }
    return cut === -1 ? { variant: "", base: tok } : { variant: tok.slice(0, cut + 1), base: tok.slice(cut + 1) };
}

/** Current value of a group for one variant, or null. */
export function getGroup(classes, key, variant = "") {
    const g = GROUPS[key];
    for (const tok of split(classes)) {
        const { variant: v, base } = parseToken(tok);
        if (v !== variant) continue;
        const m = base.match(g.re);
        if (m) return { token: tok, value: g.read(m) };
    }
    return null;
}

/** Sets (or, with an empty value, clears) a group for one variant. Returns the new class string, or null if the value is invalid. */
export function setGroup(classes, key, value, variant = "") {
    const g = GROUPS[key];
    let built = "";
    if (value !== "" && value !== null && value !== undefined) {
        built = g.build(value);
        if (!g.re.test(built)) return null;
    }
    // the new class takes the old one's place (or goes at the end), so the rest of the list keeps its order
    const out = [];
    let at = -1;
    for (const tok of split(classes)) {
        const { variant: v, base } = parseToken(tok);
        if (v === variant && g.re.test(base)) { if (at === -1) at = out.length; continue; }
        out.push(tok);
    }
    if (built) out.splice(at === -1 ? out.length : at, 0, variant + built);
    return out.join(" ");
}

export const ALL_GROUP_KEYS = Object.keys(GROUPS);
