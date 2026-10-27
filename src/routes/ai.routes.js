import { Router } from "express";
import { generateStream } from "@windcraft/ai";
import { ensureAuthAPI } from "../middlewares/auth.js";
import User from "../models/user.model.js";
import { searchLibrary } from "../services/library.service.js";
import { buildDesignGuide } from "../services/guide.service.js";

const router = Router();

router.post("/generate-stream", ensureAuthAPI, async (req, res) => {
    const { prompt, currentHtml } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user?.llmSettings?.enabled) {
        return res.status(403).json({ success: false, message: "AI is not enabled. Configure it in Settings." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    // The user's own components, so a draft matches their design system.
    let library = {};
    if (req.body.useLibrary !== false) {
        try {
            const references = (await searchLibrary(req.session.user.id, { query: prompt, limit: 3, referenceOnly: true })).filter((c) => c.htmlCode);
            if (references.length) {
                const { tokensMarkdown } = await buildDesignGuide(req.session.user.id, { referenceOnly: true });
                library = { references, tokensMarkdown };
                sendEvent({ type: "context", titles: references.map((c) => c.title) });
            }
        } catch (e) {
            console.error("Library grounding failed:", e.message);
        }
    }

    try {
        for await (const event of generateStream(user.llmSettings, { prompt, currentHtml, library })) sendEvent(event);
    } finally {
        res.end();
    }
});

export default router;
