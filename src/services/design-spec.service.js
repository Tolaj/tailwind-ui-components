// @ts-check
// The design spec on the server: what MCP hands an AI (get_design_spec) and the small patches it sends back
// (apply_design_patch). The spec itself is built by the shared module (packages/core/design-spec.js); this file reads
// HTML without a browser, applies patches to the real code, and saves the result as a new version.
//
// A patch changes only what it names: every other byte of the design stays as the reader wrote it. It is checked and
// applied in full or not at all, and only to the version it was read from, so an id can't land on the wrong element.
import { parse, TextNode } from "node-html-parser";
import Component from "../models/component.model.js";
import { toSpec, walkElements, contentRoots } from "@windcraft/core/design-spec.js";
import { GROUPS, setGroup, BREAKPOINTS, STATES } from "@windcraft/core/class-groups.js";
import { buildProfile, enrichProfileWithAI } from "./profile.service.js";

const READ = { comment: true, blockTextElements: { script: true, noscript: true, style: true } };
/** HTML text as a tree, the way the browser would read it (comments kept, <style>/<script> left as written). */
export const readHtml = (html) => parse(String(html || ""), READ);

/**
 * The spec of a saved design, with the version a patch must name (and a warning when its HTML is broken).
 * opts.svg = false leaves icons' drawings out (for an AI reading it; the export keeps them).
 */
export function specOf(component, opts = {}) {
    const root = readHtml(component.htmlCode);
    const broken = brokenAt(root, component.htmlCode);
    return {
        id: String(component._id),
        title: component.title,
        version: component.version || 1,
        kind: component.kind,
        ...(broken ? { warning: `${broken} It can't be patched until it's fixed: open it in the editor and save, or save corrected HTML.` } : {}),
        ...toSpec(root, opts),
    };
}

/**
 * A warning for a design styled mostly by its own CSS classes instead of Tailwind (the Windcraft editor and prop patches
 * work with Tailwind classes), or null. Judged by how many of its classes the spec reads as Tailwind props.
 */
export function tailwindWarning(html) {
    let props = 0, raw = 0;
    const count = (nodes) => nodes.forEach((n) => {
        if (!n.tag) return;
        props += Object.values(n.props || {}).reduce((s, p) => s + Object.keys(p).length, 0);
        raw += (n.raw || []).length;
        if (n.children) count(n.children);
    });
    const spec = toSpec(readHtml(html), { svg: false });
    count(spec.tree);
    if (raw < 8 || props >= raw) return null;
    return `This design is styled mostly by its own CSS (${raw} custom classes, ${props} Tailwind ones${spec.assets.css ? `, ${spec.assets.css.length} characters of <style>` : ""}). It's saved, but the Windcraft editor and prop patches work with Tailwind classes: next time, style it with Tailwind utility classes on the elements.`;
}

// ── Checking ─────────────────────────────────────────────────────────────────
/**
 * One patch operation. `id` is an element id of the spec the patch was read from; `at` a breakpoint or state ("md", "hover", "md:hover").
 * @typedef {{ op: "set", id: string, prop: string, value: string, at?: string }
 *   | { op: "unset", id: string, prop: string, at?: string }
 *   | { op: "classes", id: string, add?: string | string[], remove?: string | string[] }
 *   | { op: "style", id: string, value: string | null }
 *   | { op: "text", id: string, text: string }
 *   | { op: "attr", id: string, name: string, value: string | null }
 *   | { op: "tag", id: string, tag: string }
 *   | { op: "insert", id?: string, position?: "inside" | "start" | "before" | "after", html: string }
 *   | { op: "remove", id: string }
 *   | { op: "move", id: string, to: string, position?: "inside" | "start" | "before" | "after" }
 *   | { op: "rule", selector: string, prop: string, value: string | null, media?: string }} PatchOp
 */

export class PatchError extends Error {
    constructor(index, message) {
        super(index === null ? message : `op ${index + 1}: ${message}`);
        this.index = index;
    }
}

