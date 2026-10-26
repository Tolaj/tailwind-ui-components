// @ts-check
// The design spec: a design as JSON an AI can read and target reliably, and back to HTML. It replaces the old element
// description (element-description/index.js), which only ran in the browser and lost spaces, comments and most SVG.
//
// It works on a tree the HTML was already read into: the browser's own (DOMParser) or the server's (node-html-parser).
// Both are read through the few helpers below, so the browser and the server number elements the same way.
//
// Elements are numbered in document order (n1, n2...) every time a spec is made. The ids belong to that version of the
// design: a patch says which version it was read from (design-spec.service.js), so an id never lands on the wrong element.
import { GROUPS, parseToken } from "../design/class-groups.js";

/**
 * Class properties by variant: { base: { p: "6" }, md: { p: "8" }, "md:hover": { bgColor: "blue-600" } }.
 * The keys inside are class groups (class-groups.js), the values what the group reads and builds.
 * @typedef {Record<string, Record<string, string>>} Props
 */
/**
 * One element of a spec, or a run of text between elements ({ text } alone).
 * @typedef {object} SpecNode
 * @property {string} [id] n1, n2... in document order; only for elements
 * @property {string} [tag]
 * @property {string} [role] title, button, card... (simple rules)
 * @property {Props} [props] classes read as properties
 * @property {string[]} [raw] classes no group reads back exactly
 * @property {string} [css] the style attribute
 * @property {Record<string, string>} [attrs]
 * @property {string} [text]
 * @property {SpecNode[]} [children]
 * @property {string} [svg] an <svg>'s inner markup
 * @property {number} [svgChars] its length, when the drawing is left out
 */
/**
 * @typedef {object} Assets
 * @property {string} [css]
 * @property {string} [js]
 * @property {string[]} [stylesheets]
 * @property {string[]} [scripts]
 */
/**
 * @typedef {object} Spec
 * @property {Record<string, string[]>} tokens
 * @property {Assets} assets
 * @property {SpecNode[]} tree
 * @property {string} [id]
 * @property {string} [title]
 * @property {number} [version]
 * @property {string} [kind]
 * @property {string} [warning]
 */

// ── Reading either tree ──────────────────────────────────────────────────────
const tagOf = (n) => String(n.localName || n.rawTagName || "").toLowerCase();
const attrsOf = (n) => {
    const a = n.attributes;
    if (!a) return {};
    if (typeof a.length === "number") return Object.fromEntries(Array.from(a, (x) => [x.name, x.value])); // the browser's NamedNodeMap
    return { ...a }; // node-html-parser: already { name: value }
};
const textOf = (n) => (n.data !== undefined ? n.data : n.text); // a text node's decoded text
const rawOf = (n) => (n.rawText !== undefined ? n.rawText : n.textContent); // <style>/<script> content, as written
const innerOf = (n) => n.innerHTML;
const kidsOf = (n) => Array.from(n.childNodes || []);
const ELEMENT = 1, TEXT = 3;

