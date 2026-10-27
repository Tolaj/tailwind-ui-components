import crypto from "crypto";
import { createMcpRouter } from "@windcraft/mcp";
import User from "../models/user.model.js";
import { userIdForAccessToken } from "../services/oauth.service.js";
import { projectContext } from "../services/project.service.js";
import { publicBase } from "../utils/publicUrl.js";
import { TOOLS, INSTRUCTIONS, TITLES, READ_ONLY, DESTRUCTIVE, callTool } from "../mcp/tools.js";

/** Accepts either a personal API token (twl_...) or an OAuth access token. Returns the user's id, or null. */
const authenticate = async (req) => {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return null;
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const viaApiToken = await User.findOne({ apiTokenHash: hash }).select("_id").lean();
    if (viaApiToken) return String(viaApiToken._id);
    const oauthUserId = await userIdForAccessToken(token);
    return oauthUserId ? String(oauthUserId) : null;
};

export default createMcpRouter({
    serverInfo: { name: "tailwind-ui-library", title: "Windcraft component library", version: "1.0.0" },
    instructions: async (userId) => {
        const context = await projectContext(userId);
        return INSTRUCTIONS + (context ? `\n\n${context}` : "\n\nNo active project yet: when the user says what they are working on, call set_active_project or create_project.");
    },
    tools: TOOLS.map((t) => ({ ...t, title: TITLES[t.name], readOnly: READ_ONLY.has(t.name), destructive: DESTRUCTIVE.has(t.name) })),
    callTool,
    authenticate,
    challenge: (req) => `Bearer resource_metadata="${publicBase(req)}/.well-known/oauth-protected-resource"`,
});
