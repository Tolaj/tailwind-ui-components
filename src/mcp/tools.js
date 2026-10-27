// Windcraft's MCP tools: what each one is called and takes (TOOLS), what a client is told on connecting (INSTRUCTIONS), and what each one does (callTool).
// The protocol around them is @windcraft/mcp; routes/mcp.routes.js puts the two together.
import mongoose from "mongoose";
import Component from "../models/component.model.js";
import { exportComponent, FORMATS } from "@windcraft/core/exporters.js";
import { searchLibrary } from "../services/library.service.js";
import { normalizeTags } from "../controllers/component.controller.js";
import { buildProfile, enrichProfileWithAI, profileToMarkdown, extractProfile } from "../services/profile.service.js";
import { buildDesignGuide } from "../services/guide.service.js";
import { importDesign } from "../services/import.service.js";
import { withSharedHead } from "@windcraft/core/pages.js";
import { specOf, patchDesign, tailwindWarning } from "../services/design-spec.service.js";
import { resolveProject, orderPages, listProjects, projectTree, getActiveProject, setActiveProject, projectContext } from "../services/project.service.js";
import Project from "../models/project.model.js";
import { text, fail } from "@windcraft/mcp";

export const TOOLS = [
    {
        name: "get_design_guide",
        description: "START HERE. Returns a markdown design guide for the user's library: how to use it, their design tokens (colors, type, radius, spacing), conventions, and a compact index of every component with a one-line purpose. Read this before writing UI.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "search_components",
        description: "Search the user's component library by keyword and/or tag. Returns a compact card per match (id, title, summary, use-when, tags, main colors, flags). Fetch full code with get_component only for the ones you will use.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Keywords, e.g. 'pricing table' or 'navbar'" },
                tag: { type: "string", description: "Only components with this tag" },
                project: { type: "string", description: "Only components in this project (name or id)" },
                limit: { type: "number", description: "Max results (default 10)" },
            },
        },
    },
    {
        name: "get_component",
        description: "Get a component's source code by id, optionally converted to react, vue or svelte, after a short card with its id, version (the baseVersion to pass when saving it again), tokens and structure. Use it to build with a design in an app, or before redesigning a saved page.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" },
                format: { type: "string", enum: FORMATS, description: "Default html" },
            },
            required: ["id"],
        },
    },
    {
        name: "get_design_spec",
        description: "Get a saved design as a design spec: JSON an AI can target reliably. Every element has an id (n1, n2...), a tag, a role (title, button, card...), its text, and its Tailwind classes read as props by breakpoint and state ({ base: { p: \"6\", bgColor: \"white\" }, md: { p: \"8\" }, hover: {...} }); classes no prop covers are in raw, inline CSS in css. Also the design's tokens and its <style>/<script>. Icons (svg) show only their size (svgChars), not their drawing: to change an icon, insert a new one and remove the old. Use this before changing a design with apply_design_patch. Ids belong to this version only.",
        inputSchema: { type: "object", properties: { id: { type: "string", description: "The design's id" } }, required: ["id"] },
    },
    {
        name: "apply_design_patch",
        description: "Change a saved design with small operations on the ids from get_design_spec, instead of rewriting its HTML. Only what you name changes; the rest of the code stays exactly as it was. Pass baseVersion: the \"version\" field of the spec you read. If the design changed since, nothing is applied and you must read it again. All ops are checked first and applied together, or none are. Saves a new version and returns the new spec (new ids). Ops: {op:\"set\", id, prop, value, at?} sets a prop (prop names as in the spec, e.g. bgColor, p, fontSize, flexDir; value as in the spec, e.g. \"blue-600\", \"8\"; at = a breakpoint or state like \"md\", \"hover\", \"md:hover\"); {op:\"unset\", id, prop, at?}; {op:\"classes\", id, add?:[], remove?:[]} for raw classes; {op:\"style\", id, value} inline CSS (null removes); {op:\"text\", id, text} for an element holding only text; {op:\"attr\", id, name, value} (null removes); {op:\"tag\", id, tag} within its family (div/section/header..., p/h1-h6, span/strong..., a/button, ul/ol, td/th); {op:\"insert\", id?, position?, html} position inside (default), start, before or after (no id: added to the design's end, or start); {op:\"remove\", id}; {op:\"move\", id, to, position?}; {op:\"rule\", selector, prop, value, media?} edits a CSS rule in the design's <style> (shown in the spec's assets.css), for designs styled by their own CSS classes rather than Tailwind: e.g. {op:\"rule\", selector:\".btn-primary\", prop:\"background\", value:\"#D4A017\"}; value null removes the property; media is the @media line for a rule inside one; a rule that doesn't exist yet is added.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "The design's id" },
                baseVersion: { type: "number", description: "Required: the \"version\" field of the get_design_spec result you made the patch from" },
                ops: { type: "array", items: { type: "object" }, description: "The operations, applied in order" },
                note: { type: "string", description: "What changed, for the version history" },
            },
            required: ["id", "baseVersion", "ops"],
        },
    },
    {
        name: "save_component",
        description: "Save a new component (HTML with Tailwind classes, optional <style>/<script>) to the user's library so it can be reused later.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string" },
                description: { type: "string" },
                htmlCode: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                category: { type: "string", description: "Gallery category slug, default apps-general" },
                project: { type: "string", description: "Project name or id to file this under (created if new). Optional: defaults to the user's active project." },
            },
            required: ["title", "description", "htmlCode"],
        },
    },
    {
        name: "save_design",
        description: "Save ONE finished screen (one page, one route, one tab) as ONE component. If the design has several pages or screens, do NOT merge them into one HTML document: call save_pages once with every page, or call save_design once per page with the same project. Only set split to true for a long marketing page made of stacked sections when the user wants each section saved separately. Never split dashboards or app screens. Saving a page that already exists (same title in the same project, or its id) saves its next version instead of a copy: pass baseVersion, the version you started from (get_context and get_component show it). If it changed since (the user edited it in the editor), the save is refused so their edits aren't lost: read it again and work from that. For a small change to a saved page, apply_design_patch is better than saving the whole page.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Name of the design or screen, e.g. 'Landing page'" },
                html: { type: "string", description: "Complete HTML of the design" },
                description: { type: "string", description: "One sentence about what it is" },
                tags: { type: "array", items: { type: "string" } },
                split: { type: "boolean", description: "Also save each stacked section as its own component. Default false." },
                project: { type: "string", description: "Project name or id to file this under (created if new). Optional: defaults to the user's active project." },
                id: { type: "string", description: "The saved page to replace with this version (optional: a page with the same title in the project is found anyway)" },
                group: { type: "string", description: "The group this page belongs to in its project, e.g. \"Public site\" (optional)" },
                baseVersion: { type: "number", description: "When saving an existing page again: the version you started from" },
                force: { type: "boolean", description: "Replace the page even if it changed since baseVersion (only when the user says so)" },
                note: { type: "string", description: "What changed, for the version history" },
                width: { type: "number", description: "The width in pixels this screen was designed at (for example 1440 or 1920): its frame on the board and in the editor opens at this width instead of the default 1280. Optional." },
            },
            required: ["title", "html"],
        },
    },
    {
        name: "save_pages",
        description: "Save SEVERAL pages or screens in one call, each as its own separate page component inside one project. Use this whenever the design has more than one page (for example Overview, Customers and Transactions). Pass each page as its own complete HTML document. Never combine pages into one HTML file. A page that already exists in the project (same title, or its id) is saved as its next version, not a copy: give its baseVersion (from get_context), and a page changed since then is refused rather than overwritten.\n\nSHARED HEAD: what every page has in common (fonts, the Tailwind <script> and its tailwind.config, a shared <style>) goes ONCE in `shared`, not in each page: the server adds it to the top of every page's <head> (a page that already has it is left alone), so each page is saved complete and each pages[].html can be just its own markup. The project remembers it: later calls that leave `shared` out reuse it (so a page saved again keeps its fonts and Tailwind setup), a new `shared` replaces it, and an empty string removes it. ORDER: the pages appear in the project in the order you list them, and listing them again in another order reorders them (new pages go after the existing ones). GROUPS: give pages[].group (for example \"Public site\", \"Customer area\", \"Admin\") when the design has sections of an app; the board lays each group out as its own row and the page lists show the group's name.",
        inputSchema: {
            type: "object",
            properties: {
                project: { type: "string", description: "Project name or id (created if new). Optional: defaults to the user's active project." },
                shared: { type: "string", description: "HTML every page shares, sent once: <link> fonts, the Tailwind <script> and tailwind.config, a shared <style>. Added to the top of each page's <head>. The project remembers it: leave it out later to reuse it, send \"\" to remove it." },
                pages: {
                    type: "array",
                    description: "One entry per page, in the order they should appear",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string", description: "Page name, e.g. 'Customers'" },
                            html: { type: "string", description: "Complete HTML of this one page" },
                            description: { type: "string", description: "One sentence about the page" },
                            group: { type: "string", description: "The group this page belongs to, e.g. \"Public site\" (optional; up to 60 characters)" },
                            id: { type: "string", description: "The saved page this replaces (optional)" },
                            baseVersion: { type: "number", description: "For a page that already exists: the version you started from" },
                            force: { type: "boolean", description: "Replace it even if it changed since baseVersion (only when the user says so)" },
                        },
                        required: ["title", "html"],
                    },
                },
                tags: { type: "array", items: { type: "string" } },
            },
            required: ["pages"],
        },
    },
    {
        name: "get_context",
        description: "START HERE in a new chat. Returns the user's ACTIVE project: its description, the brief and notes you must follow, and the pages already designed. Read it before designing so new pages match the existing ones.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "set_active_project",
        description: "Make a project the one the user is working in (created if new). Later saves go there by default. Call it when the user says which project they are working on.",
        inputSchema: { type: "object", properties: { project: { type: "string", description: "Project name or id" } }, required: ["project"] },
    },
    {
        name: "update_project",
        description: "Write down the project's description and brief (brand, audience, tone, colors, rules, navigation) so every later chat follows it. Use it when the user explains what the project is or how it should look.",
        inputSchema: { type: "object", properties: { project: { type: "string", description: "Project name or id. Defaults to the active project." }, description: { type: "string" }, brief: { type: "string", description: "Longer notes for designers and AI, up to 4000 characters" } } },
    },
    {
        name: "list_projects",
        description: "List the user's projects (groups of pages and sections, like a Figma file) with page and section counts.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "create_project",
        description: "Create a project to group related pages and sections, e.g. 'Acme website'. save_design also creates a project automatically when you pass a new project name.",
        inputSchema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, brief: { type: "string", description: "Notes the user wants every design to follow" } }, required: ["name"] },
    },
    {
        name: "get_project",
        description: "Get a project's structure: its pages in order with their groups, each page's sections, ids you can pass to get_component, and the shared head save_pages adds to every page (if it has one).",
        inputSchema: { type: "object", properties: { project: { type: "string", description: "Project name or id" } }, required: ["project"] },
    },
    {
        name: "list_tags",
        description: "List every tag used in the user's library with counts.",
        inputSchema: { type: "object", properties: {} },
    },
];