const VARIANTS = new Set([...BREAKPOINTS, ...STATES].filter(Boolean));
/** "base" -> "", "md" -> "md:", "md:hover" -> "md:hover:" */
function variantOf(at) {
    if (at === undefined || at === null || at === "" || at === "base") return "";
    const parts = String(at).split(":");
    if (!parts.every((p) => VARIANTS.has(p))) throw new Error(`"${at}" is not a breakpoint or state (${[...VARIANTS].join(", ")})`);
    return `${parts.join(":")}:`;
}

// tags an element can switch to: only within its own family, so the HTML stays valid
const FAMILIES = [
    ["div", "section", "article", "aside", "header", "footer", "nav", "main", "figure", "blockquote"],
    ["p", "h1", "h2", "h3", "h4", "h5", "h6"],
    ["span", "strong", "em", "small", "b", "i", "u", "s", "mark", "label"],
    ["a", "button"],
    ["ul", "ol"],
    ["td", "th"],
];
const familyOf = (tag) => FAMILIES.find((f) => f.includes(tag));

const ATTR_NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;
const CLASS_TOKEN = /^[^\s"'<>`]+$/;
const POSITIONS = ["inside", "start", "before", "after"];
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tagOf = (n) => String(n.rawTagName || "").toLowerCase();

// ── Writing back: unchanged code is copied from the original text ────────────
// The reader rewrites some things it reads (<img /> loses its slash, <path/> becomes <path></path>), so the result is not
// the reader's own output: every node that wasn't touched is copied from the original source, byte for byte, using the
// position the reader recorded for it. Only an element whose own tag or attributes changed gets a new opening tag.
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
/**
 * Marks the nodes whose recorded position can be trusted: it holds all of their children, in order, without overlap.
 * Malformed HTML (a stray closing tag) can leave an element's position covering only its opening tag: such an element is
 * written out again from its parts instead of copied.
 */
function markOriginal(n) {
    const kids = n.childNodes || [];
    kids.forEach(markOriginal);
    if (!n.range) return;
    let at = n.rawTagName ? n.range[0] + 1 : n.range[0];
    n.__orig = kids.every((k) => {
        if (!k.range || k.range[0] < at || k.range[1] > n.range[1]) return false;
        at = k.range[1];
        return true;
    });
}
const touchedDeep = (n) => n.__self || n.__kids || (n.childNodes || []).some(touchedDeep);
/** Where the opening tag that starts at `i` ends (just after its ">"), skipping quoted attribute values. */
function openTagEnd(src, i) {
    let q = "";
    for (let j = i + 1; j < src.length; j++) {
        const ch = src[j];
        if (q) { if (ch === q) q = ""; } else if (ch === "\"" || ch === "'") q = ch;
        else if (ch === ">") return j + 1;
    }
    return src.length;
}
/** Where the HTML is malformed (a tag never closed, a stray closing tag), as a sentence, or null when it's sound. */
function brokenAt(root, src) {
    markOriginal(root);
    /** @type {any} */
    let bad = null;
    const find = (n) => {
        if (bad) return;
        if (n.nodeType === 1 && n.range && !n.__orig) {
            const kidsOk = (n.childNodes || []).every((k) => !k.range || k.__orig);
            if (kidsOk || !n.rawTagName) { (n.childNodes || []).forEach(find); if (!bad && n.rawTagName) bad = n; return; }
        }
        (n.childNodes || []).forEach(find);
    };
    find(root);
    if (!bad) return null;
    const line = src.slice(0, bad.range[0]).split("\n").length;
    return `This design's HTML is malformed around line ${line} (a <${bad.rawTagName}> whose tags don't match up, e.g. one never closed).`;
}

function write(n, src) {
    if (!n.range) return n.toString(); // added by the patch
    if (n.__orig && (n.nodeType !== 1 || !touchedDeep(n))) return src.slice(n.range[0], n.range[1]);
    if (n.nodeType !== 1) return n.toString();
    const inner = n.childNodes.map((k) => write(k, src)).join("");
    if (!n.rawTagName) {
        // the document itself: keep what sat before its first node and after its last (a trailing newline), as read
        return n.__edges ? src.slice(0, n.__edges[0]) + inner + src.slice(n.__edges[1]) : inner;
    }
    const end = openTagEnd(src, n.range[0]);
    const selfClosed = src[end - 2] === "/";
    const open = n.__self || !n.__orig ? `<${n.rawTagName}${n.rawAttrs ? ` ${n.rawAttrs}` : ""}${selfClosed && !inner ? " /" : ""}>` : src.slice(n.range[0], end);
    if (VOID.has(n.rawTagName.toLowerCase()) || (selfClosed && !inner)) return open;
    return `${open}${inner}</${n.rawTagName}>`;
}

// ── CSS rules in <style> ─────────────────────────────────────────────────────
// Designs styled with their own CSS (".btn-primary { background: ... }") are patched by editing the rule itself.
// A small scanner, enough for that: it skips comments and strings, and finds blocks by matching braces.

/** Index just after the brace matching the "{" at i (or the end), skipping comments and strings. */
function blockEnd(css, i) {
    let depth = 0;
    for (let j = i; j < css.length; j++) {
        const ch = css[j];
        if (ch === "/" && css[j + 1] === "*") { j = css.indexOf("*/", j + 2); if (j === -1) return css.length; j++; }
        else if (ch === '"' || ch === "'") { const k = css.indexOf(ch, j + 1); j = k === -1 ? css.length : k; }
        else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) return j + 1;
    }
    return css.length;
}
/** "@media (min-width:768px)" and "@media ( min-width: 768px )" are the same query */
const normMedia = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([:(),])\s*/g, "$1").trim().toLowerCase();
const normSel = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([,>+~])\s*/g, "$1").trim();

