import Component from "../models/component.model.js";
import Project from "../models/project.model.js";
import { extractProfile } from "./profile.service.js";
import { projectContext } from "./project.service.js";

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

function aggregate(profiles) {
    const out = {};
    for (const [key] of TOKEN_GROUPS) {
        const used = new Map();
        profiles.forEach((s) => (s.tokens[key] || []).forEach((t) => used.set(t.name, (used.get(t.name) || 0) + 1)));
        out[key] = [...used.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    }
    return out;
}

/** A markdown design guide generated from the user's whole library. */
export async function buildDesignGuide(userId, { maxIndex = 150, referenceOnly = false } = {}) {
    const filter = { createdBy: userId };
    if (referenceOnly) filter.useAsReference = { $ne: false };
    const components = await Component.find(filter)
        .select("title description category tags version htmlCode profile useAsReference project kind updatedAt")
        .sort("-updatedAt")
        .lean();

    const projects = await Project.find({ owner: userId }).select("name").lean();
    const projectName = Object.fromEntries(projects.map((p) => [String(p._id), p.name]));
    const profiles = components.map((c) => c.profile || extractProfile(c.htmlCode));
    const n = components.length;

    if (!n) {
        const empty = "# Design guide\n\nThis library is empty. Save a few components (or use Save to library on gallery components) and this guide will describe your colors, type, spacing and components.\n";
        const ctx = await projectContext(userId);
        return { markdown: ctx ? `${ctx}\n\n${empty}` : empty, tokensMarkdown: "", count: 0 };
    }

    const activeContext = await projectContext(userId);
    const agg = aggregate(profiles);
    const tokenLines = TOKEN_GROUPS.map(([key, label]) =>
        agg[key].length ? `- **${label}:** ${agg[key].map(([name, c]) => `${name} (${c}/${n})`).join(", ")}` : null
    ).filter(Boolean);

    const responsive = profiles.filter((s) => s.responsive).length;
    const dark = profiles.filter((s) => s.darkMode).length;
    const js = profiles.filter((s) => s.needs?.javascript).length;
    const css = profiles.filter((s) => s.needs?.customCss).length;

    const conventions = [
        `- ${responsive}/${n} components use responsive breakpoints, ${dark}/${n} support dark mode.`,
        `- ${js}/${n} need inline JavaScript, ${css}/${n} include custom CSS. The rest are pure Tailwind HTML.`,
        "- Counts like (4/10) mean the value appears in 4 of 10 components. Prefer the most common values.",
    ];

    const tokensMarkdown = ["## Design tokens", ...tokenLines, "", "## Conventions", ...conventions].join("\n");

    const index = components.slice(0, maxIndex).map((c, i) => {
        const s = profiles[i];
        const flags = [s.responsive && "responsive", s.darkMode && "dark", s.needs?.javascript && "js", c.useAsReference === false && "not an AI reference"].filter(Boolean).join(", ");
        const blurb = oneLine(s.summary || c.description);
        const inProject = c.project && projectName[String(c.project)] ? ` in project "${projectName[String(c.project)]}"` : "";
        return `- **${oneLine(c.title, 80)}** \`${c._id}\` (v${c.version || 1}, ${c.category}${inProject})${c.tags?.length ? ` [${c.tags.join(", ")}]` : ""} - ${blurb}${flags ? ` _(${flags})_` : ""}`;
    });
    if (components.length > maxIndex) index.push(`- ...and ${components.length - maxIndex} more. Use search_components to find them.`);

    const markdown = [
        "# Design guide",
        ...(activeContext ? [activeContext, ""] : []),
        `Generated from ${n} component${n === 1 ? "" : "s"} in this library.`,
        "",
        "## How to use this library",
        "1. **Search first.** Before writing UI, call `search_components` with what you need. Reuse a matching component instead of writing a new one.",
        "2. **Read before you fetch.** The index below and each component's profile say what it is for. Fetch full code (`get_component`) only for the one or two you will use.",
        "3. **Match the tokens.** When you must write something new, use the colors, radius, spacing and type from the tokens below so it looks like the rest.",
        "4. **Save good work back.** Use `save_component` with a clear title, a one-sentence description and tags. For one finished screen use `save_design`. For several pages use `save_pages` (each page as its own HTML) with a `project` name; never merge pages into one HTML file. Saving an existing page again (same title in its project) makes its next version, not a copy: pass `baseVersion`.",
        "5. **Change saved designs with patches.** To edit a design already in the library, call `get_design_spec` (ids, roles, props by breakpoint and state), then `apply_design_patch` with small ops on those ids and the version you read. Don't re-save the whole HTML for a small change: a patch touches only what it names.",
        "",
        tokensMarkdown,
        "",
        ...(projects.length ? ["## Projects", ...projects.map((p) => `- **${p.name}**: ${components.filter((c) => String(c.project) === String(p._id) && c.kind === "page").length} page(s). Use get_project for its structure.`), ""] : []),
        "## Component index",
        ...index,
        "",
    ].join("\n");

    return { markdown, tokensMarkdown, count: n };
}
