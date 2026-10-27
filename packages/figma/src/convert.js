// A snapshot of a Figma design (plain JSON, see snapshot.js in the plugin) as an HTML page with Tailwind classes. No AI, no network:
// fixed rules. Auto Layout frames become flex boxes exactly; everything else is placed at its exact position (`absolute`), so the
// page always looks like the design, and the layout rules can be cleverer later without changing what is drawn.
//
//   const { html, warnings, stats } = convertDesign(snapshot, { title })
import { ClassBag, round, px } from "./classes.js";
import { fillClasses, strokeClasses, radiusClasses, effectClasses } from "./paint.js";
import { textElement } from "./text.js";

const CONTAINERS = new Set(["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);
const isAuto = (n) => n.layoutMode === "HORIZONTAL" || n.layoutMode === "VERTICAL";
const escapeAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** The rotation in degrees of a Figma transform [[a, c, tx], [b, d, ty]] (y points down, so this is CSS's clockwise angle). */
const rotationOf = (t) => (t ? (Math.atan2(t[1][0], t[0][0]) * 180) / Math.PI : 0);

/** Where a node's top-left sits in its parent's space. A rotated node turns about its centre in CSS, so the box is the unrotated one. */
function placeOf(node) {
    const t = node.transform;
    if (!t) return { x: node.x || 0, y: node.y || 0, rotate: 0 };
    const rotate = rotationOf(t);
    if (!rotate) return { x: t[0][2], y: t[1][2], rotate: 0 };
    const cx = t[0][2] + (t[0][0] * node.width + t[0][1] * node.height) / 2;
    const cy = t[1][2] + (t[1][0] * node.width + t[1][1] * node.height) / 2;
    return { x: cx - node.width / 2, y: cy - node.height / 2, rotate };
}

/** Width and height classes for a node, by how its parent places it. */
function sizeClasses(node, parent, bag, { textAuto = false } = {}) {
    const inFlex = parent && isAuto(parent) && node.layoutPositioning !== "ABSOLUTE";
    const mainH = parent && parent.layoutMode === "HORIZONTAL";
    const sizing = (axis) => node[`layoutSizing${axis}`] || (axis === "Horizontal" ? (node.layoutGrow && mainH ? "FILL" : node.layoutAlign === "STRETCH" && !mainH ? "FILL" : "FIXED") : (node.layoutGrow && !mainH ? "FILL" : node.layoutAlign === "STRETCH" && mainH ? "FILL" : "FIXED"));
    for (const axis of ["Horizontal", "Vertical"]) {
        const key = axis === "Horizontal" ? "w" : "h", size = axis === "Horizontal" ? node.width : node.height;
        let mode = sizing(axis);
        if (textAuto && node.textAutoResize === "WIDTH_AND_HEIGHT") mode = "HUG";
        if (textAuto && node.textAutoResize === "HEIGHT" && axis === "Vertical") mode = "HUG";
        if (!inFlex) { if (mode !== "HUG") bag.set(key, px(key, size)); continue; } // placed freely: its own size
        const onMain = (axis === "Horizontal") === Boolean(mainH);
        if (mode === "FILL") { if (onMain) bag.set("flexNum", "flex-1"); else bag.set("self", "self-stretch"); }
        else if (mode === "FIXED") { bag.set(key, px(key, size)); if (onMain) bag.set("shrink", "shrink-0"); }
    }
}

/** An Auto Layout frame's own flex classes. */
function flexClasses(node, bag) {
    bag.set("display", "flex").set("flexDir", node.layoutMode === "VERTICAL" ? "flex-col" : "flex-row");
    if (node.layoutWrap === "WRAP") bag.set("flexWrap", "flex-wrap");
    const justify = { CENTER: "justify-center", MAX: "justify-end", SPACE_BETWEEN: "justify-between" }[node.primaryAxisAlignItems];
    if (justify) bag.set("justify", justify);
    bag.set("items", { MIN: "items-start", CENTER: "items-center", MAX: "items-end", BASELINE: "items-baseline" }[node.counterAxisAlignItems] || "items-start");
    const main = node.itemSpacing || 0, cross = node.layoutWrap === "WRAP" ? node.counterAxisSpacing ?? main : main;
    if (node.primaryAxisAlignItems !== "SPACE_BETWEEN" || node.layoutWrap === "WRAP") {
        if (main === cross) { if (main) bag.set("gap", px("gap", main)); }
        else { const row = node.layoutMode === "HORIZONTAL"; if (main) bag.set(row ? "gapX" : "gapY", px("gap", main)); if (cross) bag.set(row ? "gapY" : "gapX", px("gap", cross)); }
    }
    const { paddingTop: t = 0, paddingRight: r = 0, paddingBottom: b = 0, paddingLeft: l = 0 } = node;
    if (t === r && r === b && b === l) { if (t) bag.set("p", px("p", t)); }
    else {
        if (l === r && l) bag.set("px", px("px", l)); else { if (l) bag.set("pl", px("pl", l)); if (r) bag.set("pr", px("pr", r)); }
        if (t === b && t) bag.set("py", px("py", t)); else { if (t) bag.set("pt", px("pt", t)); if (b) bag.set("pb", px("pb", b)); }
    }
}

/** Free placement: `absolute` with the offsets and, for a rotated node, its turn. */
function placeClasses(node, bag) {
    const { x, y, rotate } = placeOf(node);
    bag.set("position", "absolute").set("left", px("left", x)).set("top", px("top", y));
    if (Math.abs(rotate) >= 0.05) bag.set("rotate", `[${round(rotate, 2)}deg]`);
}

function convert(node, parent, ctx, isRoot = false) {
    if (node.visible === false) return "";
    if (node.isMask) { ctx.warn(`${node.name}: a mask is not carried over`); return ""; }
    ctx.stats.nodes++;
    const bag = new ClassBag(ctx.warn);
    const free = !isRoot && (!parent || !isAuto(parent) || node.layoutPositioning === "ABSOLUTE");

    // a vector, or a shape with a picture: the plugin exported it
    if (node.svg || node.png) {
        ctx.stats.assets++;
        const box = node.box || node;
        const holder = { ...node, width: box.width, height: box.height, transform: [[1, 0, box.x], [0, 1, box.y]] };
        if (free) placeClasses(holder, bag);
        sizeClasses(holder, parent, bag);
        const img = node.png
            ? `<img src="${escapeAttr(node.png)}" alt="${escapeAttr(node.name)}" class="block h-full w-full">`
            : node.svg.replace(/<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} class="block h-full w-full">`);
        return `<div ${bag.attrs()}>${img}</div>`;
    }

    if (node.type === "TEXT") {
        ctx.stats.text++;
        const { tag, bag: textBag, inner } = textElement(node, ctx);
        if (free) placeClasses(node, bag);
        sizeClasses(node, parent, bag, { textAuto: true });
        for (const [k, v] of Object.entries(textBag.props)) if (!bag.has(k)) bag.set(k, v);
        textBag.raw.forEach((c) => bag.add(c));
        effectClasses(node, bag, ctx.warn);
        return `<${tag} ${bag.attrs()}>${inner}</${tag}>`;
    }

    // a frame, group, rectangle or ellipse: a box
    const kids = CONTAINERS.has(node.type) ? node.children || [] : [];
    const auto = isAuto(node);
    if (free) placeClasses(node, bag);
    sizeClasses(node, parent, bag);
    if (auto) { flexClasses(node, bag); ctx.stats.flex++; }
    else if (kids.length && !bag.has("position")) bag.set("position", "relative");
    if (auto && kids.some((k) => k.layoutPositioning === "ABSOLUTE") && !bag.has("position")) bag.set("position", "relative");
    if (node.clipsContent) bag.set("overflow", "overflow-hidden");
    fillClasses(node, bag, ctx.warn);
    strokeClasses(node, bag, ctx.warn);
    radiusClasses(node, bag);
    effectClasses(node, bag, ctx.warn);
    if (free) ctx.stats.absolute++;
    const inner = kids.map((k) => convert(k, node, ctx)).join("");
    return `<div ${bag.attrs()}>${inner}</div>`;
}

/**
 * One link per family, so a family Google does not have (a paid or custom font) cannot stop the others from loading.
 * Those fall back to the generic family each class names.
 */
const fontLinks = (fonts) => [...fonts].map(([name, weights]) =>
    `<link href="https://fonts.googleapis.com/css2?family=${name.replace(/\s+/g, "+")}:wght@${[...weights].sort((a, b) => a - b).join(";")}&display=swap" rel="stylesheet">`).join("\n");

/**
 * @param {object} snapshot   the design's top frame (see packages/figma/plugin/snapshot.js)
 * @param {{ title?: string }} [options]
 * @returns {{ html: string, body: string, warnings: string[], stats: { nodes: number, flex: number, absolute: number, text: number, assets: number }, fonts: string[] }}
 */
export function convertDesign(snapshot, { title } = {}) {
    const warnings = [];
    const ctx = { warn: (m) => { if (!warnings.includes(m)) warnings.push(m); }, fonts: new Map(), stats: { nodes: 0, flex: 0, absolute: 0, text: 0, assets: 0 } };
    const body = convert(snapshot, null, ctx, true); // the top frame is the page: its own size, placed nowhere
    const name = title || snapshot.name || "Design";
    const fonts = ctx.fonts;
    if (fonts.size) warnings.push(`Fonts: ${[...fonts.keys()].join(", ")}. Those on Google Fonts load; any other (a paid or custom font) shows the generic fallback until its font file is added.`);
    const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeAttr(name)}</title>\n<script src="https://cdn.tailwindcss.com"></script>\n<style>body{margin:0;line-height:normal;-webkit-font-smoothing:antialiased}img{object-fit:cover}</style>\n${fonts.size ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n${fontLinks(fonts)}\n` : ""}</head>\n<body>\n${body}\n</body>\n</html>\n`;
    return { html, body, warnings, stats: ctx.stats, fonts: [...ctx.fonts.keys()], size: html.length };
}
