// @windcraft/mcp: the MCP protocol for an Express app, with nothing about what the tools do.
//
//   app.use("/mcp", createMcpRouter({ serverInfo, instructions, tools, callTool, authenticate, challenge }));
//
// Stateless: POST only (single messages or batches), no sessions and no server-initiated stream. Auth is a Bearer token, never
// cookies, so browser-based clients may call it from any origin.
import { Router } from "express";

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

/** A tool's result as text (an object is shown as JSON). */
export const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
/** A tool's failure: the client shows the message and may retry. */
export const fail = (message) => ({ isError: true, content: [{ type: "text", text: message }] });
export const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/**
 * The tools as a client lists them. Each tool is { name, description, inputSchema, title?, readOnly?, destructive? }: the hints let a
 * client (Claude shows them in its permission UI) treat read tools as safe and ask before a tool that replaces something.
 */
export const annotateTools = (tools) => tools.map(({ readOnly, destructive, ...tool }) => {
    const title = tool.title || tool.name;
    return {
        ...tool,
        title,
        annotations: { title, readOnlyHint: Boolean(readOnly), destructiveHint: Boolean(destructive), idempotentHint: Boolean(readOnly), openWorldHint: false },
    };
});

/**
 * @param {object} options
 * @param {{ name: string, title?: string, version: string }} options.serverInfo
 * @param {(ctx: any) => string | Promise<string>} options.instructions   what a client reads on connecting, before any tool
 * @param {{ name: string, description: string, inputSchema: object, title?: string, readOnly?: boolean, destructive?: boolean }[]} options.tools
 * @param {(ctx: any, name: string, args: object) => Promise<object>} options.callTool   returns text(...) or fail(...)
 * @param {(req: import("express").Request) => Promise<any> | any} options.authenticate   the caller (passed on as ctx), or null for none
 * @param {(req: import("express").Request) => string} [options.challenge]   the WWW-Authenticate value sent with a 401
 */
export function createMcpRouter({ serverInfo, instructions, tools, callTool, authenticate, challenge }) {
    const router = Router();
    const listed = annotateTools(tools);

    // Browser-based MCP clients call this from another origin.
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

    router.all("/", (req, res, next) => {
        if (req.method === "POST") return next();
        res.status(405).set("Allow", "POST, OPTIONS").json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Method not allowed. Use POST." } });
    });

    /** Handles one JSON-RPC message. Returns the response object, or null for notifications. */
    async function handleRpc(msg, ctx) {
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
                    return ok({
                        protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
                        capabilities: { tools: { listChanged: false } },
                        serverInfo,
                        instructions: await instructions(ctx),
                    });
                }
                case "ping":
                    return isNotification ? null : ok({});
                case "tools/list":
                    return ok({ tools: listed });
                case "tools/call":
                    if (!params || typeof params.name !== "string") return rpcError(id, -32602, "tools/call needs a tool name");
                    return ok(await callTool(ctx, params.name, params.arguments));
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
        const ctx = await authenticate(req);
        if (!ctx) {
            if (challenge) res.set("WWW-Authenticate", challenge(req));
            return res.status(401).json(rpcError(null, -32001, "Authorization required"));
        }

        const body = req.body;
        if (body === undefined || body === null || typeof body !== "object") {
            return res.status(400).json(rpcError(null, -32700, "Parse error: send a JSON-RPC 2.0 message"));
        }

        if (Array.isArray(body)) {
            if (!body.length) return res.status(400).json(rpcError(null, -32600, "Empty batch"));
            const out = (await Promise.all(body.map((m) => handleRpc(m, ctx)))).filter(Boolean);
            return out.length ? res.json(out) : res.status(202).end();
        }

        const response = await handleRpc(body, ctx);
        return response ? res.json(response) : res.status(202).end();
    });

    return router;
}
