import express from "express";
import crypto from "crypto";
import OAuthToken from "../models/oauthToken.model.js";
import { publicBase } from "../utils/publicUrl.js";
import {
    SCOPE, sha256, isValidRedirectUri, registerClient, findClient,
    createAuthCode, issueTokenPair, verifyPkce,
} from "../services/oauth.service.js";

const router = express.Router();

// Metadata, registration and token endpoints are called by other servers and tools, not browsers with cookies.
const openCors = (req, res, next) => {
    res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
};

const noStore = (res) => res.set({ "Cache-Control": "no-store", Pragma: "no-cache" });

// ── Discovery ────────────────────────────────────────────────────────────────

const resourceMetadata = (req, res) => {
    const base = publicBase(req);
    res.json({
        resource: `${base}/mcp`,
        authorization_servers: [base],
        bearer_methods_supported: ["header"],
        scopes_supported: [SCOPE],
        resource_name: "Windcraft component library",
    });
};

const serverMetadata = (req, res) => {
    const base = publicBase(req);
    res.json({
        issuer: base,
        authorization_endpoint: `${base}/oauth/authorize`,
        token_endpoint: `${base}/oauth/token`,
        registration_endpoint: `${base}/oauth/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
        scopes_supported: [SCOPE],
    });
};

for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"]) router.get(path, openCors, resourceMetadata);
for (const path of ["/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server/mcp", "/.well-known/openid-configuration"]) router.get(path, openCors, serverMetadata);

// ── Dynamic client registration (RFC 7591) ───────────────────────────────────

router.options("/oauth/register", openCors);
router.post("/oauth/register", openCors, express.json(), async (req, res) => {
    const { client_name, redirect_uris } = req.body || {};
    if (!Array.isArray(redirect_uris) || redirect_uris.length < 1 || redirect_uris.length > 5 || !redirect_uris.every((u) => typeof u === "string" && isValidRedirectUri(u))) {
        return res.status(400).json({ error: "invalid_redirect_uri", error_description: "Provide 1 to 5 redirect URIs (https, or http on localhost)" });
    }
    try {
        const client = await registerClient({ client_name, redirect_uris });
        noStore(res);
        res.status(201).json({
            client_id: client.clientId,
            client_name: client.clientName,
            redirect_uris: client.redirectUris,
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
            client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
        });
    } catch (error) {
        console.error("OAuth register error:", error);
        res.status(500).json({ error: "server_error" });
    }
});

// ── Authorization (user consent) ─────────────────────────────────────────────

const errorPage = (res, message) =>
    res.status(400).render("error", { layout: "auth", title: "Authorization error", message });

const redirectWith = (redirectUri, params) => {
    const url = new URL(redirectUri);
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
    return url.toString();
};

/** Validates client + redirect_uri first. Those errors must never redirect. */
async function validateAuthRequest(source) {
    const client = await findClient(source.client_id);
    if (!client) return { fatal: "Unknown application. Reconnect it from the app you started from." };
    if (!client.redirectUris.includes(source.redirect_uri)) return { fatal: "The redirect address does not match what this application registered." };
    return { client };
}

router.get("/oauth/authorize", async (req, res) => {
    const q = req.query;
    const { client, fatal } = await validateAuthRequest(q);
    if (fatal) return errorPage(res, fatal);

    const fail = (error, description) => res.redirect(redirectWith(q.redirect_uri, { error, error_description: description, state: q.state }));
    if (q.response_type !== "code") return fail("unsupported_response_type", "Only response_type=code is supported");
    if (!q.code_challenge || q.code_challenge_method !== "S256") return fail("invalid_request", "PKCE with code_challenge_method=S256 is required");

    if (!req.session.user) {
        return res.redirect(`/auth/sign-in?returnTo=${encodeURIComponent(req.originalUrl)}`);
    }

    req.session.oauthCsrf = crypto.randomBytes(24).toString("hex");
    res.set("Cache-Control", "no-store");
    res.render("main/oauth-consent", {
        layout: "auth",
        title: "Authorize access",
        clientName: client.clientName,
        redirectHost: new URL(q.redirect_uri).host,
        userEmail: req.session.user.email,
        csrf: req.session.oauthCsrf,
        fields: ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource"]
            .map((name) => ({ name, value: q[name] ?? "" })),
    });
});

router.post("/oauth/authorize", express.urlencoded({ extended: false }), async (req, res) => {
    if (!req.session.user) return res.redirect(`/auth/sign-in`);
    const b = req.body || {};
    if (!b.csrf || !req.session.oauthCsrf || b.csrf !== req.session.oauthCsrf) return errorPage(res, "This request expired. Start the connection again.");
    req.session.oauthCsrf = null;

    const { client, fatal } = await validateAuthRequest(b);
    if (fatal) return errorPage(res, fatal);
    if (b.response_type !== "code" || !b.code_challenge || b.code_challenge_method !== "S256") return errorPage(res, "Invalid authorization request.");

    if (b.decision !== "allow") {
        return res.redirect(redirectWith(b.redirect_uri, { error: "access_denied", error_description: "The user denied the request", state: b.state || undefined }));
    }

    const code = await createAuthCode({
        clientId: client.clientId,
        userId: req.session.user.id,
        redirectUri: b.redirect_uri,
        codeChallenge: b.code_challenge,
        resource: b.resource || "",
    });
    res.redirect(redirectWith(b.redirect_uri, { code, state: b.state || undefined, iss: publicBase(req) }));
});

// ── Token endpoint ───────────────────────────────────────────────────────────

const tokenError = (res, status, error, description) => {
    noStore(res);
    return res.status(status).json({ error, error_description: description });
};

router.options("/oauth/token", openCors);
router.post("/oauth/token", openCors, express.urlencoded({ extended: false }), express.json(), async (req, res) => {
    const b = req.body || {};
    try {
        if (b.grant_type === "authorization_code") {
            if (!b.code || !b.client_id) return tokenError(res, 400, "invalid_request", "code and client_id are required");
            // Atomic single use: a replayed code finds nothing.
            const row = await OAuthToken.findOneAndUpdate(
                { type: "code", tokenHash: sha256(String(b.code)), used: false, expiresAt: { $gt: new Date() } },
                { used: true }
            ).lean();
            if (!row || row.clientId !== b.client_id) return tokenError(res, 400, "invalid_grant", "Invalid or expired code");
            if (row.redirectUri !== b.redirect_uri) return tokenError(res, 400, "invalid_grant", "redirect_uri does not match");
            if (!verifyPkce(b.code_verifier, row.codeChallenge)) return tokenError(res, 400, "invalid_grant", "PKCE verification failed");

            noStore(res);
            return res.json(await issueTokenPair({ clientId: row.clientId, userId: row.userId, resource: row.resource }));
        }

        if (b.grant_type === "refresh_token") {
            if (!b.refresh_token || !b.client_id) return tokenError(res, 400, "invalid_request", "refresh_token and client_id are required");
            const row = await OAuthToken.findOneAndDelete({ type: "refresh", tokenHash: sha256(String(b.refresh_token)), clientId: String(b.client_id), expiresAt: { $gt: new Date() } }).lean();
            if (!row) return tokenError(res, 400, "invalid_grant", "Invalid or expired refresh token");
            await OAuthToken.deleteMany({ type: "access", familyId: row.familyId });

            noStore(res);
            return res.json(await issueTokenPair({ clientId: row.clientId, userId: row.userId, resource: row.resource, familyId: row.familyId }));
        }

        return tokenError(res, 400, "unsupported_grant_type", "Use authorization_code or refresh_token");
    } catch (error) {
        console.error("OAuth token error:", error);
        return tokenError(res, 500, "server_error", "Could not issue token");
    }
});

export default router;
