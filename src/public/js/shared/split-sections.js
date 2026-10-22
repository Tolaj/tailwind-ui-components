// Pure string logic (no DOM) so the same code runs on the server and in the browser.
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);
const SKIP_TOP = new Set(["script", "style", "link", "meta", "title", "noscript", "template"]);
const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

const stripTags = (s) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Top-level elements of a markup string, as { tag, html, start, end }. */
export function topLevelElements(markup) {
    const out = [];
    let depth = 0;
    let current = null;
    TAG_RE.lastIndex = 0;
    let m;
    while ((m = TAG_RE.exec(markup))) {
        if (m[0].startsWith("<!--")) continue;
        const closing = m[1] === "/";
        const tag = m[2].toLowerCase();
        const selfClosing = VOID.has(tag) || /\/\s*$/.test(m[3]);

        if (!closing && RAW.has(tag)) {
            const close = markup.toLowerCase().indexOf(`</${tag}`, TAG_RE.lastIndex);
            const end = close === -1 ? markup.length : markup.indexOf(">", close) + 1;
            if (depth === 0) out.push({ tag, html: markup.slice(m.index, end), start: m.index, end });
            TAG_RE.lastIndex = end;
            continue;
        }

        if (!closing) {
            if (depth === 0) current = { tag, start: m.index };
            if (selfClosing) {
                if (depth === 0) out.push({ tag, html: m[0], start: m.index, end: TAG_RE.lastIndex });
            } else depth++;
        } else if (depth > 0) {
            depth--;
            if (depth === 0 && current) {
                out.push({ tag: current.tag, html: markup.slice(current.start, TAG_RE.lastIndex), start: current.start, end: TAG_RE.lastIndex });
                current = null;
            }
        }
    }
    return out;
}

function innerHtml(el) {
    const open = el.html.indexOf(">") + 1;
    const close = el.html.toLowerCase().lastIndexOf(`</${el.tag}`);
    return close > open ? el.html.slice(open, close) : "";
}

/** Splits a page body into its main sections, or [] when it should stay one piece. */
const SEMANTIC = new Set(["section", "header", "footer", "nav", "article"]);
const SIDE_BY_SIDE = /\bclass\s*=\s*["'][^"']*\b(?:flex|inline-flex|grid)\b/;

/**
 * Splits a page body into its main sections, or [] when it should stay one piece.
 * Only vertically stacked, semantic sections qualify. App shells (a sidebar next to a main area,
 * flex or grid wrappers) and plain div soup are left whole.
 */
export function splitSections(markup, maxSections = 20) {
    let els = topLevelElements(markup).filter((e) => !SKIP_TOP.has(e.tag));
    for (let i = 0; i < 3 && els.length === 1; i++) {
        const opening = els[0].html.slice(0, els[0].html.indexOf(">") + 1);
        if (SIDE_BY_SIDE.test(opening) && !/\bflex-col\b/.test(opening)) return [];
        const kids = topLevelElements(innerHtml(els[0])).filter((e) => !SKIP_TOP.has(e.tag));
        if (!kids.length) break;
        els = kids;
    }
    if (els.length < 2) return [];
    if (els.some((e) => e.tag === "aside")) return [];
    if (els.filter((e) => SEMANTIC.has(e.tag)).length < 2) return [];
    return els.slice(0, maxSections).map((e, i) => {
        const heading = stripTags((e.html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i) || [])[1] || "");
        const aria = (e.html.match(/^<[^>]*\baria-label\s*=\s*"([^"]+)"/i) || [])[1];
        const label = { header: "Header", nav: "Navigation", footer: "Footer", main: "Main", section: `Section ${i + 1}`, article: `Article ${i + 1}`, div: `Block ${i + 1}` }[e.tag] || `Block ${i + 1}`;
        return { name: (heading || aria || label).slice(0, 60), kind: e.tag, html: e.html };
    });
}

/** Separates a full document into title, assets (styles/links/scripts) and body markup. */
export function parseDocument(html = "") {
    const title = stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const description = (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || "";
    const styles = [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]);
    const links = [...html.matchAll(/<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi)].map((m) => m[0]);
    const scripts = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0]);

    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    let body = bodyMatch ? bodyMatch[1] : html.replace(/<head\b[\s\S]*?<\/head>/i, "").replace(/<\/?(?:html|body)\b[^>]*>/gi, "").replace(/<!doctype[^>]*>/i, "");
    body = body
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<link\b[^>]*>/gi, "")
        .trim();

    const heading = stripTags((body.match(/<h[1-2]\b[^>]*>([\s\S]*?)<\/h[1-2]>/i) || [])[1] || "");
    return { title, description, heading, styles, links, scripts, body };
}