/** The rules of a stylesheet (or of the inside of an @media block): { prelude, start, open, end } with body = css.slice(open + 1, end - 1). */
function rulesOf(css, from = 0, to = css.length) {
    const out = [];
    let i = from;
    while (i < to) {
        const open = css.indexOf("{", i);
        if (open === -1 || open >= to) break;
        // the prelude starts after the previous rule or a ";" (an @import), comments skipped
        const prelude = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, "").split(";").pop();
        const end = Math.min(blockEnd(css, open), to);
        out.push({ prelude: prelude.trim(), start: i, open, end });
        i = end;
    }
    return out;
}

/** Sets (or with value null removes) one declaration in a rule body, keeping the rest of it as written. */
function setDeclaration(body, prop, value) {
    // split at ";" outside parentheses and strings (a data: URL in url(...) has its own ";")
    const parts = [];
    let depth = 0, q = "", last = 0;
    for (let j = 0; j < body.length; j++) {
        const ch = body[j];
        if (q) { if (ch === q) q = ""; continue; }
        if (ch === '"' || ch === "'") q = ch;
        else if (ch === "(") depth++;
        else if (ch === ")") depth--;
        else if (ch === ";" && depth === 0) { parts.push(body.slice(last, j)); last = j + 1; }
    }
    parts.push(body.slice(last));
    const name = prop.toLowerCase();
    const at = parts.findIndex((d) => d.includes(":") && d.slice(0, d.indexOf(":")).replace(/\/\*[\s\S]*?\*\//g, "").trim().toLowerCase() === name);
    if (at !== -1) {
        if (value === null) parts.splice(at, 1);
        else parts[at] = parts[at].replace(/:[\s\S]*?(\s*)$/, (_, tail) => `: ${value}${tail}`);
        return parts.join(";");
    }
    if (value === null) return body;
    // a new one goes after the last declaration, indented like it
    const trimmedEnd = body.replace(/\s*$/, "");
    const tail = body.slice(trimmedEnd.length);
    const indent = (body.match(/\n([ \t]*)\S/) || [])[1];
    const sep = trimmedEnd && !trimmedEnd.endsWith(";") ? ";" : "";
    return `${trimmedEnd}${sep}${indent !== undefined ? `\n${indent}` : " "}${prop}: ${value};${tail || " "}`;
}

/**
 * Edits a CSS rule in the design's <style> elements: the rule with this selector (inside the @media given by `media`,
 * else at the top level). Returns false when no such rule exists (the caller adds one).
 */
function editRule(styles, selector, media, prop, value) {
    const want = normSel(selector), wantMedia = media ? normMedia(media) : null;
    for (const st of styles) {
        const css = st.childNodes.map((k) => k.rawText).join("");
        const scope = (from, to) => rulesOf(css, from, to);
        let rules = scope(0, css.length);
        if (wantMedia) {
            const m = rules.find((r) => r.prelude.startsWith("@") && normMedia(r.prelude) === wantMedia);
            if (!m) continue;
            rules = scope(m.open + 1, m.end - 1);
        }
        const r = rules.find((x) => !x.prelude.startsWith("@") && normSel(x.prelude) === want);
        if (!r) continue;
        const body = css.slice(r.open + 1, r.end - 1);
        const next = css.slice(0, r.open + 1) + setDeclaration(body, prop, value) + css.slice(r.end - 1);
        st.childNodes = [new TextNode(next, st)];
        st.__kids = true;
        return true;
    }
    return false;
}

// ── Applying ─────────────────────────────────────────────────────────────────
const detach = (n) => {
    if (n.parentNode) n.parentNode.__kids = true;
    const p = n.parentNode;
    if (p) p.childNodes.splice(p.childNodes.indexOf(n), 1);
    n.parentNode = null;
};
/** Puts nodes inside `target` (at its end, or its start) or next to it (before, after). */
function place(nodes, target, position) {
    let parent = target, i = target.childNodes.length;
    if (position === "start") i = 0;
    else if (position === "before" || position === "after") {
        parent = target.parentNode;
        i = parent.childNodes.indexOf(target) + (position === "after" ? 1 : 0);
    }
    parent.childNodes.splice(i, 0, ...nodes);
    parent.__kids = true;
    nodes.forEach((n) => { n.parentNode = parent; });
}
const contains = (outer, n) => { for (let p = n; p; p = p.parentNode) if (p === outer) return true; return false; };

/**
 * Applies patch operations to HTML. Ids are the ones of the spec made from this same HTML. Returns { html, changed }
 * (the ids of the elements touched), or throws a PatchError naming the first op that can't be applied (nothing changes).
 * @param {string} html
 * @param {PatchOp[]} ops
 * @returns {{ html: string, changed: string[] }}
 */
export function applyOps(html, ops) {
    if (!Array.isArray(ops) || !ops.length) throw new PatchError(null, "ops must be a non-empty array");
    if (ops.length > 200) throw new PatchError(null, "at most 200 ops per patch");
    /** @type {any} */
    const root = readHtml(html); // the reader's nodes, plus the marks this file puts on them (__orig, __self, __kids, __edges)
    const broken = brokenAt(root, String(html || ""));
    if (broken) throw new PatchError(null, `${broken} Fix it first: open it in the editor and save (the editor repairs it), or save corrected HTML.`);
    const tops = root.childNodes.filter((k) => k.range);
    if (tops.length) root.__edges = [tops[0].range[0], tops[tops.length - 1].range[1]];
    const byId = new Map();
    walkElements(contentRoots(root), (n, id) => { byId.set(id, n); });
    const container = root.querySelector("body") || root;
    const changed = new Set();

    ops.forEach((op, i) => {
        const fail = (msg) => { throw new PatchError(i, msg); };
        if (!op || typeof op !== "object") fail("each op must be an object");
        const find = (key) => {
            const id = op[key];
            const n = byId.get(id);
            if (!n) fail(`no element "${id}" in this version (ids run n1...n${byId.size})`);
            if (!contains(root, n)) fail(`"${id}" was removed by an earlier op`);
            return n;
        };
        const el = (op.op === "insert" && !op.id) || op.op === "rule" ? null : find("id");
        try {
            switch (op.op) {
                case "set":
                case "unset": {
                    if (!GROUPS[op.prop]) fail(`unknown prop "${op.prop}"`);
                    const value = op.op === "unset" ? "" : op.value;
                    if (op.op === "set" && (value === undefined || value === null || value === "")) fail("set needs a value (use unset to remove)");
                    const next = setGroup(el.getAttribute("class") || "", op.prop, value, variantOf(op.at));
                    if (next === null) fail(`"${value}" is not a valid ${op.prop}`);
                    next ? el.setAttribute("class", next) : el.removeAttribute("class");
                    break;
                }
                case "classes": {
                    /** @type {(v: any) => string[]} */
                    const list = (v) => [].concat(v || []);
                    const add = list(op.add), remove = new Set(list(op.remove));
                    if (![...add, ...remove].every((t) => typeof t === "string" && CLASS_TOKEN.test(t))) fail("classes must be single class names");
                    const now = (el.getAttribute("class") || "").split(/\s+/).filter((t) => t && !remove.has(t));
                    const next = [...now, ...add.filter((t) => !now.includes(t))].join(" ");
                    next ? el.setAttribute("class", next) : el.removeAttribute("class");
                    break;
                }
                case "style":
                    if (op.value === null || op.value === "") el.removeAttribute("style");
                    else if (typeof op.value === "string" && !/[<>]/.test(op.value)) el.setAttribute("style", op.value);
                    else fail("style needs a CSS declarations string, or null to remove it");
                    break;
                case "text":
                    if (typeof op.text !== "string") fail("text needs a string");
                    if (el.childNodes.some((k) => k.nodeType === 1)) fail(`"${op.id}" holds other elements; change their text instead`);
                    el.set_content(escText(op.text));
                    el.__kids = true;
                    break;
                case "attr": {
                    const name = String(op.name || "");
                    if (!ATTR_NAME.test(name)) fail(`invalid attribute name "${name}"`);
                    if (/^(class|style)$/i.test(name)) fail(`use the ${name === "class" ? "set or classes" : "style"} op for ${name}`);
                    if (/^on/i.test(name)) fail("event handler attributes are not allowed");
                    if (op.value === null || op.value === undefined) el.removeAttribute(name);
                    else el.setAttribute(name, String(op.value));
                    break;
                }
                case "tag": {
                    const tag = String(op.tag || "").toLowerCase();
                    const fam = familyOf(tagOf(el));
                    if (!fam || !fam.includes(tag)) fail(`<${tagOf(el)}> can only become ${fam ? fam.filter((t) => t !== tagOf(el)).join(", ") : "nothing (its tag is fixed)"}`);
                    el.tagName = tag;
                    break;
                }
                case "insert": {
                    if (typeof op.html !== "string" || !op.html.trim()) fail("insert needs html");
                    if (/<script\b/i.test(op.html)) fail("insert can't add <script>");
                    const position = op.position || "inside";
                    if (!POSITIONS.includes(position)) fail(`position must be one of ${POSITIONS.join(", ")}`);
                    const nodes = [...readHtml(op.html).childNodes];
                    place(nodes, el || container, el ? position : position === "start" ? "start" : "inside");
                    if (el) changed.add(op.id);
                    return;
                }
                case "remove":
                    detach(el);
                    break;
                case "move": {
                    const to = find("to");
                    if (contains(el, to)) fail("can't move an element into itself");
                    const position = op.position || "inside";
                    if (!POSITIONS.includes(position)) fail(`position must be one of ${POSITIONS.join(", ")}`);
                    detach(el);
                    place([el], to, position);
                    changed.add(op.to);
                    break;
                }
                case "rule": {
                    const selector = String(op.selector || "").trim(), prop = String(op.prop || "").trim().toLowerCase();
                    const value = op.value === null || op.value === undefined ? null : String(op.value).trim();
                    if (!selector || /[{}<>]/.test(selector)) fail("rule needs a selector, as written in the design's CSS (e.g. \".btn-primary\")");
                    if (!/^-{0,2}[a-z][a-z0-9-]*$/.test(prop)) fail(`invalid CSS property "${op.prop}"`);
                    if (value !== null && (!value || /[{}<>;]/.test(value.replace(/\([^)]*\)/g, "")))) fail("rule needs a CSS value (no ; { } < >), or null to remove the property");
                    if (op.media !== undefined && (typeof op.media !== "string" || !/^@media\b/.test(op.media.trim()) || /[{}<>]/.test(op.media))) fail("media must be the rule's @media line, e.g. \"@media (min-width: 768px)\"");
                    const styles = root.querySelectorAll("style");
                    if (editRule(styles, selector, op.media, prop, value)) { changed.add("css"); return; }
                    if (value === null) fail(`no rule "${selector}"${op.media ? ` in ${op.media}` : ""} in the design's CSS`);
                    // no such rule yet: add it to the last <style>, or a new <style> at the start of the design
                    const rule = `${selector} { ${prop}: ${value}; }`;
                    const add = op.media ? `${op.media.trim()} { ${rule} }` : rule;
                    if (styles.length) {
                        const st = styles[styles.length - 1];
                        const css = st.childNodes.map((k) => k.rawText).join("");
                        st.childNodes = [new TextNode(`${css.replace(/\s*$/, "")}\n${add}\n`, st)];
                        st.__kids = true;
                    } else {
                        const head = root.querySelector("head");
                        place([...readHtml(`<style>\n${add}\n</style>`).childNodes], head || container, head ? "inside" : "start");
                    }
                    changed.add("css");
                    return;
                }
                default:
                    fail(`unknown op "${/** @type {any} */ (op).op}" (set, unset, classes, style, text, attr, tag, insert, remove, move, rule)`);
            }
        } catch (e) {
            if (e instanceof PatchError) throw e;
            fail(/** @type {Error} */ (e).message);
        }
        if (["set", "unset", "classes", "style", "attr", "tag"].includes(op.op)) el.__self = true;
        if ("id" in op && op.id) changed.add(op.id);
    });
    return { html: write(root, String(html || "")), changed: [...changed] };
}

/**
 * Patches a saved design: the patch must be for its current version. Saves the result as a new version (the old code
 * stays in its history) and returns the new spec, so the next patch can build on it straight away.
 */
/**
 * Checks the version a patch was made from against the design's. `version` (the field's name in the spec) is accepted
 * for `baseVersion`. Throws a PatchError that says exactly what to send.
 */
export function checkBaseVersion(baseVersion, current) {
    const missing = baseVersion === undefined || baseVersion === null || baseVersion === "";
    if (missing) throw new PatchError(null, `baseVersion is missing: pass the "version" from get_design_spec (this design is v${current}), e.g. "baseVersion": ${current}.`);
    if (!Number.isInteger(Number(baseVersion))) throw new PatchError(null, `baseVersion must be a number, the "version" from get_design_spec (this design is v${current}).`);
    if (Number(baseVersion) !== current) throw new PatchError(null, `The design changed since you read it: it is now v${current}, the patch was made from v${Number(baseVersion)}. Read it again with get_design_spec (ids may have changed) and make the patch from that, with "baseVersion": ${current}.`);
}

export async function patchDesign(userId, { id, baseVersion, version, ops, note }) {
    if (!/^[a-f0-9]{24}$/i.test(String(id))) throw new PatchError(null, "Invalid design id");
    const c = await Component.findOne({ _id: id, createdBy: userId });
    if (!c) throw new PatchError(null, "Design not found in your library");
    checkBaseVersion(baseVersion ?? version, c.version || 1);
    const { html, changed } = applyOps(c.htmlCode, ops);
    if (html !== c.htmlCode) {
        c.versions.push(/** @type {any} */ ({ version: c.version, htmlCode: c.htmlCode, note: String(note || `Patch: ${ops.length} change${ops.length === 1 ? "" : "s"}`).slice(0, 200) }));
        c.version += 1;
        c.htmlCode = html;
        c.profile = buildProfile(html, c.profile);
        await c.save();
        enrichProfileWithAI(c._id, userId);
    }
    return { version: c.version, changed, spec: specOf(c, { svg: false }) };
}