/** Head-only and asset elements: never part of the tree (their content goes to `assets`). */
const SKIP = new Set(["head", "style", "script", "link", "meta", "title", "base", "noscript", "template"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
/** Elements whose text is kept exactly as written (spaces and line breaks matter). */
const EXACT = new Set(["pre", "textarea", "code"]);
const INLINE = new Set(["a", "abbr", "b", "br", "button", "code", "em", "i", "img", "input", "kbd", "label", "mark", "q", "s", "select", "small", "span", "strong", "sub", "sup", "svg", "time", "u", "textarea"]);

/** The nodes a design's content starts at: the <body>'s children, or the top level for a fragment. */
export function contentRoots(root) {
    const body = root.body || (root.querySelector && root.querySelector("body"));
    return kidsOf(body || root);
}

/**
 * Visits every element of the tree in document order with its id (n1, n2...). An <svg> is one element: what's inside it
 * has no ids. The spec builder and the patch engine both number elements with this, so their ids always agree.
 */
export function walkElements(roots, visit) {
    let count = 0;
    const go = (n, parentId) => {
        if (n.nodeType !== ELEMENT || SKIP.has(tagOf(n))) return;
        const id = `n${++count}`;
        const into = visit(n, id, parentId) !== false;
        if (into && tagOf(n) !== "svg") kidsOf(n).forEach((k) => go(k, id));
    };
    roots.forEach((r) => go(r, null));
}

// ── Classes as properties ────────────────────────────────────────────────────
const GROUP_KEYS = Object.keys(GROUPS);
/** "md:hover:" -> "md:hover", "" -> "base" */
const atOf = (variant) => (variant ? variant.slice(0, -1) : "base");

/**
 * Splits a class list into properties by class group and variant ({ base: { p: "6" }, md: { p: "8" } }) and the classes
 * no group reads back exactly (`raw`). Nothing is lost: every class is in one or the other.
 */
/** @param {string | null | undefined} classes @returns {{ props: Props, raw: string[] }} */
export function readClasses(classes) {
    /** @type {Props} */
    const props = {};
    /** @type {string[]} */
    const raw = [];
    for (const tok of String(classes || "").split(/\s+/).filter(Boolean)) {
        const { variant, base } = parseToken(tok);
        let placed = false;
        for (const key of GROUP_KEYS) {
            const m = base.match(GROUPS[key].re);
            if (!m) continue;
            const value = GROUPS[key].read(m);
            const at = atOf(variant);
            // only when writing it back gives the same class, and the variant doesn't already have one from this group
            if (GROUPS[key].build(value) === base && !(props[at] && key in props[at])) {
                (props[at] = props[at] || {})[key] = value;
                placed = true;
            }
            break;
        }
        if (!placed) raw.push(tok);
    }
    return { props, raw };
}

/** The class list for properties and raw classes: the reverse of readClasses. */
/** @param {Props} [props] @param {string[]} [raw] @returns {string} */
export function writeClasses(props = {}, raw = []) {
    const out = [];
    const ats = Object.keys(props).sort((a, b) => (a === "base" ? -1 : b === "base" ? 1 : 0));
    for (const at of ats) {
        const variant = at === "base" ? "" : `${at}:`;
        for (const [key, value] of Object.entries(props[at] || {})) {
            if (!GROUPS[key]) throw new Error(`Unknown property "${key}"`);
            const built = GROUPS[key].build(value);
            if (!GROUPS[key].re.test(built)) throw new Error(`"${value}" is not a valid ${key}`);
            out.push(variant + built);
        }
    }
    return [...out, ...raw].join(" ");
}

// ── Roles: what an element is for, by simple rules ───────────────────────────
const hasAny = (props, keys) => Object.values(props).some((p) => keys.some((k) => k in p));
function roleOf(tag, attrs, props) {
    if (/^h[1-6]$/.test(tag)) return "title";
    if (tag === "svg") return "icon";
    if (tag === "img" || tag === "picture" || tag === "video") return "media";
    if (tag === "button" || (tag === "input" && /^(submit|button|reset)$/i.test(attrs.type || ""))) return "button";
    if (tag === "a") return hasAny(props, ["bgColor", "borderWidth"]) && hasAny(props, ["px", "py", "p"]) ? "button" : "link";
    if (tag === "input" || tag === "select" || tag === "textarea") return "field";
    if (tag === "p" || tag === "blockquote") return "text";
    if (tag === "ul" || tag === "ol") return "list";
    if (tag === "li") return "item";
    if (["nav", "header", "footer", "main", "form", "section", "article", "aside", "label", "table"].includes(tag)) return tag;
    if (tag === "div") {
        if (hasAny(props, ["radius", "borderWidth", "shadow"]) && hasAny(props, ["p", "px", "py"])) return "card";
        if (props.base && props.base.mx === "auto" && "maxW" in props.base) return "container";
        if (hasAny(props, ["display"]) && Object.values(props).some((p) => /flex|grid/.test(p.display || ""))) return "layout";
    }
    return undefined;
}

// ── HTML -> spec ─────────────────────────────────────────────────────────────
const squash = (s) => s.replace(/\s+/g, " ");

function describe(el, id, nextId, opts) {
    const tag = tagOf(el);
    const attrs = attrsOf(el);
    const { props, raw } = readClasses(attrs.class);
    const node = { id, tag };
    const role = roleOf(tag, attrs, props);
    if (role) node.role = role;
    delete attrs.class;
    if (attrs.style !== undefined) { node.css = attrs.style; delete attrs.style; }
    if (Object.keys(attrs).length) node.attrs = attrs;
    if (Object.keys(props).length) node.props = props;
    if (raw.length) node.raw = raw;
    if (tag === "svg") {
        // an icon's drawing: in full, or (for reading only) just its size, since nothing targets what's inside it
        if (opts.svg === false) node.svgChars = innerOf(el).length;
        else node.svg = innerOf(el);
        return node;
    }
    if (VOID.has(tag)) return node;

    const kids = kidsOf(el).filter((k) => k.nodeType === ELEMENT || k.nodeType === TEXT);
    const exact = EXACT.has(tag);
    if (kids.every((k) => k.nodeType === TEXT)) {
        const t = kids.map(textOf).join("");
        const shown = exact ? t : squash(t).trim();
        if (shown) node.text = shown;
        return node;
    }
    const children = [];
    kids.forEach((k, i) => {
        if (k.nodeType === ELEMENT) {
            if (!SKIP.has(tagOf(k))) children.push(describe(k, nextId(), nextId, opts));
            return;
        }
        const t = exact ? textOf(k) : squash(textOf(k));
        if (t.trim()) children.push({ text: t }); // its edge spaces stay: "Hello <b>you</b>" needs the one before <b>
        else {
            // a space between two inline elements shows on the page ("<b>Hello</b> <i>world</i>"): keep it
            const prev = kids[i - 1], next = kids[i + 1];
            if (prev && next && prev.nodeType === ELEMENT && next.nodeType === ELEMENT && INLINE.has(tagOf(prev)) && INLINE.has(tagOf(next))) children.push({ text: " " });
        }
    });
    if (children.length) node.children = children;
    return node;
}

/** The design tokens it uses: the values that recur, most used first. */
function tokensOf(tree) {
    const buckets = { colors: new Map(), fontSizes: new Map(), radius: new Map(), spacing: new Map(), shadows: new Map() };
    const add = (b, v) => buckets[b].set(v, (buckets[b].get(v) || 0) + 1);
    const visit = (n) => {
        for (const p of Object.values(n.props || {})) {
            for (const [k, v] of Object.entries(p)) {
                if (/Color$|^grad(From|Via|To)$|^fill$|^stroke$/.test(k)) add("colors", v);
                else if (k === "fontSize") add("fontSizes", v);
                else if (/^radius/.test(k)) add("radius", v);
                else if (/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gapX|gapY|spaceX|spaceY)$/.test(k)) add("spacing", v);
                else if (k === "shadow") add("shadows", v);
            }
        }
        (n.children || []).forEach(visit);
    };
    tree.forEach(visit);
    /** @type {Record<string, string[]>} */
    const out = {};
    for (const [k, m] of Object.entries(buckets)) {
        const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([v]) => v);
        if (top.length) out[k] = top;
    }
    return out;
}

