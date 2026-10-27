// Fills, strokes, corners and effects of a Figma node as Tailwind classes.
import { colorValue, solidValue } from "./color.js";
import { round, px, arb } from "./classes.js";

/** The inverse of a Figma 2x3 matrix [[a, b, tx], [c, d, ty]], or null when it cannot be inverted. */
function invert([[a, b, tx], [c, d, ty]]) {
    const det = a * d - b * c;
    if (!det) return null;
    return [[d / det, -b / det, (b * ty - d * tx) / det], [-c / det, a / det, (c * tx - a * ty) / det]];
}
const apply = ([[a, b, tx], [c, d, ty]], x, y) => [a * x + b * y + tx, c * x + d * y + ty];

const stopCss = (stop, opacity, pos) => `${colorValue(stop.color, opacity)}_${round(pos * 100, 1)}%`;

/** A Figma gradient paint as a CSS gradient (spaces already `_`), or null for kinds CSS has no equal for. */
export function gradientCss(paint, w, h) {
    const inv = paint.gradientTransform && invert(paint.gradientTransform);
    const opacity = paint.opacity ?? 1;
    const stops = paint.gradientStops || [];
    if (!stops.length) return null;
    if (paint.type === "GRADIENT_LINEAR" && inv) {
        // the gradient runs from (0, .5) to (1, .5) in its own space; CSS wants an angle and stops along a line through the centre
        const [sx, sy] = apply(inv, 0, 0.5), [ex, ey] = apply(inv, 1, 0.5);
        const start = [sx * w, sy * h], end = [ex * w, ey * h];
        const dx = end[0] - start[0], dy = end[1] - start[1], len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
        const cssLen = Math.abs(w * Math.sin((angle * Math.PI) / 180)) + Math.abs(h * Math.cos((angle * Math.PI) / 180)) || 1;
        const at = (p) => ((start[0] + dx * p - w / 2) * ux + (start[1] + dy * p - h / 2) * uy) / cssLen + 0.5;
        return `linear-gradient(${round(((angle % 360) + 360) % 360, 1)}deg,${stops.map((s) => stopCss(s, opacity, at(s.position))).join(",")})`;
    }
    if (paint.type === "GRADIENT_RADIAL" && inv) {
        const [cx, cy] = apply(inv, 0.5, 0.5), [rx, ry] = apply(inv, 1, 0.5), [bx, by] = apply(inv, 0.5, 1);
        const radiusX = Math.hypot((rx - cx) * w, (ry - cy) * h), radiusY = Math.hypot((bx - cx) * w, (by - cy) * h);
        return `radial-gradient(${round(radiusX)}px_${round(radiusY)}px_at_${round(cx * w)}px_${round(cy * h)}px,${stops.map((s) => stopCss(s, opacity, s.position)).join(",")})`;
    }
    return null;
}

/**
 * The background of a node. One solid colour is a colour class; anything else is one `bg-[...]` of layers (top layer first).
 * Image fills are reported, not drawn here (the plugin turns image-only shapes into pictures).
 */
export function fillClasses(node, bag, warn) {
    const paints = (node.fills || []).filter((p) => p.visible !== false && (p.opacity ?? 1) > 0);
    const layers = [];
    for (const p of paints) {
        if (p.type === "SOLID") layers.push({ solid: solidValue(p) });
        else if (p.type === "GRADIENT_LINEAR" || p.type === "GRADIENT_RADIAL") {
            const css = gradientCss(p, node.width, node.height);
            if (css) layers.push({ css });
            else warn(`${node.name}: this gradient could not be written`);
        } else if (p.type === "GRADIENT_ANGULAR" || p.type === "GRADIENT_DIAMOND") {
            const first = p.gradientStops && p.gradientStops[0];
            if (first) layers.push({ solid: colorValue(first.color, p.opacity ?? 1) });
            warn(`${node.name}: an ${p.type.slice(9).toLowerCase()} gradient became its first colour`);
        } else if (p.type === "IMAGE") {
            if (p.dataUri) layers.push({ image: p });
            else warn(`${node.name}: a picture fill could not be included`);
        }
    }
    if (!layers.length) return;
    // a picture goes in the style attribute (a data URI is too long for a class); the colours and gradients under or over it stay classes
    const image = layers.find((l) => l.image);
    if (image) {
        const mode = image.image.scaleMode;
        bag.style = `background-image:url(${image.image.dataUri})`;
        if (mode === "FIT") bag.set("bgSize", "bg-contain").set("bgRepeat", "bg-no-repeat");
        else if (mode === "TILE") bag.set("bgRepeat", "bg-repeat");
        else bag.set("bgSize", "bg-cover");
        if (mode !== "TILE") bag.set("bgPosition", "bg-center");
        const under = layers.slice(0, layers.indexOf(image)).filter((l) => !l.image);
        if (under.length === 1 && under[0].solid) bag.set("bgColor", under[0].solid);
        return;
    }
    if (layers.length === 1 && layers[0].solid) return void bag.set("bgColor", layers[0].solid);
    const css = layers.reverse().map((l) => l.css || `linear-gradient(${l.solid},${l.solid})`);
    bag.add(`bg-[${css.join(",")}]`);
}

