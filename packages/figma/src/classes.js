// Builds a class list from Windcraft's own class groups (@windcraft/core), so every class we write is one the Properties panel
// understands as a property (w-64, p-4, bg-[#fff]). What has no group (a custom shadow, a font family, a gradient) is kept as a raw class.
import { GROUPS } from "@windcraft/core/class-groups.js";
import { writeClasses } from "@windcraft/core/design-spec.js";
import { fromPx } from "@windcraft/core/prop-tailwind.js";

/** 12.000001 -> 12; 0.3333333 -> 0.333 */
export const round = (n, places = 2) => { const f = 10 ** places; return Math.round(n * f) / f; };

/** A pixel size as the value of a class group: 16 -> "4" (p-4), 13 -> "13px" (p-[13px]). */
export const px = (key, n) => fromPx(key, round(n));

/** Spaces are not allowed in a Tailwind arbitrary value: "0 4px 8px" -> "0_4px_8px". */
export const arb = (s) => String(s).trim().replace(/\s+/g, "_");

export class ClassBag {
    constructor(warn = () => {}) { this.props = {}; this.raw = []; this.style = ""; this.shadows = []; this.warn = warn; } // `shadows`: box-shadow parts (strokes drawn as rings, then effects), written as one class by effectClasses

    /** A class group with a value. A value the group cannot hold becomes a warning, never a broken class. */
    set(key, value) {
        if (value === undefined || value === null || value === "") return this;
        try {
            const built = GROUPS[key].build(value);
            if (!GROUPS[key].re.test(built)) throw new Error("no match");
            this.props[key] = value;
        } catch {
            this.warn(`Could not write ${key} = ${value}`);
        }
        return this;
    }

    /** A class that no group covers, as is. */
    add(cls) { if (cls && !this.raw.includes(cls)) this.raw.push(cls); return this; }

    has(key) { return key in this.props; }
    toString() { return writeClasses({ base: this.props }, this.raw); }

    /** The attributes for an element: its classes, and a style when one is set. */
    attrs() { return `class="${this}"${this.style ? ` style="${this.style.replace(/"/g, "&quot;")}"` : ""}`; }
}
