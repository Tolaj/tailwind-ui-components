import Component from "../models/component.model.js";
import { extractSpec } from "./spec.service.js";

const TOKEN_GROUPS = [
    ["colors", "Colors"],
    ["fontSizes", "Text sizes"],
    ["fontWeights", "Font weights"],
    ["fontFamilies", "Font families"],
    ["radius", "Corner radius"],
    ["spacing", "Spacing scale"],
    ["shadows", "Shadows"],
];

const oneLine = (s, n = 140) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

function aggregate(specs) {
    const out = {};
    for (const [key] of TOKEN_GROUPS) {
        const used = new Map();
        specs.forEach((s) => (s.tokens[key] || []).forEach((t) => used.set(t.name, (used.get(t.name) || 0) + 1)));
        out[key] = [...used.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    }
    return out;
}

/** A markdown design guide generated from the user's whole library. */
export async function buildDesignGuide(userId, { maxIndex = 150, referenceOnly = false } = {}) {
    const filter = { createdBy: userId };
    if (referenceOnly) filter.useAsReference = { $ne: false };
    const components = await Component.find(filter)
        .select("title description category tags version htmlCode spec useAsReference updatedAt")
        .sort("-updatedAt")
        .lean();

    const specs = components.map((c) => c.spec || extractSpec(c.htmlCode));
    const n = components.length;

    if (!n) {
        const empty = "# Design guide\n\nThis library is empty. Save a few components (or use Save to library on gallery components) and this guide will describe your colors, type, spacing and components.\n";
        return { markdown: empty, tokensMarkdown: "", count: 0 };
    }

    const agg = aggregate(specs);
    const tokenLines = TOKEN_GROUPS.map(([key, label]) =>
        agg[key].length ? `- **${label}:** ${agg[key].map(([name, c]) => `${name} (${c}/${n})`).join(", ")}` : null
    ).filter(Boolean);

    const responsive = specs.filter((s) => s.responsive).length;
    const dark = specs.filter((s) => s.darkMode).length;
    const js = specs.filter((s) => s.needs?.javascript).length;
    const css = specs.filter((s) => s.needs?.customCss).length;

    const conventions = [
        `- ${responsive}/${n} components use responsive breakpoints, ${dark}/${n} support dark mode.`,
        `- ${js}/${n} need inline JavaScript, ${css}/${n} include custom CSS. The rest are pure Tailwind HTML.`,
        "- Counts like (4/10) mean the value appears in 4 of 10 components. Prefer the most common values.",
    ];

    const tokensMarkdown = ["## Design tokens", ...tokenLines, "", "## Conventions", ...conventions].join("\n");

    const index = components.slice(0, maxIndex).map((c, i) => {
        const s = specs[i];
        const flags = [s.responsive && "responsive", s.darkMode && "dark", s.needs?.javascript && "js", c.useAsReference === false && "not an AI reference"].filter(Boolean).join(", ");
        const blurb = oneLine(s.summary || c.description);
        return `- **${oneLine(c.title, 80)}** \`${c._id}\` (v${c.version || 1}, ${c.category})${c.tags?.length ? ` [${c.tags.join(", ")}]` : ""} - ${blurb}${flags ? ` _(${flags})_` : ""}`;
    });
    if (components.length > maxIndex) index.push(`- ...and ${components.length - maxIndex} more. Use search_components to find them.`);

    const markdown = [
        "# Design guide",
        `Generated from ${n} component${n === 1 ? "" : "s"} in this library.`,
        "",
        "## How to use this library",
        "1. **Search first.** Before writing UI, call `search_components` with what you need. Reuse a matching component instead of writing a new one.",
        "2. **Read before you fetch.** The index below and each component's spec say what it is for. Fetch full code (`get_component`) only for the one or two you will use.",
        "3. **Match the tokens.** When you must write something new, use the colors, radius, spacing and type from the tokens below so it looks like the rest.",
        "4. **Save good work back.** Use `save_component` with a clear title, a one-sentence description and tags.",
        "",
        tokensMarkdown,
        "",
        "## Component index",
        ...index,
        "",
    ].join("\n");

    return { markdown, tokensMarkdown, count: n };
}
