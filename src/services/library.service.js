import Component from "../models/component.model.js";

const STOP = new Set(["a", "an", "the", "for", "with", "and", "or", "to", "of", "in", "on", "make", "create", "build", "add", "new", "that", "this", "my", "me", "please", "component"]);

const words = (text) => String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Keyword-ranked search over one user's library. */
export async function searchLibrary(userId, { query = "", tag = "", limit = 10, referenceOnly = false } = {}) {
    const filter = { createdBy: userId };
    if (referenceOnly) filter.useAsReference = { $ne: false };
    if (tag) filter.tags = String(tag).toLowerCase();
    const all = await Component.find(filter).select("title description category tags version htmlCode updatedAt").sort("-updatedAt").lean();

    const terms = words(query);
    if (!terms.length) return all.slice(0, limit);

    return all
        .map((c) => {
            const haystack = `${c.title} ${c.description} ${c.category} ${(c.tags || []).join(" ")}`.toLowerCase();
            const titleHay = `${c.title} ${(c.tags || []).join(" ")}`.toLowerCase();
            const score = terms.reduce((n, t) => n + (haystack.includes(t) ? 1 : 0) + (titleHay.includes(t) ? 2 : 0), 0);
            return { c, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((r) => r.c);
}