/** Text colour: the first visible solid fill. */
export function textColorOf(fills) {
    for (const p of fills || []) { const v = solidValue(p); if (v) return v; }
    return null;
}

/** Strokes as a border; an outside stroke as a ring-like shadow. */
export function strokeClasses(node, bag, warn) {
    const stroke = (node.strokes || []).find((p) => p.visible !== false && p.type === "SOLID");
    if (!stroke) return;
    const color = solidValue(stroke);
    const w = node.strokeWeight ?? 1;
    const sides = [node.strokeTopWeight, node.strokeRightWeight, node.strokeBottomWeight, node.strokeLeftWeight];
    const perSide = sides.every((s) => s !== undefined) && !sides.every((s) => s === sides[0]);
    if (node.strokeAlign === "OUTSIDE" && !perSide) {
        bag.add(`shadow-[0_0_0_${round(w)}px_${color}]`);
        return;
    }
    if (node.strokeAlign === "CENTER") warn(`${node.name}: a centred stroke is drawn inside`);
    if (node.dashPattern && node.dashPattern.length) bag.set("borderStyle", "border-dashed");
    if (perSide) {
        bag.set("borderWidth", "0");
        sides.forEach((s, i) => s && bag.set(["borderT", "borderR", "borderB", "borderL"][i], px("borderT", s)));
    } else bag.set("borderWidth", px("borderWidth", w));
    bag.set("borderColor", color);
}

/** Corner radius: one value, a pill/circle, or per corner. */
export function radiusClasses(node, bag) {
    if (node.type === "ELLIPSE") return void bag.set("radius", "full");
    const r = [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius].map((v) => v ?? node.cornerRadius ?? 0);
    if (r.every((v) => v === 0)) return;
    const max = Math.min(node.width, node.height) / 2;
    if (r.every((v) => v === r[0])) return void bag.set("radius", r[0] >= max && max > 0 ? "full" : px("radius", r[0]));
    ["radiusTL", "radiusTR", "radiusBR", "radiusBL"].forEach((k, i) => r[i] && bag.set(k, px("radius", r[i])));
}

/** Shadows, blurs and opacity. A layer blur of N in Figma is about N/2 in CSS. */
export function effectClasses(node, bag, warn) {
    const shadows = [];
    for (const e of node.effects || []) {
        if (e.visible === false) continue;
        if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
            const o = e.offset || { x: 0, y: 0 };
            shadows.push(`${e.type === "INNER_SHADOW" ? "inset_" : ""}${round(o.x)}px_${round(o.y)}px_${round(e.radius)}px_${round(e.spread || 0)}px_${colorValue(e.color)}`);
        } else if (e.type === "LAYER_BLUR") bag.add(`blur-[${round(e.radius / 2)}px]`);
        else if (e.type === "BACKGROUND_BLUR") bag.add(`backdrop-blur-[${round(e.radius / 2)}px]`);
        else warn(`${node.name}: effect ${e.type} is not carried over`);
    }
    if (shadows.length) bag.add(`shadow-[${shadows.join(",")}]`);
    if (node.opacity !== undefined && node.opacity < 1) bag.set("opacity", String(Math.round(node.opacity * 100)));
}
