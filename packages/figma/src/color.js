// Figma colours are { r, g, b } between 0 and 1, with the opacity kept apart.
import { round } from "./classes.js";

const byte = (c) => Math.max(0, Math.min(255, Math.round(c * 255)));
const hex2 = (n) => n.toString(16).padStart(2, "0");

/** "#aabbcc" when opaque, "rgba(r,g,b,a)" (no spaces) when not. */
export function colorValue(c, alpha = 1) {
    const a = round(Math.max(0, Math.min(1, alpha * (c.a ?? 1))), 3);
    const r = byte(c.r), g = byte(c.g), b = byte(c.b);
    return a >= 1 ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `rgba(${r},${g},${b},${a})`;
}

/** A solid paint's colour value, or null when it is hidden. */
export const solidValue = (paint) => (paint && paint.visible !== false && paint.type === "SOLID" ? colorValue(paint.color, paint.opacity ?? 1) : null);
