const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

const ATTR_MAP = {
    class: "className", for: "htmlFor", tabindex: "tabIndex", readonly: "readOnly", maxlength: "maxLength",
    minlength: "minLength", autocomplete: "autoComplete", autofocus: "autoFocus", colspan: "colSpan",
    rowspan: "rowSpan", viewbox: "viewBox", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin", "fill-rule": "fillRule", "clip-rule": "clipRule", "stroke-miterlimit": "strokeMiterlimit",
    "stop-color": "stopColor", "stop-opacity": "stopOpacity", "fill-opacity": "fillOpacity", "stroke-opacity": "strokeOpacity",
    "xlink:href": "xlinkHref", crossorigin: "crossOrigin", srcset: "srcSet", datetime: "dateTime", enctype: "encType",
    contenteditable: "contentEditable", spellcheck: "spellCheck", "accept-charset": "acceptCharset",
};

const EVENT_RE = /^on[a-z]+$/;

/** Splits pasted source into markup, css and js, mirroring the browser-side parser. */
export function splitSource(code = "") {
    const styles = [];
    const scripts = [];
    const markup = code
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => (styles.push(css.trim()), ""))
        .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attrs, js) => {
            if (!/\bsrc\s*=/.test(attrs)) scripts.push(js.trim());
            return "";
        })
        .trim();
    return { markup, css: styles.join("\n\n"), js: scripts.join("\n\n") };
}

const kebabToCamel = (s) => (s.startsWith("--") ? s : s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()));

function styleToObject(style) {
    const entries = style
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
            const i = d.indexOf(":");
            const key = kebabToCamel(d.slice(0, i).trim());
            const val = d.slice(i + 1).trim().replace(/'/g, "\\'");
            return `${/^[a-zA-Z_$][\w$]*$/.test(key) ? key : `'${key}'`}: '${val}'`;
        });
    return `{{ ${entries.join(", ")} }}`;
}

const escapeText = (t) => t.replace(/[{}]/g, (c) => `{'${c}'}`);

function tagToJsx(tag) {
    const m = tag.match(/^<(\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?)>$/);
    if (!m) return tag;
    const [, closing, name, rest, selfClose] = m;
    if (closing) return VOID_TAGS.has(name.toLowerCase()) ? "" : `</${name}>`;
    const attrs = [];
    const attrRe = /([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let a;
    while ((a = attrRe.exec(rest))) {
        const raw = a[1];
        const value = a[2] ?? a[3] ?? a[4];
        const lower = raw.toLowerCase();
        if (EVENT_RE.test(lower)) continue;
        const key = ATTR_MAP[lower] || (raw.startsWith("data-") || raw.startsWith("aria-") ? raw : raw);
        if (value === undefined) attrs.push(key);
        else if (lower === "style") attrs.push(`style=${styleToObject(value)}`);
        else attrs.push(`${key}="${value.replace(/"/g, "&quot;")}"`);
    }
    const open = `<${name}${attrs.length ? " " + attrs.join(" ") : ""}`;
    return VOID_TAGS.has(name.toLowerCase()) || selfClose ? `${open} />` : `${open}>`;
}

function htmlToJsx(markup) {
    return markup
        .split(/(<!--[\s\S]*?-->|<[^>]+>)/g)
        .map((part) => {
            if (!part) return "";
            if (part.startsWith("<!--")) return `{/*${part.slice(4, -3)}*/}`;
            if (part.startsWith("<")) return tagToJsx(part);
            return escapeText(part);
        })
        .join("");
}

const indent = (s, n = 2) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

export function toReact(code, name = "Component") {
    const { markup, css, js } = splitSource(code);
    const jsx = htmlToJsx(markup) + (css ? `\n<style>{\`${css.replace(/`/g, "\\`")}\`}</style>` : "");
    const imports = js ? "import { useEffect } from 'react';\n\n" : "";
    const effect = js ? `  useEffect(() => {\n${indent(js, 4)}\n  }, []);\n\n` : "";
    return `${imports}export default function ${name}() {\n${effect}  return (\n    <>\n${indent(jsx, 6)}\n    </>\n  );\n}\n`;
}

export function toVue(code) {
    const { markup, css, js } = splitSource(code);
    const parts = [`<template>\n${indent(markup)}\n</template>`];
    if (js) parts.push(`<script setup>\nimport { onMounted } from 'vue';\n\nonMounted(() => {\n${indent(js)}\n});\n</script>`);
    if (css) parts.push(`<style scoped>\n${css}\n</style>`);
    return parts.join("\n\n") + "\n";
}

export function toSvelte(code) {
    const { markup, css, js } = splitSource(code);
    const parts = [];
    if (js) parts.push(`<script>\n  import { onMount } from 'svelte';\n\n  onMount(() => {\n${indent(js, 4)}\n  });\n</script>`);
    parts.push(escapeText(markup));
    if (css) parts.push(`<style>\n${css}\n</style>`);
    return parts.join("\n\n") + "\n";
}

export const FORMATS = ["html", "react", "vue", "svelte"];

export function exportComponent(code, format = "html", name = "Component") {
    const safeName = String(name).replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^[^a-zA-Z]+/, "") || "Component";
    const cap = safeName[0].toUpperCase() + safeName.slice(1);
    switch (format) {
        case "react": return toReact(code, cap);
        case "vue": return toVue(code);
        case "svelte": return toSvelte(code);
        default: return code;
    }
}
