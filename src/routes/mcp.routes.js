import { createMcpRouter } from "@windcraft/mcp";
import { authenticateBearer as authenticate } from "../services/bearer.service.js";
import { projectContext } from "../services/project.service.js";
import { publicBase } from "../utils/publicUrl.js";
import { TOOLS, INSTRUCTIONS, TITLES, READ_ONLY, DESTRUCTIVE, callTool } from "../mcp/tools.js";

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
