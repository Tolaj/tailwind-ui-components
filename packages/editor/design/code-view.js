// @ts-check
// What the editor's code boxes need beyond a textarea: syntax colours (painted on a layer behind the see-through
// textarea), a check for tags that don't match up, and tidy indentation on request. Used by the code panel and by the
// Code tab's element code (editor.js).

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
/** Tags whose closing tag HTML lets you leave out (the browser closes them itself). */
const OPTIONAL_CLOSE = new Set(["p", "li", "dt", "dd", "option", "optgroup", "tr", "td", "th", "thead", "tbody", "tfoot", "colgroup", "rt", "rp", "html", "head", "body"]);
/** Tags whose content is text, not markup. */
const RAW = new Set(["script", "style", "textarea", "title"]);

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TAG_RE = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(>?)/y;
const ATTR_RE = /([^\s=/>]+)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s>]+)?/g;

/** The text cut into coloured pieces: [start, end, class] for every non-plain run (tags, attributes, strings, comments). */
function tokens(text) {
    const out = [];
    let i = 0;
    while (i < text.length) {
        const lt = text.indexOf("<", i);
        if (lt === -1) break;
        if (text.startsWith("<!--", lt)) {
            const end = text.indexOf("-->", lt + 4);
            const e = end === -1 ? text.length : end + 3;
            out.push([lt, e, "ck-com"]);
            i = e;
            continue;
        }
        if (text[lt + 1] === "!") { // <!doctype html>
            const e = text.indexOf(">", lt);
            out.push([lt, e === -1 ? text.length : e + 1, "ck-doc"]);
            i = e === -1 ? text.length : e + 1;
            continue;
        }
        TAG_RE.lastIndex = lt;
        const m = TAG_RE.exec(text);
        if (!m) { i = lt + 1; continue; }
        const nameEnd = lt + 1 + m[1].length + m[2].length;
        out.push([lt, nameEnd, "ck-tag"]);
        const attrs = m[3], base = nameEnd;
        let a;
        ATTR_RE.lastIndex = 0;
        while ((a = ATTR_RE.exec(attrs))) {
            if (!a[0]) { ATTR_RE.lastIndex++; continue; }
            const s = base + a.index;
            out.push([s, s + a[1].length, "ck-attr"]);
            if (a[3]) { const vs = s + a[1].length + (a[2] || "").length; out.push([vs, vs + a[3].length, "ck-str"]); }
        }
        const end = lt + m[0].length;
        if (m[4]) out.push([end - 1 - (attrs.endsWith("/") ? 1 : 0), end, "ck-tag"]);
        i = end;
        // the inside of <style> and <script> is not markup: skip to its closing tag
        const tag = m[2].toLowerCase();
        if (!m[1] && RAW.has(tag)) {
            const close = text.toLowerCase().indexOf(`</${tag}`, i);
            i = close === -1 ? text.length : close;
        }
    }
    return out;
}

/**
 * The text as coloured HTML for the layer behind a code textarea. `marks` ([start, end, class]) shade ranges on top of
 * the colours, such as the selected element's source.
 */
export function highlight(text, marks = []) {
    const toks = tokens(text);
    const cuts = new Set([0, text.length]);
    for (const [s, e] of [...toks, ...marks]) { cuts.add(s); cuts.add(e); }
    const points = [...cuts].filter((p) => p >= 0 && p <= text.length).sort((a, b) => a - b);
    let out = "", ti = 0, cur = null, buf = "";
    const flush = () => { if (buf) out += cur ? `<span class="${cur}">${esc(buf)}</span>` : esc(buf); buf = ""; };
    for (let k = 0; k < points.length - 1; k++) {
        const s = points[k], e = points[k + 1];
        while (ti < toks.length && toks[ti][1] <= s) ti++;
        const tk = toks[ti] && toks[ti][0] <= s && toks[ti][1] >= e ? toks[ti][2] : "";
        const cls = [tk, ...marks.filter((m) => m[0] <= s && m[1] >= e).map((m) => m[2])].filter(Boolean).join(" ") || null;
        if (cls !== cur) { flush(); cur = cls; }
        buf += text.slice(s, e);
    }
    flush();
    return out + "\n";
}

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

/**
 * The first place the tags don't match up, or null: { line, message }. A tag left open, a closing tag with nothing to
 * close, or a tag that never ends. Closing tags HTML lets you leave out (</p>, </li>, </td>...) are not required.
 */
