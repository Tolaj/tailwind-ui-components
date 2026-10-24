import { Router } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Component from "../models/component.model.js";
import { exportComponent, FORMATS } from "../public/js/shared/exporters.js";
import { searchLibrary } from "../services/library.service.js";
import { normalizeTags } from "../controllers/component.controller.js";
import { buildProfile, enrichProfileWithAI, profileToMarkdown, extractProfile } from "../services/profile.service.js";
import { buildDesignGuide } from "../services/guide.service.js";
import { importDesign } from "../services/import.service.js";
import { specOf, patchDesign } from "../services/design-spec.service.js";
import { resolveProject, listProjects, projectTree, getActiveProject, setActiveProject, projectContext } from "../services/project.service.js";
import Project from "../models/project.model.js";
import { userIdForAccessToken } from "../services/oauth.service.js";
import { publicBase } from "../utils/publicUrl.js";

const router = Router();

const TOOLS = [
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
        description: "Get a component's source code by id, optionally converted to react, vue or svelte.",
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
        description: "Change a saved design with small operations on the ids from get_design_spec, instead of rewriting its HTML. Only what you name changes; the rest of the code stays exactly as it was. Pass the version you read (baseVersion): if the design changed since, nothing is applied and you must read it again. All ops are checked first and applied together, or none are. Saves a new version and returns the new spec (new ids). Ops: {op:\"set\", id, prop, value, at?} sets a prop (prop names as in the spec, e.g. bgColor, p, fontSize, flexDir; value as in the spec, e.g. \"blue-600\", \"8\"; at = a breakpoint or state like \"md\", \"hover\", \"md:hover\"); {op:\"unset\", id, prop, at?}; {op:\"classes\", id, add?:[], remove?:[]} for raw classes; {op:\"style\", id, value} inline CSS (null removes); {op:\"text\", id, text} for an element holding only text; {op:\"attr\", id, name, value} (null removes); {op:\"tag\", id, tag} within its family (div/section/header..., p/h1-h6, span/strong..., a/button, ul/ol, td/th); {op:\"insert\", id?, position?, html} position inside (default), start, before or after (no id: added to the design's end, or start); {op:\"remove\", id}; {op:\"move\", id, to, position?}.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "The design's id" },
                baseVersion: { type: "number", description: "The version from get_design_spec" },
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
                baseVersion: { type: "number", description: "When saving an existing page again: the version you started from" },
                force: { type: "boolean", description: "Replace the page even if it changed since baseVersion (only when the user says so)" },
                note: { type: "string", description: "What changed, for the version history" },
            },
            required: ["title", "html"],
        },
    },
    {
        name: "save_pages",
        description: "Save SEVERAL pages or screens in one call, each as its own separate page component inside one project. Use this whenever the design has more than one page (for example Overview, Customers and Transactions). Pass each page as its own complete HTML document. Never combine pages into one HTML file. A page that already exists in the project (same title, or its id) is saved as its next version, not a copy: give its baseVersion (from get_context), and a page changed since then is refused rather than overwritten.",
        inputSchema: {
            type: "object",
            properties: {
                project: { type: "string", description: "Project name or id (created if new). Optional: defaults to the user's active project." },
                pages: {
                    type: "array",
                    description: "One entry per page, in order",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string", description: "Page name, e.g. 'Customers'" },
                            html: { type: "string", description: "Complete HTML of this one page" },
                            description: { type: "string", description: "One sentence about the page" },
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
        description: "Get a project's structure: its pages, and each page's sections, with ids you can pass to get_component.",
        inputSchema: { type: "object", properties: { project: { type: "string", description: "Project name or id" } }, required: ["project"] },
    },
    {
        name: "list_tags",
        description: "List every tag used in the user's library with counts.",
        inputSchema: { type: "object", properties: {} },
    },
];

const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (message) => ({ isError: true, content: [{ type: "text", text: message }] });

/** The project to file things under: the one named, else the user's active project. Naming a new project when none is active makes it active. */
async function projectFor(userId, ref) {
    if (ref && String(ref).trim()) {
        const p = await resolveProject(userId, ref, { create: true });
        if (p && !(await getActiveProject(userId))) await setActiveProject(userId, p._id);
        return p;
    }
    return getActiveProject(userId);
}

async function callTool(userId, name, args = {}) {
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
            return text({ id: String(c._id), message: "Saved to your library (private)" });
        }
        case "save_design": {
            if (!args.html || !args.title) return fail("title and html are required");
            try {
                const proj = await projectFor(userId, args.project);
                const result = await importDesign(userId, {
                    title: args.title, html: args.html, description: args.description,
                    tags: args.tags, split: args.split === true, project: proj ? proj._id : null,
                    id: args.id, baseVersion: args.baseVersion, force: args.force === true, note: args.note,
                });
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
            const saved = [];
            const failed = [];
            for (const pg of pagesIn) {
                try {
                    const r = await importDesign(userId, { title: pg.title, html: pg.html, description: pg.description, tags: args.tags, split: false, project: proj._id, id: pg.id, baseVersion: pg.baseVersion, force: pg.force === true });
                    saved.push(r.page);
                } catch (e) {
                    failed.push({ title: pg && pg.title, error: e.message });
                }
            }
            return text({
                project: { id: String(proj._id), name: proj.name },
                saved, failed,
                message: `Saved ${saved.length} page(s) as separate components in project "${proj.name}"${failed.length ? `; ${failed.length} failed` : ""}.`,
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
            return text({ id: String(p._id), name: p.name, description: p.description, brief: p.brief || "", pages: await projectTree(userId, p._id) });
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

/** Accepts either a personal API token (twl_...) or an OAuth access token. Returns { _id } or null. */
const authenticate = async (req) => {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return null;
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const viaApiToken = await User.findOne({ apiTokenHash: hash }).select("_id").lean();
    if (viaApiToken) return viaApiToken;
    const oauthUserId = await userIdForAccessToken(token);
    return oauthUserId ? { _id: oauthUserId } : null;
};

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const TITLES = {
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
const READ_ONLY = new Set(["get_design_guide", "search_components", "get_component", "get_design_spec", "list_tags", "list_projects", "get_project", "get_context"]);

// Hints let clients (Claude shows these in its permission UI) treat read tools as safe.
const ANNOTATED_TOOLS = TOOLS.map((t) => ({
    ...t,
    title: TITLES[t.name] || t.name,
    annotations: {
        title: TITLES[t.name] || t.name,
        readOnlyHint: READ_ONLY.has(t.name),
        destructiveHint: false,
        idempotentHint: READ_ONLY.has(t.name),
        openWorldHint: false,
    },
}));

// Browser-based MCP clients call this from another origin. Auth is a Bearer token, never cookies.
router.use((req, res, next) => {
    res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
        "Access-Control-Max-Age": "600",
    });
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
});

// This server is stateless: no server-initiated stream and no sessions.
router.all("/", (req, res, next) => {
    if (req.method === "POST") return next();
    res.status(405).set("Allow", "POST, OPTIONS").json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Method not allowed. Use POST." } });
});

const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Handles one JSON-RPC message. Returns the response object, or null for notifications. */
async function handleRpc(msg, userId) {
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
        return rpcError(msg && msg.id, -32600, "Invalid Request");
    }
    const { id, method, params } = msg;
    const isNotification = id === undefined || id === null;
    const ok = (result) => ({ jsonrpc: "2.0", id, result });

    try {
        switch (method) {
            case "initialize": {
                const asked = params && params.protocolVersion;
                const context = await projectContext(userId);
                return ok({
                    protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
                    capabilities: { tools: { listChanged: false } },
                    serverInfo: { name: "tailwind-ui-library", title: "Windcraft component library", version: "1.0.0" },
                    instructions: "The user's private component library. Call get_design_guide first for their design tokens and a component index, then search_components before writing new UI so output matches their existing components. Fetch full code with get_component only for what you will use, save good new components back with save_component, and when you finish designing, save each page as its own component: use save_pages with a project when there are several pages, or save_design for a single screen. Never merge multiple pages into one HTML document." + (context ? `\n\n${context}` : "\n\nNo active project yet: when the user says what they are working on, call set_active_project or create_project."),
                });
            }
            case "ping":
                return isNotification ? null : ok({});
            case "tools/list":
                return ok({ tools: ANNOTATED_TOOLS });
            case "tools/call":
                if (!params || typeof params.name !== "string") return rpcError(id, -32602, "tools/call needs a tool name");
                return ok(await callTool(userId, params.name, params.arguments));
            case "resources/list":
                return ok({ resources: [] });
            case "prompts/list":
                return ok({ prompts: [] });
            default:
                if (isNotification || method.startsWith("notifications/")) return null;
                return rpcError(id, -32601, `Method not found: ${method}`);
        }
    } catch (e) {
        console.error("MCP error:", e);
        return rpcError(id, -32603, "Internal error");
    }
}

router.post("/", async (req, res) => {
    const user = await authenticate(req);
    if (!user) {
        return res
            .status(401)
            .set("WWW-Authenticate", `Bearer resource_metadata="${publicBase(req)}/.well-known/oauth-protected-resource"`)
            .json(rpcError(null, -32001, "Authorization required"));
    }

    const body = req.body;
    if (body === undefined || body === null || typeof body !== "object") {
        return res.status(400).json(rpcError(null, -32700, "Parse error: send a JSON-RPC 2.0 message"));
    }

    const userId = String(user._id);
    if (Array.isArray(body)) {
        if (!body.length) return res.status(400).json(rpcError(null, -32600, "Empty batch"));
        const out = (await Promise.all(body.map((m) => handleRpc(m, userId)))).filter(Boolean);
        return out.length ? res.json(out) : res.status(202).end();
    }

    const response = await handleRpc(body, userId);
    return response ? res.json(response) : res.status(202).end();
});

export default router;
