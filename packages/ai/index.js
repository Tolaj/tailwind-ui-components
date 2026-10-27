// @windcraft/ai: what Windcraft asks a model, and how it asks. No database and no web framework: the app gives it the user's
// settings and the library references, and gets text back.
//
//   for await (const event of generateStream(settings, { prompt, currentHtml, library })) { ... }   // { type: "delta" | "done" | "error" }
//   const meta = await describeComponent(settings, component)                                       // { summary, useWhen, avoidWhen } | null
import { buildGenerateSystem, buildUserMessage, enrichMessage, parseEnrichment, ENRICH_SYSTEM } from "./prompts.js";
import { streamCompletion, complete } from "./providers.js";

export { SYSTEM_PROMPT, ENRICH_SYSTEM, buildGenerateSystem, buildUserMessage, enrichMessage, parseEnrichment } from "./prompts.js";
export { MODEL, explainError, streamCompletion, complete } from "./providers.js";

/**
 * Drafts a component, or changes the one in `currentHtml`, as a stream of events.
 * @param {object} settings   { provider, anthropicApiKey, localLlmUrl }
 * @param {{ prompt: string, currentHtml?: string, library?: { references?: { title: string, htmlCode: string }[], tokensMarkdown?: string } }} request
 */
export const generateStream = (settings, { prompt, currentHtml, library }) =>
    streamCompletion(settings, { system: buildGenerateSystem(library), user: buildUserMessage({ prompt, currentHtml }) });

/** The short metadata other tools use to decide whether to reuse a component; null when the AI isn't set up or answers badly. */
export async function describeComponent(settings, component) {
    return parseEnrichment(await complete(settings, ENRICH_SYSTEM, enrichMessage(component)));
}
