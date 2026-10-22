import Component from "../models/component.model.js";
import { buildDesignGuide } from "./guide.service.js";
import { buildSpec, specToMarkdown } from "./spec.service.js";

export const TOKEN_ENV = "TAILWIND_LIBRARY_TOKEN";
const SERVER_NAME = "tailwind-library";

export const mcpJson = (baseUrl) =>
    JSON.stringify(
        { mcpServers: { [SERVER_NAME]: { type: "http", url: `${baseUrl}/mcp`, headers: { Authorization: `Bearer \${${TOKEN_ENV}}` } } } },
        null,
        2
    ) + "\n";

export const claudeMdSnippet = () => `## UI library

This project uses a shared component library through the \`${SERVER_NAME}\` MCP server.

When you build or change UI:
1. Call \`get_design_guide\` first. It lists the design tokens and every available component.
2. Call \`search_components\` for what you need. Reuse a match instead of writing new markup.
3. Fetch full code with \`get_component\` (use format \`react\`, \`vue\` or \`svelte\` to match this project) only for the components you will use.
4. If you must write something new, follow the tokens (colors, radius, spacing, type) from the guide.
5. Save genuinely reusable new components back with \`save_component\` (clear title, one-sentence description, tags).
6. When you finish a full page or screen, save it with \`save_design\` (title plus the complete HTML). It is split into reusable sections automatically.
`;

export const skillMd = () => `---
name: ui-library
description: Use when building or changing any UI. Looks up the user's component library through the ${SERVER_NAME} MCP server and reuses their components and design tokens before writing new markup.
---

# UI library workflow

Follow these steps whenever the task involves UI (pages, sections, components, forms, layouts).

1. **Read the guide.** Call \`get_design_guide\`. Note the design tokens and the component index.
2. **Search.** Call \`search_components\` with the key words of the request (for example "pricing", "navbar"). Prefer matches whose summary and "use when" fit.
3. **Fetch only what you need.** Call \`get_component\` for the one or two best matches, with \`format\` set to this project's framework (\`html\`, \`react\`, \`vue\`, \`svelte\`).
4. **Reuse, then adapt.** Copy the component and change text, images and links. Keep its classes and structure unless the request needs otherwise.
5. **Fill gaps with the tokens.** For anything new, use the colors, radius, spacing and type from the guide so it matches.
6. **Save good new work.** For a reusable piece, call \`save_component\` (clear title, one-sentence description, tags). For a finished page or screen, call \`save_design\` with the complete HTML: it is split into one component per section.

Never invent component ids. If the library has nothing relevant, say so and build from the tokens.
`;

export const claudeCodeReadme = (baseUrl) => `# Claude Code kit

Connects Claude Code to your component library (${baseUrl}).

## Install (about a minute)

1. Generate an API token on the Connect page and set it in your shell (add it to your profile to keep it):

       export ${TOKEN_ENV}=your_token_here

2. Copy these into your project:
   - \`.mcp.json\`  -> project root (safe to commit: it only references the environment variable)
   - \`.claude/skills/ui-library/SKILL.md\`  -> same path in your project
3. Append \`CLAUDE.md.snippet.md\` to your project's \`CLAUDE.md\`.
4. Start Claude Code in the project and approve the \`${SERVER_NAME}\` server when asked.
5. Try: "Build a landing page. Use my component library."

Do not commit the token itself.
`;

export function buildClaudeCodeKit(baseUrl) {
    return [
        { name: "claude-code-kit/README.md", content: claudeCodeReadme(baseUrl) },
        { name: "claude-code-kit/.mcp.json", content: mcpJson(baseUrl) },
        { name: "claude-code-kit/CLAUDE.md.snippet.md", content: claudeMdSnippet() },
        { name: "claude-code-kit/.claude/skills/ui-library/SKILL.md", content: skillMd() },
    ];
}

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "component";

export async function buildDesignPack(userId, userName = "your") {
    const { markdown, count } = await buildDesignGuide(userId, { maxIndex: 500 });
    const components = await Component.find({ createdBy: userId, useAsReference: { $ne: false } }).sort("category title").lean();

    const used = new Set();
    const index = [];
    const files = [];
    for (const c of components) {
        let slug = slugify(c.title);
        while (used.has(slug)) slug += "-2";
        used.add(slug);
        const spec = c.spec || buildSpec(c.htmlCode);
        files.push({ name: `design-pack/components/${slug}.html`, content: `<!-- ${c.title} | ${c.category} | v${c.version || 1} -->\n${c.htmlCode}\n` });
        files.push({ name: `design-pack/components/${slug}.spec.md`, content: specToMarkdown({ ...c, spec }) + "\n" });
        index.push({ file: `components/${slug}.html`, title: c.title, category: c.category, tags: c.tags || [], summary: spec.summary || c.description });
    }

    const brief = `# Brief: design with ${userName === "your" ? "my" : `${userName}'s`} component library

Attach this whole folder (or the files inside it) to Claude Design.

## What is in here
- \`design-guide.md\`: my design tokens (Tailwind classes), conventions and a component index. **Read this first.**
- \`components/\`: ${index.length} reusable components as HTML (Tailwind), each with a \`.spec.md\` describing what it is for and how it is built.
- \`index.json\`: the same index in machine-readable form.

## Rules
1. **Reuse before inventing.** If a component in \`components/\` fits, use it and change only content (text, images, links).
2. **Stay on the tokens.** Use only the colors, radius, spacing and type listed in \`design-guide.md\`. Do not introduce new ones without saying so.
3. **Keep the structure.** Preserve a component's classes and markup unless the request requires changing them.
4. **Say what is new.** List any component you had to create that is not in the library, so it can be saved back. If the library connector is available, save each finished screen yourself with \`save_design\`.
5. If something needed is missing from the library, put it under **Open questions** and continue with a stated assumption.

## What I want
(Describe the screen or page you want designed here.)
`;

    files.unshift(
        { name: "design-pack/BRIEF.md", content: brief },
        { name: "design-pack/design-guide.md", content: markdown },
        { name: "design-pack/index.json", content: JSON.stringify(index, null, 2) + "\n" }
    );
    return { files, count: index.length, libraryCount: count };
}
