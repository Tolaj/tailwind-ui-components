// The catalog: Windcraft's own components, kept as files in catalog/<family>/family.js (see catalog/button/family.js) and read from
// there; nothing is stored in the database. Read-only, so it is loaded once.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const CATALOG_DIR = path.resolve(import.meta.dirname, "..", "..", "catalog");
let cache = null;

/** Every family, in the order of catalog/order.json (a family not listed there goes last, alphabetically). */
export async function families() {
    if (cache) return cache;
    const dirs = fs.readdirSync(CATALOG_DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(CATALOG_DIR, d.name, "family.js"))).map((d) => d.name);
    let order = [];
    try { order = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, "order.json"), "utf8")); } catch { /* no order file: alphabetical */ }
    dirs.sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9) || a.localeCompare(b));
    cache = await Promise.all(dirs.map(async (d) => ({ dir: d, ...(await import(pathToFileURL(path.join(CATALOG_DIR, d, "family.js")).href)) })));
    return cache;
}

export const family = async (slug) => (await families()).find((f) => f.slug === slug) || null;

/** What a list needs from a family (no functions): name, description, tags, how many styles, one sample button. */
export const summary = (f) => ({ slug: f.slug, name: f.name, description: f.description, tags: f.tags, styles: f.styles.length, sample: f.render ? f.render({}) : "" });

/** The HTML a variant stands for, with its axes: the code a person copies (default state). */
export function variantHtml(f, opts = {}) {
    const style = f.styles.find((s) => s.slug === opts.style) ? opts.style : f.styles[0].slug;
    const pick = (axis, v) => (f.axes[axis] && f.axes[axis].includes(v) ? v : f.axes[axis] ? f.axes[axis][Math.min(2, f.axes[axis].length - 1)] : undefined);
    return { style, size: pick("size", opts.size), icon: pick("icon", opts.icon), html: f.render({ style, size: pick("size", opts.size), icon: pick("icon", opts.icon), label: opts.label }) };
}
