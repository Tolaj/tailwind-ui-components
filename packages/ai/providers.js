// The two places a model can run: Anthropic's API, or a local server that speaks the OpenAI chat format.
// `settings` is { provider: "anthropic" | "local", anthropicApiKey, localLlmUrl }.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-haiku-4-5-20251001";

/** What to tell the user about a failed call. */
export function explainError(error) {
    if (error.status === 404) return "Model not found. Check that your API key has billing enabled at console.anthropic.com and credits are loaded.";
    if (error.status === 401) return "Invalid API key. Please check your key in Settings.";
    if (error.status === 429) return "Rate limit exceeded. Please wait and try again.";
    return error.message;
}

/**
 * The reply as it is written: events { type: "delta", text } and a final { type: "done" }, or { type: "error", message }.
 * Never throws.
 */
export async function* streamCompletion(settings, { system, user }) {
    const { provider, anthropicApiKey, localLlmUrl } = settings;
    try {
        if (provider === "anthropic") {
            if (!anthropicApiKey) { yield { type: "error", message: "Anthropic API key not configured" }; return; }
            const client = new Anthropic({ apiKey: anthropicApiKey });
            const stream = client.messages.stream({ model: MODEL, max_tokens: 4096, system, messages: [{ role: "user", content: user }] });
            for await (const event of stream) {
                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") yield { type: "delta", text: event.delta.text };
            }
            yield { type: "done" };
            return;
        }
        if (!localLlmUrl) { yield { type: "error", message: "Local LLM URL not configured" }; return; }
        const response = await fetch(`${localLlmUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 10000, temperature: 1, stream: true }),
        });
        if (!response.ok) throw new Error(`LLM server error: ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value, { stream: true }).split("\n").filter((l) => l.startsWith("data: "));
            for (const line of lines) {
                const raw = line.replace("data: ", "").trim();
                if (raw === "[DONE]") { yield { type: "done" }; break; }
                let text;
                try { text = JSON.parse(raw)?.choices?.[0]?.delta?.content; } catch { continue; }
                if (text) yield { type: "delta", text };
            }
        }
    } catch (error) {
        console.error("AI stream error:", error);
        yield { type: "error", message: `Error: ${explainError(error)}` };
    }
}

/** One short reply in a single piece, or null when the provider isn't set up. Throws when the call fails. */
export async function complete(settings, system, user, { maxTokens = 400, temperature = 0.2 } = {}) {
    if (settings.provider === "anthropic") {
        if (!settings.anthropicApiKey) return null;
        const client = new Anthropic({ apiKey: settings.anthropicApiKey });
        const res = await client.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] });
        return res.content.map((b) => b.text || "").join("");
    }
    if (!settings.localLlmUrl) return null;
    const res = await fetch(`${settings.localLlmUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens, temperature, stream: false }),
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
}
