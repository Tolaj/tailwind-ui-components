// What the AI is told. Plain strings and string builders: no calls here.

export const SYSTEM_PROMPT = `You are an expert frontend developer specialising in Tailwind CSS and HTML.
Your ONLY job is to output a single, self-contained HTML snippet that uses Tailwind CSS utility classes.

Rules:
- Output ONLY raw HTML. No markdown, no code fences, no explanations.
- Use only Tailwind CSS classes for styling (loaded via CDN, so all utilities are available).
- Do NOT include <html>, <head>, <body>, or <script> tags.
- The snippet must be visually polished and production-quality.
- If the user provides existing HTML to modify, improve it according to their instructions while keeping the overall structure intact.`;

export const ENRICH_SYSTEM = `You write short metadata for a UI component so other AI tools can decide whether to reuse it.
Reply with ONLY a JSON object: {"summary": string, "useWhen": string, "avoidWhen": string}.
Each value is one plain sentence under 160 characters. No markdown.`;

/**
 * The system prompt for drafting, grounded in the user's own library when there is one.
 * @param {{ references?: { title: string, htmlCode: string }[], tokensMarkdown?: string }} [library]
 */
export function buildGenerateSystem({ references = [], tokensMarkdown = "" } = {}) {
    let system = SYSTEM_PROMPT;
    if (!references.length) return system;
    if (tokensMarkdown) system += `\n\nThis is a summary of the user's design system, derived from their library:\n${tokensMarkdown}`;
    system += `\n\nThe user keeps a design library. These are their existing components. Match their visual language (colors, spacing, radius, typography, class conventions) and reuse their patterns where they fit. Do not copy them verbatim unless asked.\n\n` +
        references.map((c, i) => `--- Reference ${i + 1}: ${c.title} ---\n${c.htmlCode.slice(0, 2500)}`).join("\n\n");
    return system;
}

/** The user's message: a new component, or a change to the HTML they have. */
export function buildUserMessage({ prompt, currentHtml }) {
    return currentHtml
        ? `Here is my current HTML component:\n\n${currentHtml}\n\nPlease make the following change: ${prompt}`
        : `Create a Tailwind CSS HTML component for: ${prompt}`;
}

/** What a component's metadata request says about it. */
export const enrichMessage = ({ title, category, description, htmlCode }) =>
    `Title: ${title}\nCategory: ${category}\nDescription: ${description}\n\nHTML:\n${htmlCode.slice(0, 6000)}`;

/** The model's reply as { summary, useWhen, avoidWhen } (each cut to 240 characters), or null when it is not the JSON asked for. */
export function parseEnrichment(text) {
    let json;
    try { json = JSON.parse((text || "").match(/\{[\s\S]*\}/)?.[0] || "null"); } catch { return null; }
    if (!json) return null;
    return {
        summary: String(json.summary || "").slice(0, 240),
        useWhen: String(json.useWhen || "").slice(0, 240),
        avoidWhen: String(json.avoidWhen || "").slice(0, 240),
    };
}
