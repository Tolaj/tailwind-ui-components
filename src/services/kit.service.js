import Component from "../models/component.model.js";
import { buildDesignGuide } from "./guide.service.js";
import { buildProfile, profileToMarkdown } from "./profile.service.js";

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
1. Call \`get_context\` first: it returns the active project, its brief and the pages so far. Then call \`get_design_guide\`. It lists the design tokens and every available component.
2. Call \`search_components\` for what you need. Reuse a match instead of writing new markup.
3. Fetch full code with \`get_component\` (use format \`react\`, \`vue\` or \`svelte\` to match this project) only for the components you will use.
4. If you must write something new, follow the tokens (colors, radius, spacing, type) from the guide, as Tailwind utility classes (not your own CSS classes and \`<style>\` rules).
5. To change a design already in the library: for a small change, \`get_design_spec\` (elements with ids, roles and props) then \`apply_design_patch\` with small ops and the version you read; only what you name changes. For a redesign, save the whole page again (step 7).
6. Save genuinely reusable new components back with \`save_component\` (clear title, one-sentence description, tags).
7. Save each page as its OWN component. For several pages call \`save_pages\` with a project name and one HTML document per page; never merge pages into one file. Put what the pages share (fonts, the Tailwind script and config, a shared stylesheet) once in \`shared\` instead of in every page: the project remembers it and adds it to each page's head. List the pages in the order they should appear and give each a \`group\` (for example "Public site", "Customer area") when the design has sections like that. For a single screen use \`save_design\` (title plus the complete HTML). It saves one component per screen; only pass split: true for a long marketing page when the user wants its sections saved separately. Group the screens of one site or app by passing the same \`project\` name each time (for example \`project: "Acme website"\`). Use \`get_project\` to see what a project already contains. Saving a page that already exists (same title in its project, or its id) makes its next version, not a copy: pass \`baseVersion\` (from \`get_context\` or \`get_component\`). If it was edited since, the save is refused: read it again and work from that.
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
6. **Change saved designs in place.** For a small change to a design in the library, call \`get_design_spec\`, then \`apply_design_patch\` with small ops on its ids and the version you read. Don't re-save the whole HTML for a small change.
7. **Save good new work.** For a reusable piece, call \`save_component\` (clear title, one-sentence description, tags). For several pages, call \`save_pages\` with a project name and one HTML document per page (never merge pages into one file); put what they share (fonts, the Tailwind script and config) once in \`shared\`, list the pages in the order they should appear, and give each a \`group\` such as "Public site" or "Customer area" when the design has sections. For a single screen call \`save_design\` with the complete HTML. It saves one component per screen; pass split: true only for a long marketing page whose sections the user wants as separate components. Pass \`project\` (a name, created if new) so related screens live together; \`get_project\` shows what a project contains. To save a page that already exists again, keep its title (or pass its \`id\`) and pass \`baseVersion\`: it becomes the next version, and a page edited since is refused rather than overwritten.

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
        const profile = c.profile || buildProfile(c.htmlCode);
        files.push({ name: `design-pack/components/${slug}.html`, content: `<!-- ${c.title} | ${c.category} | id ${c._id} | v${c.version || 1} -->\n${c.htmlCode}\n` });
        files.push({ name: `design-pack/components/${slug}.profile.md`, content: profileToMarkdown({ ...c, profile }) + "\n" });
        index.push({ id: String(c._id), version: c.version || 1, ...(c.group ? { group: c.group } : {}), file: `components/${slug}.html`, title: c.title, category: c.category, tags: c.tags || [], summary: profile.summary || c.description });
    }

    const brief = `# Brief: design with ${userName === "your" ? "my" : `${userName}'s`} component library

Attach this whole folder (or the files inside it) to Claude Design.

## What is in here
- \`design-guide.md\`: my design tokens (Tailwind classes), conventions and a component index. **Read this first.**
- \`components/\`: ${index.length} reusable components as HTML (Tailwind), each with a \`.profile.md\` describing what it is for and how it is built.
- \`index.json\`: the same index in machine-readable form.

## Rules
1. **Reuse before inventing.** If a component in \`components/\` fits, use it and change only content (text, images, links).
2. **Stay on the tokens, in Tailwind.** Use only the colors, radius, spacing and type listed in \`design-guide.md\`, written as Tailwind utility classes on the elements. Do not restyle with your own CSS classes and a \`<style>\` sheet (custom fonts and CSS variables included): the library and its editor work with Tailwind classes. Do not introduce new tokens without saying so.
3. **Keep the structure.** Preserve a component's classes and markup unless the request requires changing them.
4. **Say what is new.** List any component you had to create that is not in the library, so it can be saved back. If the library connector is available, save each finished page yourself as its own component: \`save_pages\` for several pages, \`save_design\` for one.
5. **Changing an existing page: save it back as the same page.** Keep its title and pass its \`id\` and \`baseVersion\` (both in \`index.json\` and the first line of its file) so it becomes the page's next version, not a copy. If it was edited since this pack was made, the save is refused: ask for a fresh pack or read it with \`get_component\`.
6. If something needed is missing from the library, put it under **Open questions** and continue with a stated assumption.

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
