import express from "express";
import Component from "../models/component.model.js";
import User from "../models/user.model.js";
import { createZip } from "../utils/zip.js";
import { publicBase } from "../utils/publicUrl.js";
import { connectedApps, revokeClientForUser } from "../services/oauth.service.js";
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

export default router;
