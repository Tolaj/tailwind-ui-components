const TAILWIND_RE = /tailwindcss|@tailwindcss\/browser/i;

const isTailwindScript = (s) => s.src && TAILWIND_RE.test(s.src);

/**
 * Splits whatever the user pasted (fragment, full document, with <style>,
 * <link>, <script>, body attributes) into separately usable parts.
 */
export function parseComponentSource(code) {
    const dom = new DOMParser().parseFromString(code || "", "text/html");
    const hasBodyTag = /<body[\s>]/i.test(code || "");

    const styles = [];
    const links = [];
    const scripts = [];

    dom.querySelectorAll("style").forEach((el) => {
        styles.push({ type: el.getAttribute("type") || "", text: el.textContent });
        el.remove();
    });

    dom.querySelectorAll("link").forEach((el) => {
        const rel = (el.getAttribute("rel") || "").toLowerCase();
        if (rel === "stylesheet" || rel === "preconnect" || rel === "preload") {
            links.push(el.outerHTML);
        }
        el.remove();
    });

    dom.querySelectorAll("script").forEach((el) => {
        scripts.push({
            src: el.getAttribute("src") || "",
            type: el.getAttribute("type") || "",
            defer: el.hasAttribute("defer"),
            text: el.textContent,
        });
        el.remove();
    });

    const bodyAttrs = {};
    if (hasBodyTag) {
        Array.from(dom.body.attributes).forEach((a) => (bodyAttrs[a.name] = a.value));
    }

    return {
        markup: dom.body.innerHTML.trim(),
        styles,
        links,
        scripts,
        bodyAttrs,
        hasTailwindScript: scripts.some(isTailwindScript),
        hasCss: styles.length > 0 || links.length > 0,
        hasJs: scripts.some((s) => !isTailwindScript(s)),
    };
}

const escapeAttr = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const escapeScript = (t) => t.replace(/<\/script/gi, "<\\/script");

const HEIGHT_REPORTER = `
(function () {
    var last = 0;
    function report() {
        var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
        if (h && h !== last) { last = h; parent.postMessage({ type: "preview-height", height: h }, "*"); }
    }
    new ResizeObserver(report).observe(document.documentElement);
    window.addEventListener("load", report);
    // Esc in the live page goes back to editing (the editor's Interact tool listens for it)
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") parent.postMessage({ type: "key", key: "escape" }, "*"); });
})();`;

/** Builds a complete, standalone document for an iframe's srcdoc. */
export function buildPreviewDocument(parsed, { width } = {}) {
    const head = [
        '<meta charset="utf-8">',
        `<meta name="viewport" content="width=${width || "device-width"}, initial-scale=1">`,
    ];

    if (!parsed.hasTailwindScript) {
        head.push('<script src="https://cdn.tailwindcss.com"><\/script>');
    }
    head.push(...parsed.links);
    parsed.styles.forEach((s) => {
        const type = s.type ? ` type="${escapeAttr(s.type)}"` : "";
        head.push(`<style${type}>${s.text.replace(/<\/style/gi, "<\\/style")}</style>`);
    });

    const bodyAttrs = Object.entries(parsed.bodyAttrs)
        .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
        .join("");

    const scripts = parsed.scripts
        .map((s) => {
            const attrs =
                (s.src ? ` src="${escapeAttr(s.src)}"` : "") +
                (s.type ? ` type="${escapeAttr(s.type)}"` : "") +
                (s.defer ? " defer" : "");
            return `<script${attrs}>${s.src ? "" : escapeScript(s.text)}<\/script>`;
        })
        .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
${head.join("\n")}
<style>html,body{margin:0}</style>
</head>
<body${bodyAttrs}>
${parsed.markup}
${scripts}
<script>${HEIGHT_REPORTER}<\/script>
</body>
</html>`;
}