/** <style>, inline <script>, and the stylesheets and scripts it loads, as written. */
function assetsOf(root) {
    const all = (sel) => Array.from(root.querySelectorAll(sel));
    const css = all("style").map(rawOf).map((s) => s.trim()).filter(Boolean).join("\n\n");
    const js = all("script").filter((s) => !attrsOf(s).src).map(rawOf).map((s) => s.trim()).filter(Boolean).join("\n\n");
    const stylesheets = all("link[href]").filter((l) => /stylesheet/i.test(attrsOf(l).rel || "")).map((l) => attrsOf(l).href);
    const scripts = all("script[src]").map((s) => attrsOf(s).src);
    /** @type {Assets} */
    const out = {};
    if (css) out.css = css;
    if (js) out.js = js;
    if (stylesheets.length) out.stylesheets = stylesheets;
    if (scripts.length) out.scripts = scripts;
    return out;
}

/** In the browser: HTML text read by the browser's own parser, ready for toSpec. (The server uses node-html-parser.) */
export const readHtmlInBrowser = (html) => new DOMParser().parseFromString(String(html || ""), "text/html");

/**
 * A design (already read into a tree) as a spec: { tokens, assets, tree }. With { svg: false }, icons carry only their
 * size (svgChars) instead of their drawing: smaller to read, but toHtml can't rebuild the icons from it.
 */
/** @param {any} root a read tree @param {{ svg?: boolean }} [opts] @returns {Spec} */
export function toSpec(root, opts = {}) {
    let count = 0;
    const nextId = () => `n${++count}`;
    const tree = contentRoots(root).filter((n) => n.nodeType === ELEMENT && !SKIP.has(tagOf(n))).map((n) => describe(n, nextId(), nextId, opts));
    return { tokens: tokensOf(tree), assets: assetsOf(root), tree };
}

// ── spec -> HTML ─────────────────────────────────────────────────────────────
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const TAG_RE = /^[a-z][a-z0-9-]*$/;

function nodeHtml(n) {
    if (n.text !== undefined && !n.tag) return escText(n.text);
    if (!TAG_RE.test(n.tag || "")) throw new Error(`Invalid tag "${n.tag}"`);
    const cls = writeClasses(n.props, n.raw);
    const attrs = { ...(n.attrs || {}) };
    if (cls) attrs.class = cls;
    if (n.css) attrs.style = n.css;
    const open = `<${n.tag}${Object.entries(attrs).map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${escAttr(v)}"`)).join("")}>`;
    if (VOID.has(n.tag)) return open;
    const inner = n.tag === "svg" ? n.svg || "" : n.text !== undefined ? escText(n.text) : (n.children || []).map(nodeHtml).join("");
    return `${open}${inner}</${n.tag}>`;
}

/** A spec (or a list of spec nodes) as HTML, with its <style> and <script> when it has them. */
/** @param {Spec | SpecNode[]} spec @returns {string} */
export function toHtml(spec) {
    const tree = Array.isArray(spec) ? spec : spec.tree || [];
    const body = tree.map(nodeHtml).join("\n");
    const a = Array.isArray(spec) ? {} : spec.assets || {};
    return [
        ...(a.stylesheets || []).map((h) => `<link rel="stylesheet" href="${escAttr(h)}">`),
        a.css ? `<style>\n${a.css}\n</style>` : "",
        body,
        ...(a.scripts || []).map((s) => `<script src="${escAttr(s)}"></script>`),
        a.js ? `<script>\n${a.js}\n</script>` : "",
    ].filter(Boolean).join("\n");
}
