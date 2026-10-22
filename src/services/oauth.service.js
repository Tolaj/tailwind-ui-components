import crypto from "crypto";
import mongoose from "mongoose";
import OAuthClient from "../models/oauthClient.model.js";
import OAuthToken from "../models/oauthToken.model.js";

export const SCOPE = "library";
export const ACCESS_TTL_S = 60 * 60;
export const REFRESH_TTL_S = 60 * 60 * 24 * 30;
export const CODE_TTL_S = 60 * 10;

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = (prefix) => `${prefix}_${crypto.randomBytes(32).toString("base64url")}`;
const inSeconds = (s) => new Date(Date.now() + s * 1000);

/** https anywhere, or http only for localhost / 127.0.0.1. No fragments. */
export function isValidRedirectUri(uri) {
    try {
        const u = new URL(uri);
        if (u.hash) return false;
        if (u.protocol === "https:") return true;
        return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    } catch {
        return false;
    }
}

export async function registerClient({ client_name, redirect_uris }) {
    const clientId = randomToken("mcp_client");
    const client = await OAuthClient.create({
        clientId,
        clientName: String(client_name || "Unnamed app").slice(0, 80),
        redirectUris: redirect_uris,
    });
    return client;
}

export const findClient = (clientId) => OAuthClient.findOne({ clientId: String(clientId || "") }).lean();

export async function createAuthCode({ clientId, userId, redirectUri, codeChallenge, resource }) {
    const code = randomToken("code");
    await OAuthToken.create({
        type: "code", tokenHash: sha256(code), clientId, userId, redirectUri, codeChallenge, resource,
        scope: SCOPE, expiresAt: inSeconds(CODE_TTL_S),
    });
    return code;
}

export async function issueTokenPair({ clientId, userId, resource, familyId }) {
    const access = randomToken("at");
    const refresh = randomToken("rt");
    const family = familyId || crypto.randomUUID();
    await OAuthToken.create([
        { type: "access", tokenHash: sha256(access), clientId, userId, resource, familyId: family, scope: SCOPE, expiresAt: inSeconds(ACCESS_TTL_S) },
        { type: "refresh", tokenHash: sha256(refresh), clientId, userId, resource, familyId: family, scope: SCOPE, expiresAt: inSeconds(REFRESH_TTL_S) },
    ]);
    return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: SCOPE };
}

export function verifyPkce(verifier, challenge) {
    if (!verifier || !/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
    const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
    const a = Buffer.from(computed);
    const b = Buffer.from(String(challenge));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Returns the user id for a valid OAuth access token, else null. */
export async function userIdForAccessToken(token) {
    const row = await OAuthToken.findOne({ type: "access", tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).select("userId").lean();
    return row ? String(row.userId) : null;
}

export async function revokeClientForUser(userId, clientId) {
    await OAuthToken.deleteMany({ userId, clientId });
}

export async function connectedApps(userId) {
    const rows = await OAuthToken.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(String(userId)), type: "refresh", expiresAt: { $gt: new Date() } } },
        { $group: { _id: "$clientId", since: { $min: "$createdAt" } } },
    ]);
    const clients = await OAuthClient.find({ clientId: { $in: rows.map((r) => r._id) } }).lean();
    const names = Object.fromEntries(clients.map((c) => [c.clientId, c.clientName]));
    return rows.map((r) => ({ clientId: r._id, name: names[r._id] || "Unknown app", since: r.since }));
}
