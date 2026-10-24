// The design spec on the server: what MCP hands an AI (get_design_spec) and the small patches it sends back
// (apply_design_patch). The spec itself is built by the shared module (public/js/shared/design-spec.js); this file reads
// HTML without a browser, applies patches to the real code, and saves the result as a new version.
//
// A patch changes only what it names: every other byte of the design stays as the reader wrote it. It is checked and
// applied in full or not at all, and only to the version it was read from, so an id can't land on the wrong element.
import { parse } from "node-html-parser";
import Component from "../models/component.model.js";
import { toSpec, walkElements, contentRoots } from "../public/js/shared/design-spec.js";
import { GROUPS, setGroup, BREAKPOINTS, STATES } from "../public/js/design/class-groups.js";
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

// ── Checking ─────────────────────────────────────────────────────────────────
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
 */
export function applyOps(html, ops) {
    if (!Array.isArray(ops) || !ops.length) throw new PatchError(null, "ops must be a non-empty array");
    if (ops.length > 200) throw new PatchError(null, "at most 200 ops per patch");
    const root = readHtml(html);
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
        const el = op.op === "insert" && !op.id ? null : find("id");
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
                    const add = [].concat(op.add || []), remove = new Set([].concat(op.remove || []));
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
                default:
                    fail(`unknown op "${op.op}" (set, unset, classes, style, text, attr, tag, insert, remove, move)`);
            }
        } catch (e) {
            if (e instanceof PatchError) throw e;
            fail(e.message);
        }
        if (["set", "unset", "classes", "style", "attr", "tag"].includes(op.op)) el.__self = true;
        changed.add(op.id);
    });
    return { html: write(root, String(html || "")), changed: [...changed] };
}

/**
 * Patches a saved design: the patch must be for its current version. Saves the result as a new version (the old code
 * stays in its history) and returns the new spec, so the next patch can build on it straight away.
 */
export async function patchDesign(userId, { id, baseVersion, ops, note }) {
    if (!/^[a-f0-9]{24}$/i.test(String(id))) throw new PatchError(null, "Invalid design id");
    const c = await Component.findOne({ _id: id, createdBy: userId });
    if (!c) throw new PatchError(null, "Design not found in your library");
    if (Number(baseVersion) !== (c.version || 1)) throw new PatchError(null, `The design is now v${c.version || 1}, but this patch was made from v${baseVersion}. Read it again with get_design_spec and make the patch from that.`);
    const { html, changed } = applyOps(c.htmlCode, ops);
    if (html !== c.htmlCode) {
        c.versions.push({ version: c.version, htmlCode: c.htmlCode, note: String(note || `Patch: ${ops.length} change${ops.length === 1 ? "" : "s"}`).slice(0, 200) });
        c.version += 1;
        c.htmlCode = html;
        c.profile = buildProfile(html, c.profile);
        await c.save();
        enrichProfileWithAI(c._id, userId);
    }
    return { version: c.version, changed, spec: specOf(c, { svg: false }) };
}
