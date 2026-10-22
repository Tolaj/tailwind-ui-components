import { Router } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Component from "../models/component.model.js";
import { exportComponent, FORMATS } from "../utils/exporters.js";
import { searchLibrary } from "../services/library.service.js";
import { normalizeTags } from "../controllers/component.controller.js";
import { buildSpec, enrichSpecWithAI, specToMarkdown, extractSpec } from "../services/spec.service.js";
import { buildDesignGuide } from "../services/guide.service.js";
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
            },
            required: ["title", "description", "htmlCode"],
        },
    },
    {
        name: "list_tags",
        description: "List every tag used in the user's library with counts.",
        inputSchema: { type: "object", properties: {} },
    },
];

const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (message) => ({ isError: true, content: [{ type: "text", text: message }] });

async function callTool(userId, name, args = {}) {
    switch (name) {
        case "search_components": {
            const results = await searchLibrary(userId, { query: args.query, tag: args.tag, limit: Math.min(Number(args.limit) || 10, 25) });
            return text(results.map((c) => {
                const spec = c.spec || extractSpec(c.htmlCode);
                return {
                    id: String(c._id),
                    title: c.title,
                    summary: spec.summary || c.description,
                    useWhen: spec.useWhen || undefined,
                    tags: c.tags,
                    category: c.category,
                    version: c.version,
                    mainColors: (spec.tokens?.colors || []).slice(0, 3).map((t) => t.name),
                    responsive: spec.responsive,
                    darkMode: spec.darkMode,
                    needsJs: Boolean(spec.needs?.javascript),
                };
            }));
        }
        case "get_component": {
            const format = String(args.format || "html").toLowerCase();
            if (!FORMATS.includes(format)) return fail(`format must be one of ${FORMATS.join(", ")}`);
            if (!/^[a-f0-9]{24}$/i.test(String(args.id))) return fail("Invalid component id");
            const c = await Component.findOne({ _id: args.id, createdBy: userId }).lean();
            if (!c) return fail("Component not found in your library");
            return text(`${specToMarkdown(c)}\n\n---\n\n${exportComponent(c.htmlCode, format, c.title)}`);
        }
        case "save_component": {
            if (!args.title || !args.description || !args.htmlCode) return fail("title, description and htmlCode are required");
            const c = await Component.create({
                title: args.title,
                description: args.description,
                htmlCode: args.htmlCode,
                category: args.category || "apps-general",
                tags: normalizeTags(args.tags),
                spec: buildSpec(args.htmlCode),
                createdBy: userId,
                isPublished: false,
            });
            enrichSpecWithAI(c._id, userId);
            return text({ id: String(c._id), message: "Saved to your library (private)" });
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

router.get("/", (req, res) => res.status(405).set("Allow", "POST").json({ error: "Use POST (stateless MCP over HTTP)" }));

router.post("/", async (req, res) => {
    const user = await authenticate(req);
    if (!user) {
        return res.status(401).set("WWW-Authenticate", `Bearer resource_metadata="${publicBase(req)}/.well-known/oauth-protected-resource"`).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Missing or invalid API token" } });
    }

    const { id, method, params } = req.body || {};
    const reply = (result) => res.json({ jsonrpc: "2.0", id, result });
    const error = (code, message) => res.json({ jsonrpc: "2.0", id, error: { code, message } });

    try {
        switch (method) {
            case "initialize":
                return reply({
                    protocolVersion: params?.protocolVersion || "2025-03-26",
                    capabilities: { tools: {} },
                    serverInfo: { name: "tailwind-ui-library", version: "1.0.0" },
                    instructions: "The user's private component library. Call get_design_guide first for their design tokens and a component index, then search_components before writing new UI so output matches their existing components. Fetch full code with get_component only for what you will use, and save good new components back with save_component.",
                });
            case "ping":
                return reply({});
            case "tools/list":
                return reply({ tools: TOOLS });
            case "tools/call":
                return reply(await callTool(String(user._id), params?.name, params?.arguments));
            default:
                if (id === undefined || String(method).startsWith("notifications/")) return res.status(202).end();
                return error(-32601, `Method not found: ${method}`);
        }
    } catch (e) {
        console.error("MCP error:", e);
        return error(-32603, "Internal error");
    }
});

export default router;
