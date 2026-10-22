import express from "express";
import Component from "../models/component.model.js";
import User from "../models/user.model.js";
import { createZip } from "../utils/zip.js";
import { publicBase } from "../utils/publicUrl.js";
import { connectedApps, revokeClientForUser, issueTokenPair } from "../services/oauth.service.js";
import OAuthClient from "../models/oauthClient.model.js";
import OAuthToken from "../models/oauthToken.model.js";
import { buildClaudeCodeKit, buildDesignPack, mcpJson, claudeMdSnippet, skillMd, TOKEN_ENV } from "../services/kit.service.js";

const router = express.Router();
const baseUrl = publicBase;

const sendZip = (res, name, files) => {
    res.set({ "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"` });
    res.send(createZip(files));
};

router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [count, account, apps] = await Promise.all([
            Component.countDocuments({ createdBy: userId }),
            User.findById(userId).select("apiTokenPrefix").lean(),
            connectedApps(userId),
        ]);
        res.render("main/connect", {
            layout: "main",
            activePage: "connect",
            title: "Connect",
            user: req.session.user,
            count,
            apps,
            isLocal: /^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl(req)),
            tokenPrefix: account?.apiTokenPrefix || "",
            mcpUrl: `${baseUrl(req)}/mcp`,
            tokenEnv: TOKEN_ENV,
            mcpJson: mcpJson(baseUrl(req)),
            claudeMd: claudeMdSnippet(),
            skillMd: skillMd(),
        });
    } catch (error) {
        console.error("Connect error:", error);
        res.status(500).render("error", { layout: "main", title: "Error", message: "Failed to load the Connect page" });
    }
});

router.get("/claude-code-kit.zip", (req, res) => sendZip(res, "claude-code-kit.zip", buildClaudeCodeKit(baseUrl(req))));

router.get("/design-pack.zip", async (req, res) => {
    try {
        const { files, count } = await buildDesignPack(req.session.user.id, req.session.user.name);
        if (!count) return res.status(400).type("text/plain").send("Your library has no components yet. Add or save a few first.");
        sendZip(res, "design-pack.zip", files);
    } catch (error) {
        console.error("Design pack error:", error);
        res.status(500).type("text/plain").send("Could not build the design pack");
    }
});

router.post("/apps/:clientId/revoke", async (req, res) => {
    await revokeClientForUser(req.session.user.id, req.params.clientId);
    res.json({ success: true });
});

// Runs the same sequence Claude does against this server's public address and reports what is wrong.
router.get("/check", async (req, res) => {
    const base = baseUrl(req);
    const userId = req.session.user.id;
    const http = (url, opts = {}) => fetch(url, { ...opts, signal: AbortSignal.timeout(7000), redirect: "manual" });
    const rpc = (headers, body) => http(`${base}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers }, body: JSON.stringify(body) });

    const run = async (id, label, fn) => {
        try {
            const r = await fn();
            return { id, label, ok: Boolean(r.ok), detail: r.detail || "", fix: r.ok ? "" : r.fix || "" };
        } catch (e) {
            const timeout = e.name === "TimeoutError" || e.name === "AbortError";
            return { id, label, ok: false, detail: timeout ? "No answer within 7 seconds" : `Could not connect: ${e.cause?.code || e.message}`, fix: `Make sure ${base} is reachable from the internet and the server is running.` };
        }
    };

    const checks = [];
    checks.push(await run("https", "Public HTTPS address", async () => {
        const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(base);
        if (local) return { ok: false, detail: `The server address is ${base}, which Claude on the web cannot reach.`, fix: "Deploy the app on a public HTTPS address and set PUBLIC_URL to it." };
        if (!base.startsWith("https://")) return { ok: false, detail: `${base} is not HTTPS.`, fix: "Claude requires HTTPS. Serve the app over HTTPS and set PUBLIC_URL." };
        return { ok: true, detail: base };
    }));

    checks.push(await run("resource", "Resource metadata (RFC 9728)", async () => {
        const r = await http(`${base}/.well-known/oauth-protected-resource`);
        if (r.status !== 200) return { ok: false, detail: `Returned HTTP ${r.status}`, fix: "The /.well-known/ paths must be served by this app. Check proxy or rewrite rules." };
        const j = await r.json();
        return j.resource === `${base}/mcp` && (j.authorization_servers || []).includes(base)
            ? { ok: true, detail: `resource ${j.resource}` }
            : { ok: false, detail: `resource is ${j.resource}`, fix: `It should be ${base}/mcp. Set PUBLIC_URL to the exact public address.` };
    }));

    checks.push(await run("authserver", "Authorization server metadata", async () => {
        const r = await http(`${base}/.well-known/oauth-authorization-server`);
        if (r.status !== 200) return { ok: false, detail: `Returned HTTP ${r.status}`, fix: "Serve /.well-known/oauth-authorization-server from this app." };
        const j = await r.json();
        const missing = ["authorization_endpoint", "token_endpoint", "registration_endpoint"].filter((k) => !j[k]);
        if (j.issuer !== base) return { ok: false, detail: `issuer is ${j.issuer}`, fix: `It should be ${base}. Set PUBLIC_URL.` };
        if (missing.length) return { ok: false, detail: `Missing ${missing.join(", ")}`, fix: "Update the app to the latest version." };
        if (!(j.code_challenge_methods_supported || []).includes("S256")) return { ok: false, detail: "PKCE S256 not advertised", fix: "Update the app to the latest version." };
        return { ok: true, detail: "issuer, endpoints and PKCE S256 present" };
    }));

    checks.push(await run("challenge", "Unauthenticated request gets a 401 challenge", async () => {
        const r = await rpc({}, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
        const h = r.headers.get("www-authenticate") || "";
        if (r.status !== 401) return { ok: false, detail: `Expected 401, got ${r.status}`, fix: "The /mcp endpoint must answer 401 until the user signs in." };
        return h.includes(`resource_metadata="${base}/.well-known/oauth-protected-resource"`)
            ? { ok: true, detail: "401 with resource_metadata pointer" }
            : { ok: false, detail: `WWW-Authenticate was: ${h || "(empty)"}`, fix: "Set PUBLIC_URL to the exact public address." };
    }));

    checks.push(await run("register", "Dynamic client registration", async () => {
        const r = await http(`${base}/oauth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_name: "Windcraft self-check", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }) });
        if (r.status !== 201) return { ok: false, detail: `Returned HTTP ${r.status}`, fix: "POST /oauth/register must be reachable and return 201." };
        const j = await r.json();
        await OAuthClient.deleteOne({ clientId: j.client_id });
        return { ok: true, detail: "registered and removed a test client" };
    }));

    checks.push(await run("mcp", "Authenticated MCP call (tools/list)", async () => {
        const pair = await issueTokenPair({ clientId: "windcraft-selfcheck", userId, resource: `${base}/mcp` });
        try {
            const auth = { Authorization: `Bearer ${pair.access_token}` };
            const init = await (await rpc(auth, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "selfcheck", version: "1" } } })).json();
            const list = await (await rpc(auth, { jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
            const names = (list.result?.tools || []).map((t) => t.name);
            return init.result?.protocolVersion && names.includes("search_components")
                ? { ok: true, detail: `protocol ${init.result.protocolVersion}, ${names.length} tools` }
                : { ok: false, detail: "initialize or tools/list returned an unexpected answer", fix: "Check the server logs for MCP errors." };
        } finally {
            await OAuthToken.deleteMany({ clientId: "windcraft-selfcheck" });
        }
    }));

    checks.push(await run("cors", "Cross-origin access (browser clients)", async () => {
        const r = await http(`${base}/oauth/token`, { method: "OPTIONS", headers: { Origin: "https://claude.ai", "Access-Control-Request-Method": "POST" } });
        return r.headers.get("access-control-allow-origin")
            ? { ok: true, detail: "CORS headers present" }
            : { ok: false, detail: "No CORS headers on the token endpoint", fix: "A proxy may be stripping OPTIONS requests. Allow OPTIONS on /oauth/* and /mcp." };
    }));

    res.json({ base, allOk: checks.every((c) => c.ok), checks });
});

export default router;
