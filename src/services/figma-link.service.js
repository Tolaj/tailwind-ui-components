import crypto from "crypto";
import FigmaLink from "../models/figmaLink.model.js";
import FigmaToken from "../models/figmaToken.model.js";
import User from "../models/user.model.js";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const LINK_TTL_MS = 10 * 60 * 1000;

/** Starts a sign-in: a code for the browser page and a secret only the plugin knows. */
export async function startLink() {
    const code = crypto.randomBytes(18).toString("base64url");
    const secret = crypto.randomBytes(24).toString("base64url");
    await FigmaLink.create({ code, secretHash: sha256(secret), expiresAt: new Date(Date.now() + LINK_TTL_MS) });
    return { code, secret };
}

/** Is this code a sign-in still waiting for approval? */
export const pendingLink = async (code) => FigmaLink.exists({ code: String(code || ""), userId: null, expiresAt: { $gt: new Date() } });

/** The signed-in user approves the code in the browser. */
export async function approveLink(code, userId) {
    const r = await FigmaLink.updateOne({ code: String(code || ""), userId: null, expiresAt: { $gt: new Date() } }, { userId });
    return r.modifiedCount === 1;
}

/** The plugin asks whether the code was approved: once, it gets a long-lived token (shown here only, kept hashed). */
export async function collectLink(code, secret) {
    const link = await FigmaLink.findOne({ code: String(code || ""), secretHash: sha256(String(secret || "")), expiresAt: { $gt: new Date() } }).lean();
    if (!link) return { status: "expired" };
    if (!link.userId) return { status: "pending" };
    if (!(await FigmaLink.findOneAndDelete({ _id: link._id }))) return { status: "expired" }; // collected by a second poll already
    const token = `fgp_${crypto.randomBytes(32).toString("base64url")}`;
    await FigmaToken.create({ userId: link.userId, tokenHash: sha256(token) });
    const user = await User.findById(link.userId).select("name email").lean();
    return { status: "ok", token, user: { name: user?.name || "", email: user?.email || "" } };
}

export async function signOutToken(token) {
    return (await FigmaToken.deleteOne({ tokenHash: sha256(String(token || "")) })).deletedCount === 1;
}
