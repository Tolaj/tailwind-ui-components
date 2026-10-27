// A small per-process limiter (the same kind the app already uses for client registration): `key` may do `max` things per `windowMs`.
// It resets when the server restarts and is per server instance, so it stops runaway use rather than guaranteeing a quota.
const hits = new Map();

export function rateLimited(name, key, max, windowMs) {
    const k = `${name}:${key}`, now = Date.now();
    const recent = (hits.get(k) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(k, recent);
    if (hits.size > 20000) hits.clear();
    return recent.length > max;
}

/** Express middleware: answers 429 once `key(req)` is over its limit. */
export const limit = (name, max, windowMs, key = (req) => req.ip) => (req, res, next) =>
    rateLimited(name, key(req) || "?", max, windowMs)
        ? res.status(429).json({ ok: false, message: "Too many requests. Try again in a little while." })
        : next();
