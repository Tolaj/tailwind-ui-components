// What saving several pages of one design needs, as plain functions: the head they share, their order, and their group.

export const MAX_GROUP = 60;
/** A page's group name ("Public site", "Customer area"): trimmed and kept short; empty means none. */
export const normalizeGroup = (g) => String(g ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_GROUP);

/**
 * Puts `shared` (fonts, the Tailwind script and config, a stylesheet...) at the top of a page's <head>, so every page is
 * complete on its own. The head is made when the page has none (after <html>, else after a doctype, else before everything).
 * A page that already contains it is left as it is, so saving a page again doesn't add it twice.
 */
export function withSharedHead(html, shared) {
    const add = String(shared ?? "").trim();
    const page = String(html ?? "");
    if (!add || page.includes(add)) return page;
    const insert = (at, text) => page.slice(0, at) + text + page.slice(at);
    const head = /<head\b[^>]*>/i.exec(page);
    if (head) return insert(head.index + head[0].length, `\n${add}`);
    const root = /<html\b[^>]*>/i.exec(page);
    if (root) return insert(root.index + root[0].length, `\n<head>\n${add}\n</head>`);
    const doctype = /^\s*<!doctype[^>]*>/i.exec(page);
    if (doctype) return insert(doctype[0].length, `\n${add}`);
    return `${add}\n${page}`;
}

/**
 * The project's pages in their new order. `sequence`: every page id in the order they are in now (pages new in this save last).
 * `named`: the ids in the order they should come. The named pages take, in that order, the places the named pages hold now;
 * the others do not move. So saving pages again in another order reorders just those, and saving a few of them cannot throw
 * the rest out of place.
 */
export function placeInOrder(sequence, named) {
    const wanted = [...new Set(named)].filter((id) => sequence.includes(id));
    const set = new Set(wanted);
    const out = [...sequence];
    let n = 0;
    sequence.forEach((id, i) => { if (set.has(id)) out[i] = wanted[n++]; });
    return out;
}
