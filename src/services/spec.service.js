import Anthropic from "@anthropic-ai/sdk";
import Component from "../models/component.model.js";
import User from "../models/user.model.js";
import { splitSource } from "../utils/exporters.js";

const COLOR_NAMES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_RE = new RegExp(`^(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|accent|decoration|shadow)-((?:${COLOR_NAMES})-\\d{2,3}|black|white)(?:/\\d+)?$`);
const ARBITRARY_COLOR_RE = /^(?:bg|text|border|ring|from|via|to|fill|stroke)-\[(#[0-9a-fA-F]{3,8})\]$/;
const THEME_COLOR_RE = /^(?:bg|text|border|ring)-(primary|secondary|tertiary)(?:\/\d+)?$/;
const SIZE_RE = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/;
const WEIGHT_RE = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/;
const FAMILY_RE = /^font-(sans|serif|mono)$/;
const RADIUS_RE = /^rounded(?:-[trbl]{1,2})?(?:-(none|sm|md|lg|xl|2xl|3xl|full))?$/;
const SPACING_RE = /^-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.\d+)?)$/;
const SHADOW_RE = /^shadow(?:-(sm|md|lg|xl|2xl|inner|none))?$/;
const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"];

const bump = (map, key, n = 1) => map.set(key, (map.get(key) || 0) + n);
const top = (map, limit = 6) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
const strip = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Deterministic analysis of a component's source. Free, instant, no AI. */
export function extractSpec(code = "") {
    const { markup, css, js } = splitSource(code);

    const colors = new Map(), sizes = new Map(), weights = new Map(), families = new Map();
    const radii = new Map(), spacing = new Map(), shadows = new Map();
    const breakpoints = new Set();
    let dark = false;

    for (const m of code.matchAll(/\bclass(?:Name)?\s*=\s*"([^"]*)"|\bclass(?:Name)?\s*=\s*'([^']*)'/g)) {
        for (const raw of (m[1] ?? m[2]).split(/\s+/).filter(Boolean)) {
            const parts = raw.split(":");
            const cls = parts.pop();
            parts.forEach((v) => {
                if (BREAKPOINTS.includes(v)) breakpoints.add(v);
                if (v === "dark") dark = true;
            });
            let r;
            if ((r = cls.match(COLOR_RE))) bump(colors, r[1]);
            else if ((r = cls.match(ARBITRARY_COLOR_RE))) bump(colors, r[1].toLowerCase());
            else if ((r = cls.match(THEME_COLOR_RE))) bump(colors, r[1]);
            else if (SIZE_RE.test(cls)) bump(sizes, cls.slice(5));
            else if (WEIGHT_RE.test(cls)) bump(weights, cls.slice(5));
            else if (FAMILY_RE.test(cls)) bump(families, cls.slice(5));
            else if ((r = cls.match(RADIUS_RE))) bump(radii, r[1] || "default");
            else if ((r = cls.match(SPACING_RE))) bump(spacing, r[1]);
            else if ((r = cls.match(SHADOW_RE))) bump(shadows, r[1] || "default");
        }
    }

    const count = (re) => (markup.match(re) || []).length;
    const structure = {
        headings: count(/<h[1-6]\b/gi),
        buttons: count(/<button\b/gi),
        links: count(/<a\b/gi),
        images: count(/<img\b/gi),
        forms: count(/<form\b/gi),
        inputs: count(/<(?:input|select|textarea)\b/gi),
        lists: count(/<(?:ul|ol)\b/gi),
        tables: count(/<table\b/gi),
        icons: count(/<svg\b/gi),
        landmarks: ["nav", "header", "footer", "section", "main", "aside"].filter((t) => new RegExp(`<${t}\\b`, "i").test(markup)),
    };

    const scriptSrcs = [...code.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]).filter((s) => !/tailwindcss/i.test(s));
    const stylesheets = [...code.matchAll(/<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const needs = {
        javascript: Boolean(js),
        customCss: Boolean(css),
        externalScripts: scriptSrcs,
        stylesheets,
        alpine: /\bx-data\b/.test(markup),
        htmx: /\bhx-[a-z]+/.test(markup),
    };

    const slots = {
        headings: [...markup.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map((m) => strip(m[1])).filter(Boolean).slice(0, 5),
        buttons: [...markup.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => strip(m[1])).filter(Boolean).slice(0, 5),
        imageCount: structure.images,
        linkCount: structure.links,
    };

    return {
        tokens: {
            colors: top(colors, 8),
            fontSizes: top(sizes, 5),
            fontWeights: top(weights, 4),
            fontFamilies: top(families, 3),
            radius: top(radii, 4),
            spacing: top(spacing, 6),
            shadows: top(shadows, 3),
        },
        structure,
        needs,
        slots,
        responsive: breakpoints.size > 0,
        breakpoints: BREAKPOINTS.filter((b) => breakpoints.has(b)),
        darkMode: dark,
        summary: "",
        useWhen: "",
        avoidWhen: "",
        generatedAt: new Date().toISOString(),
    };
}

/** Recompute the deterministic parts and keep any AI-written text from before. */
export function buildSpec(code, previous) {
    const spec = extractSpec(code);
    if (previous) {
        spec.summary = previous.summary || "";
        spec.useWhen = previous.useWhen || "";
        spec.avoidWhen = previous.avoidWhen || "";
    }
    return spec;
}

const list = (items) => items.map((i) => `${i.name} (${i.count})`).join(", ") || "none";

export function specToMarkdown(component) {
    const s = component.spec || extractSpec(component.htmlCode);
    const st = s.structure;
    const lines = [
        `# ${component.title}`,
        component.description,
        "",
    ];
    if (s.summary) lines.push(`**Summary:** ${s.summary}`);
    if (s.useWhen) lines.push(`**Use when:** ${s.useWhen}`);
    if (s.avoidWhen) lines.push(`**Avoid when:** ${s.avoidWhen}`);
    lines.push(
        "",
        `- **Category:** ${component.category}${component.tags?.length ? `  |  **Tags:** ${component.tags.join(", ")}` : ""}`,
        `- **Version:** v${component.version || 1}`,
        `- **Colors:** ${list(s.tokens.colors)}`,
        `- **Type:** sizes ${list(s.tokens.fontSizes)}; weights ${list(s.tokens.fontWeights)}${s.tokens.fontFamilies.length ? `; families ${list(s.tokens.fontFamilies)}` : ""}`,
        `- **Radius:** ${list(s.tokens.radius)}  |  **Shadows:** ${list(s.tokens.shadows)}`,
        `- **Spacing scale used:** ${list(s.tokens.spacing)}`,
        `- **Structure:** ${st.headings} headings, ${st.buttons} buttons, ${st.links} links, ${st.images} images, ${st.inputs} form fields, ${st.icons} icons${st.landmarks.length ? `; landmarks: ${st.landmarks.join(", ")}` : ""}`,
        `- **Responsive:** ${s.responsive ? `yes (${s.breakpoints.join(", ")})` : "no breakpoints used"}  |  **Dark mode:** ${s.darkMode ? "yes" : "no"}`,
        `- **Needs:** ${[s.needs.javascript && "inline JavaScript", s.needs.customCss && "custom CSS", s.needs.alpine && "Alpine.js", s.needs.htmx && "htmx", ...s.needs.externalScripts, ...s.needs.stylesheets].filter(Boolean).join(", ") || "nothing beyond Tailwind"}`,
    );
    if (s.slots.headings.length) lines.push(`- **Editable text:** headings ${s.slots.headings.map((h) => `"${h}"`).join(", ")}${s.slots.buttons.length ? `; buttons ${s.slots.buttons.map((b) => `"${b}"`).join(", ")}` : ""}`);
    return lines.join("\n");
}

// ── Optional AI-written summary (uses the owner's own AI settings) ───────────

const ENRICH_SYSTEM = `You write short metadata for a UI component so other AI tools can decide whether to reuse it.
Reply with ONLY a JSON object: {"summary": string, "useWhen": string, "avoidWhen": string}.
Each value is one plain sentence under 160 characters. No markdown.`;

async function complete(settings, system, userMessage) {
    if (settings.provider === "anthropic") {
        if (!settings.anthropicApiKey) return null;
        const client = new Anthropic({ apiKey: settings.anthropicApiKey });
        const res = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 400,
            system,
            messages: [{ role: "user", content: userMessage }],
        });
        return res.content.map((b) => b.text || "").join("");
    }
    if (!settings.localLlmUrl) return null;
    const res = await fetch(`${settings.localLlmUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: system }, { role: "user", content: userMessage }], max_tokens: 400, temperature: 0.2, stream: false }),
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
}

/** Fire and forget. Never throws, never blocks saving. */
export async function enrichSpecWithAI(componentId, userId) {
    try {
        const user = await User.findById(userId).select("llmSettings").lean();
        if (!user?.llmSettings?.enabled) return;
        const component = await Component.findById(componentId);
        if (!component) return;

        const codeAtStart = component.htmlCode;
        const text = await complete(
            user.llmSettings,
            ENRICH_SYSTEM,
            `Title: ${component.title}\nCategory: ${component.category}\nDescription: ${component.description}\n\nHTML:\n${component.htmlCode.slice(0, 6000)}`
        );
        const json = JSON.parse((text || "").match(/\{[\s\S]*\}/)?.[0] || "null");
        if (!json) return;

        const fresh = await Component.findById(componentId);
        if (!fresh || fresh.htmlCode !== codeAtStart) return;
        fresh.spec = {
            ...(fresh.spec || extractSpec(fresh.htmlCode)),
            summary: String(json.summary || "").slice(0, 240),
            useWhen: String(json.useWhen || "").slice(0, 240),
            avoidWhen: String(json.avoidWhen || "").slice(0, 240),
        };
        await fresh.save();
    } catch (error) {
        console.error("Spec enrichment skipped:", error.message);
    }
}