/** What a client reads on connecting, before any tool: what this server is for and which tools do what. */
export const INSTRUCTIONS = [
    "Windcraft: the user's private library of designs (HTML with Tailwind), grouped into projects of pages.",
    "",
    "Find: get_context (the active project, its brief, its pages with id and version), then get_design_guide (design tokens and an index of every component), then search_components before writing new UI so it matches what exists.",
    "Use in an app: get_component with format html, react, vue or svelte to match the codebase. Fetch only what you will use.",
    "Change a saved design: for a small change, get_design_spec (each element with an id, a role and its classes as props per breakpoint and state), then apply_design_patch with small ops on those ids and the version you read. Only what you name changes. For a redesign, save the whole page again (below).",
    "Style with Tailwind: designs saved here should use Tailwind utility classes (the tokens in get_design_guide), not their own CSS classes and <style> rules, so they stay editable in the Windcraft editor and patchable by props. Use a <style> only for what Tailwind can't express.",
    "Save: a new page with save_design (one screen) or save_pages (several, each its own HTML, never merged; what they share, such as fonts and the Tailwind script and config, goes once in `shared`; list them in the order they should appear and give each a `group` when the design has sections like Public site and Customer area); a reusable piece with save_component. Saving an existing page again (same title in its project, or its id) makes its next version, not a copy: pass baseVersion (from get_context or get_component). If the user edited it since, the save is refused so their edits are not lost: read it again and work from that.",
].join("\n");

