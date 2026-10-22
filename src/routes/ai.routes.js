import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { ensureAuthAPI } from "../middlewares/auth.js";
import User from "../models/user.model.js";
import { searchLibrary } from "../services/library.service.js";
import { buildDesignGuide } from "../services/guide.service.js";

const router = Router();

const SYSTEM_PROMPT = `You are an expert frontend developer specialising in Tailwind CSS and HTML.
Your ONLY job is to output a single, self-contained HTML snippet that uses Tailwind CSS utility classes.

Rules:
- Output ONLY raw HTML. No markdown, no code fences, no explanations.
- Use only Tailwind CSS classes for styling (loaded via CDN, so all utilities are available).
- Do NOT include <html>, <head>, <body>, or <script> tags.
- The snippet must be visually polished and production-quality.
- If the user provides existing HTML to modify, improve it according to their instructions while keeping the overall structure intact.`;

router.post("/generate-stream", ensureAuthAPI, async (req, res) => {
    const { prompt, currentHtml } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user?.llmSettings?.enabled) {
        return res.status(403).json({ success: false, message: "AI is not enabled. Configure it in Settings." });
    }

    const { provider, anthropicApiKey, localLlmUrl } = user.llmSettings;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let system = SYSTEM_PROMPT;
    let referenceTitles = [];
    if (req.body.useLibrary !== false) {
        try {
            const refs = (await searchLibrary(req.session.user.id, { query: prompt, limit: 3, referenceOnly: true })).filter((c) => c.htmlCode);
            if (refs.length) {
                referenceTitles = refs.map((c) => c.title);
                const { tokensMarkdown } = await buildDesignGuide(req.session.user.id, { referenceOnly: true });
                if (tokensMarkdown) system += `\n\nThis is a summary of the user's design system, derived from their library:\n${tokensMarkdown}`;
                system += `\n\nThe user keeps a design library. These are their existing components. Match their visual language (colors, spacing, radius, typography, class conventions) and reuse their patterns where they fit. Do not copy them verbatim unless asked.\n\n` +
                    refs.map((c, i) => `--- Reference ${i + 1}: ${c.title} ---\n${c.htmlCode.slice(0, 2500)}`).join("\n\n");
            }
        } catch (e) {
            console.error("Library grounding failed:", e.message);
        }
    }

    const userMessage = currentHtml
        ? `Here is my current HTML component:\n\n${currentHtml}\n\nPlease make the following change: ${prompt}`
        : `Create a Tailwind CSS HTML component for: ${prompt}`;

    const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (referenceTitles.length) sendEvent({ type: "context", titles: referenceTitles });

    try {
        if (provider === "anthropic") {
            if (!anthropicApiKey) {
                sendEvent({ type: "error", message: "Anthropic API key not configured" });
                return res.end();
            }
            const client = new Anthropic({ apiKey: anthropicApiKey });
            const stream = client.messages.stream({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 4096,
                system,
                messages: [{ role: "user", content: userMessage }],
            });

            for await (const event of stream) {
                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                    sendEvent({ type: "delta", text: event.delta.text });
                }
            }
            sendEvent({ type: "done" });
        } else {
            if (!localLlmUrl) {
                sendEvent({ type: "error", message: "Local LLM URL not configured" });
                return res.end();
            }
            const response = await fetch(`${localLlmUrl}/v1/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: userMessage },
                    ],
                    max_tokens: 10000,
                    temperature: 1,
                    stream: true,
                }),
            });

            if (!response.ok) throw new Error(`LLM server error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
                for (const line of lines) {
                    const raw = line.replace("data: ", "").trim();
                    if (raw === "[DONE]") { sendEvent({ type: "done" }); break; }
                    try {
                        const parsed = JSON.parse(raw);
                        const text = parsed?.choices?.[0]?.delta?.content;
                        if (text) sendEvent({ type: "delta", text });
                    } catch {}
                }
            }
        }
    } catch (error) {
        console.error("AI stream error:", error);
        let msg = error.message;
        if (error.status === 404) {
            msg = "Model not found. Check that your API key has billing enabled at console.anthropic.com and credits are loaded.";
        } else if (error.status === 401) {
            msg = "Invalid API key. Please check your key in Settings.";
        } else if (error.status === 429) {
            msg = "Rate limit exceeded. Please wait and try again.";
        }
        sendEvent({ type: "error", message: `Error: ${msg}` });
    } finally {
        res.end();
    }
});

export default router;
