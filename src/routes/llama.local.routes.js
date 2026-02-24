import { Router } from "express";
import { ensureAuthAPI } from "../middlewares/auth.js";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

const LOCAL_LLM_URL = process.env.LLM_URL || "http://localhost:5001";

const SYSTEM_PROMPT = `You are an expert frontend developer specialising in Tailwind CSS and HTML.
Your ONLY job is to output a single, self-contained HTML snippet that uses Tailwind CSS utility classes.

Rules:
- Output ONLY raw HTML. No markdown, no code fences, no explanations.
- Use only Tailwind CSS classes for styling (loaded via CDN, so all utilities are available).
- Do NOT include <html>, <head>, <body>, or <script> tags.
- The snippet must be visually polished and production-quality.
- If the user provides existing HTML to modify, improve it according to their instructions while keeping the overall structure intact.`;

/**
 * POST /api/ai/generate-stream
 * Streams local LLM response as Server-Sent Events.
 * Body: { prompt: string, currentHtml?: string }
 */
router.post("/generate-stream", ensureAuthAPI, async (req, res) => {
    const { prompt, currentHtml } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const userMessage = currentHtml
        ? `Here is my current HTML component:\n\n${currentHtml}\n\nPlease make the following change: ${prompt}`
        : `Create a Tailwind CSS HTML component for: ${prompt}`;

    const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
        const response = await fetch(`${LOCAL_LLM_URL}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userMessage },
                ],
                max_tokens: 10000,
                temperature: 1,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM server error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

            for (const line of lines) {
                const raw = line.replace("data: ", "").trim();

                if (raw === "[DONE]") {
                    sendEvent({ type: "done" });
                    break;
                }

                try {
                    const parsed = JSON.parse(raw);
                    const text = parsed?.choices?.[0]?.delta?.content;
                    if (text) {
                        sendEvent({ type: "delta", text });
                    }
                } catch {
                    // skip malformed chunks
                }
            }
        }
    } catch (error) {
        console.error("LLM stream error:", error);
        sendEvent({ type: "error", message: error.message });
    } finally {
        res.end();
    }
});

export default router;