/** The project to file things under: the one named, else the user's active project. Naming a new project when none is active makes it active. */
async function projectFor(userId, ref) {
    if (ref && String(ref).trim()) {
        const p = await resolveProject(userId, ref, { create: true });
        if (p && !(await getActiveProject(userId))) await setActiveProject(userId, p._id);
        return p;
    }
    return getActiveProject(userId);
}

export async function callTool(userId, name, args = {}) {
    switch (name) {
        case "search_components": {
            let projectId = null;
            if (args.project) {
                const p = await resolveProject(userId, args.project);
                if (!p) return fail(`No project named "${args.project}". Use list_projects to see them.`);
                projectId = p._id;
            }
            const results = await searchLibrary(userId, { query: args.query, tag: args.tag, project: projectId, limit: Math.min(Number(args.limit) || 10, 25) });
            return text(results.map((c) => {
                const profile = c.profile || extractProfile(c.htmlCode);
                return {
                    id: String(c._id),
                    title: c.title,
                    summary: profile.summary || c.description,
                    useWhen: profile.useWhen || undefined,
                    tags: c.tags,
                    category: c.category,
                    version: c.version,
                    mainColors: (profile.tokens?.colors || []).slice(0, 3).map((t) => t.name),
                    responsive: profile.responsive,
                    darkMode: profile.darkMode,
                    needsJs: Boolean(profile.needs?.javascript),
                };
            }));
        }
        case "get_component": {
            const format = String(args.format || "html").toLowerCase();
            if (!FORMATS.includes(format)) return fail(`format must be one of ${FORMATS.join(", ")}`);
            if (!/^[a-f0-9]{24}$/i.test(String(args.id))) return fail("Invalid component id");
            const c = await Component.findOne({ _id: args.id, createdBy: userId }).lean();
            if (!c) return fail("Component not found in your library");
            return text(`${profileToMarkdown(c)}\n\n---\n\n${exportComponent(c.htmlCode, format, c.title)}`);
        }
        case "get_design_spec": {
            if (!/^[a-f0-9]{24}$/i.test(String(args.id))) return fail("Invalid design id");
            const c = await Component.findOne({ _id: args.id, createdBy: userId }).lean();
            if (!c) return fail("Design not found in your library");
            return { content: [{ type: "text", text: JSON.stringify(specOf(c, { svg: false })) }] }; // compact: a spec is read by an AI
        }
        case "apply_design_patch": {
            try {
                return { content: [{ type: "text", text: JSON.stringify(await patchDesign(userId, args)) }] };
            } catch (e) {
                return fail(e.message);
            }
        }
        case "save_component": {
            if (!args.title || !args.description || !args.htmlCode) return fail("title, description and htmlCode are required");
            const proj = await projectFor(userId, args.project);
            const c = await Component.create({
                project: proj ? proj._id : null,
                kind: proj ? "page" : "component",
                title: args.title,
                description: args.description,
                htmlCode: args.htmlCode,
                category: args.category || "apps-general",
                tags: normalizeTags(args.tags),
                profile: buildProfile(args.htmlCode),
                createdBy: userId,
                isPublished: false,
            });
            enrichProfileWithAI(c._id, userId);
            const warning = tailwindWarning(args.htmlCode);
            return text({ id: String(c._id), message: "Saved to your library (private)", ...(warning ? { warning } : {}) });
        }
        case "save_design": {
            if (!args.html || !args.title) return fail("title and html are required");
            try {
                const proj = await projectFor(userId, args.project);
                const result = await importDesign(userId, {
                    title: args.title, html: args.html, description: args.description,
                    tags: args.tags, split: args.split === true, project: proj ? proj._id : null,
                    id: args.id, baseVersion: args.baseVersion, force: args.force === true, note: args.note, group: args.group,
                    frameW: Number.isFinite(args.width) ? args.width : undefined,
                });
                if (proj && result.page.created) await orderPages(userId, proj._id, [{ id: result.page.id, created: true }]); // a new page goes after the others
                const what = result.page.created ? "Saved" : result.page.updated ? `Saved v${result.page.version} of` : "No change to";
                return text({ ...result, project: proj ? { id: String(proj._id), name: proj.name } : null, message: `${what} "${result.page.title}"${result.sections.length ? ` and ${result.sections.length} section component(s)` : ""}${result.removedSections ? ` (${result.removedSections} section(s) no longer on the page removed)` : ""} in your library (private)${proj ? ` in project "${proj.name}"` : ""}.` });
            } catch (e) {
                return fail(e.message);
            }
        }
        case "save_pages": {
            const pagesIn = Array.isArray(args.pages) ? args.pages : [];
            if (!pagesIn.length) return fail("at least one page is required");
            if (pagesIn.length > 30) return fail("Save at most 30 pages per call");
            const proj = await projectFor(userId, args.project);
            if (!proj) return fail("No project given and no active project. Pass project (a name) or call set_active_project first.");
            // `shared` sent: used, and remembered by the project; left out: the project's last one is used (a page saved again
            // without it would lose its fonts and Tailwind setup); "" clears it
            if (typeof args.shared === "string" && args.shared.trim() !== (proj.sharedHead || "").trim()) {
                if (args.shared.length > 20000) return fail("shared is too large (limit 20,000 characters): fonts, the Tailwind script and config and a stylesheet should fit");
                proj.sharedHead = args.shared.trim();
                await proj.save();
            }
            const shared = proj.sharedHead || "";
            const saved = [];
            const failed = [];
            for (const pg of pagesIn) {
                try {
                    const html = typeof pg.html === "string" ? withSharedHead(pg.html, shared) : pg.html;
                    const r = await importDesign(userId, { title: pg.title, html, description: pg.description, tags: args.tags, split: false, project: proj._id, id: pg.id, baseVersion: pg.baseVersion, force: pg.force === true, group: pg.group });
                    saved.push(r.page);
                } catch (e) {
                    failed.push({ title: pg && pg.title, error: e.message });
                }
            }
            // the pages that went in are put in the order they were listed (the ones that failed are not in it); a new page goes last
            const order = saved.length > 1 || saved.some((p) => p.created) ? await orderPages(userId, proj._id, saved) : null;
            return text({
                project: { id: String(proj._id), name: proj.name },
                saved: saved.map((p) => ({ ...p, ...(order ? { position: order.indexOf(p.id) + 1 } : {}) })), failed,
                message: `Saved ${saved.length} page(s) as separate components in project "${proj.name}"${shared.trim() ? `, each with the project's shared head${typeof args.shared === "string" ? "" : " (the one saved earlier)"}` : ""}${order && saved.length > 1 ? ", in the order given" : ""}${failed.length ? `; ${failed.length} failed` : ""}.`,
            });
        }
        case "get_context": {
            const ctx = await projectContext(userId);
            return text(ctx || "No active project yet. Ask which project the user is working on, then call set_active_project (or create_project).");
        }
        case "set_active_project": {
            const p = await resolveProject(userId, args.project, { create: true });
            if (!p) return fail("project is required");
            await setActiveProject(userId, p._id);
            return text(await projectContext(userId));
        }
        case "update_project": {
            const p = args.project ? await resolveProject(userId, args.project) : await getActiveProject(userId);
            if (!p) return fail("No such project and no active project. Pass project or call set_active_project first.");
            if (args.description !== undefined) p.description = String(args.description).slice(0, 300);
            if (args.brief !== undefined) p.brief = String(args.brief).slice(0, 4000);
            await p.save();
            return text({ id: String(p._id), name: p.name, message: "Project updated" });
        }
        case "list_projects":
            return text(await listProjects(userId));
        case "create_project": {
            const name = String(args.name || "").trim();
            if (!name) return fail("name is required");
            const existing = await resolveProject(userId, name);
            if (existing) return text({ id: String(existing._id), name: existing.name, message: "Project already exists" });
            const p = await Project.create({ name: name.slice(0, 80), description: String(args.description || "").slice(0, 300), brief: String(args.brief || "").slice(0, 4000), owner: userId });
            if (!(await getActiveProject(userId))) await setActiveProject(userId, p._id);
            return text({ id: String(p._id), name: p.name, message: "Project created" });
        }
        case "get_project": {
            const p = await resolveProject(userId, args.project);
            if (!p) return fail(`No project named "${args.project}". Use list_projects to see them.`);
            return text({ id: String(p._id), name: p.name, description: p.description, brief: p.brief || "", ...(p.sharedHead ? { sharedHead: p.sharedHead } : {}), pages: await projectTree(userId, p._id) });
        }
        case "get_design_guide": {
            const { markdown } = await buildDesignGuide(userId);
            return text(markdown);
        }
        case "list_tags": {
            const rows = await Component.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId) } },
                { $unwind: "$tags" },
                { $group: { _id: "$tags", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]);
            return text(rows.map((r) => ({ tag: r._id, count: r.count })));
        }
        default:
            return fail(`Unknown tool: ${name}`);
    }
}

export const TITLES = {
    get_design_guide: "Read the design guide",
    search_components: "Search components",
    get_component: "Get a component",
    get_design_spec: "Read a design as a spec",
    apply_design_patch: "Change a design",
    save_component: "Save a component",
    save_design: "Save a finished design",
    save_pages: "Save several pages",
    list_tags: "List tags",
    get_context: "Read the active project",
    set_active_project: "Set the active project",
    update_project: "Update the project brief",
    list_projects: "List projects",
    create_project: "Create a project",
    get_project: "Get a project",
};
export const READ_ONLY = new Set(["get_design_guide", "search_components", "get_component", "get_design_spec", "list_tags", "list_projects", "get_project", "get_context"]);

// Saving a page again replaces its code (kept in its history) and deletes sections no longer on it.
export const DESTRUCTIVE = new Set(["save_design", "save_pages", "apply_design_patch"]);
