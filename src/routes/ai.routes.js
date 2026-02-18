// import { Router } from "express";
// import Anthropic from "@anthropic-ai/sdk";
// import { ensureAuthAPI } from "../middlewares/auth.js";
// import dotenv from "dotenv";
// dotenv.config();
// const router = Router();
// const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// /**
//  * POST /api/ai/generate
//  * Body: { prompt: string, currentHtml?: string }
//  * Returns: { success: true, html: string }
//  */
// router.post("/generate", ensureAuthAPI, async (req, res) => {
//     const { prompt, currentHtml } = req.body;

//     if (!prompt || !prompt.trim()) {
//         return res.status(400).json({ success: false, message: "Prompt is required" });
//     }

//     const systemPrompt = `You are an expert frontend developer specialising in Tailwind CSS and HTML.
// Your ONLY job is to output a single, self-contained HTML snippet that uses Tailwind CSS utility classes.

// Rules:
// - Output ONLY raw HTML. No markdown, no code fences, no explanations.
// - Use only Tailwind CSS classes for styling (loaded via CDN, so all utilities are available).
// - Do NOT include <html>, <head>, <body>, or <script> tags.
// - The snippet must be visually polished and production-quality.
// - If the user provides existing HTML to modify, improve it according to their instructions while keeping the overall structure intact.`;

//     const userMessage = currentHtml
//         ? `Here is my current HTML component:\n\n${currentHtml}\n\nPlease make the following change: ${prompt}`
//         : `Create a Tailwind CSS HTML component for: ${prompt}`;

//     try {
//         const message = await client.messages.create({
//             model: "claude-opus-4-6",
//             max_tokens: 4096,
//             system: systemPrompt,
//             messages: [{ role: "user", content: userMessage }],
//         });

//         const rawText = message.content
//             .filter((block) => block.type === "text")
//             .map((block) => block.text)
//             .join("");

//         // Strip any accidental markdown code fences the model may have added
//         const html = rawText
//             .replace(/^```[\w]*\n?/gm, "")
//             .replace(/```$/gm, "")
//             .trim();

//         return res.status(200).json({ success: true, html });
//     } catch (error) {
//         console.error("AI generate error:", error);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// });

// export default router;



import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { ensureAuthAPI } from "../middlewares/auth.js";
import dotenv from "dotenv";
dotenv.config();
const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
 * Streams Claude response as Server-Sent Events.
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
        const stream = client.messages.stream({
            model: "claude-opus-4-6",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                sendEvent({ type: "delta", text: event.delta.text });
            }
        }

        sendEvent({ type: "done" });
    } catch (error) {
        console.error("AI stream error:", error);
        sendEvent({ type: "error", message: error.message });
    } finally {
        res.end();
    }
});

export default router;