export function checkTags(text) {
    const stack = [];
    let i = 0;
    while (i < text.length) {
        const lt = text.indexOf("<", i);
        if (lt === -1) break;
        if (text.startsWith("<!--", lt)) { const e = text.indexOf("-->", lt + 4); if (e === -1) return { line: lineAt(text, lt), message: "A comment (<!--) is never closed" }; i = e + 3; continue; }
        if (text[lt + 1] === "!") { const e = text.indexOf(">", lt); i = e === -1 ? text.length : e + 1; continue; }
        TAG_RE.lastIndex = lt;
        const m = TAG_RE.exec(text);
        if (!m) { i = lt + 1; continue; }
        const tag = m[2].toLowerCase();
        if (!m[4]) return { line: lineAt(text, lt), message: `<${m[1]}${tag}> never ends: it is missing its ">"` };
        i = lt + m[0].length;
        if (m[1]) {
            const at = stack.map((s) => s.tag).lastIndexOf(tag);
            if (at === -1) { if (!VOID.has(tag)) return { line: lineAt(text, lt), message: `</${tag}> closes nothing: there is no open <${tag}> here` }; continue; }
            const open = stack.slice(at + 1).find((s) => !OPTIONAL_CLOSE.has(s.tag));
            if (open) return { line: open.line, message: `<${open.tag}> is never closed (</${tag}> on line ${lineAt(text, lt)} comes first)` };
            stack.length = at;
            continue;
        }
        if (VOID.has(tag) || m[3].trim().endsWith("/")) continue;
        stack.push({ tag, line: lineAt(text, lt) });
        if (RAW.has(tag)) {
            const close = text.toLowerCase().indexOf(`</${tag}`, i);
            if (close === -1) return { line: lineAt(text, lt), message: `<${tag}> is never closed` };
            i = close;
        }
    }
    const open = [...stack].reverse().find((s) => !OPTIONAL_CLOSE.has(s.tag)); // the innermost: usually the one just typed
    return open ? { line: open.line, message: `<${open.tag}> is never closed` } : null;
}

// ── Format ───────────────────────────────────────────────────────────────────
const INLINE = new Set(["a", "abbr", "b", "bdi", "bdo", "br", "button", "cite", "code", "data", "dfn", "em", "i", "img", "input", "kbd", "label", "mark", "q", "s", "samp", "select", "small", "span", "strong", "sub", "sup", "svg", "time", "u", "var", "wbr", "textarea"]);
const KEEP = new Set(["pre", "textarea", "script", "style", "svg"]); // written exactly as they are
const openTag = (el) => { const c = el.cloneNode(false); c.innerHTML = ""; const h = c.outerHTML; return VOID.has(el.localName) ? h : h.slice(0, h.lastIndexOf("</")); };
const isInlineOnly = (el) => Array.from(el.childNodes).every((n) => n.nodeType === 3 || n.nodeType === 8 || (n.nodeType === 1 && INLINE.has(n.localName)));

/** Markup (a fragment, no <html>) with tidy indentation: block elements on their own lines, text and inline elements kept on theirs. */
export function formatHtml(markup, indent = "  ") {
    const tpl = document.createElement("template");
    tpl.innerHTML = markup;
    const lines = [];
    const walk = (node, depth) => {
        const pad = indent.repeat(depth);
        if (node.nodeType === 3) { const t = node.textContent.replace(/\s+/g, " ").trim(); if (t) lines.push(pad + esc(t)); return; }
        if (node.nodeType === 8) { lines.push(`${pad}<!--${node.data}-->`); return; }
        if (node.nodeType !== 1) return;
        const name = node.localName;
        if (KEEP.has(name) || VOID.has(name) || isInlineOnly(node)) {
            // short enough, or not to be touched: one line (inline content keeps its own spacing, squeezed)
            const html = KEEP.has(name) ? node.outerHTML : node.outerHTML.replace(/\s*\n\s*/g, " ");
            lines.push(pad + html);
            return;
        }
        lines.push(pad + openTag(node));
        Array.from(node.childNodes).forEach((k) => walk(k, depth + 1));
        lines.push(`${pad}</${name}>`);
    };
    Array.from(tpl.content.childNodes).forEach((n) => walk(n, 0));
    return lines.join("\n");
}

/** Line numbers for a gutter: "1\n2\n3..." */
export const lineNumbers = (text) => Array.from({ length: text.split("\n").length }, (_, i) => i + 1).join("\n");
