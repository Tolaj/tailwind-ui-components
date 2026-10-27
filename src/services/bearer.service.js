import crypto from "crypto";
import User from "../models/user.model.js";
import { userIdForAccessToken } from "./oauth.service.js";

/** Accepts either a personal API token (twl_...) or an OAuth access token in the Authorization header. Returns the user's id, or null. */
export const authenticateBearer = async (req) => {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return null;
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const viaApiToken = await User.findOne({ apiTokenHash: hash }).select("_id").lean();
    if (viaApiToken) return String(viaApiToken._id);
    const oauthUserId = await userIdForAccessToken(token);
    return oauthUserId ? String(oauthUserId) : null;
};
