// @ts-check
// Windcraft's own host for the editor (see packages/editor/design/host.js): saves through the app's API and keeps the address bar in step.
const JSON_HEADERS = { "Content-Type": "application/json" };

/** One call to the app's API: the saved data, or an Error with the server's reason. */
async function send(method, url, body) {
    const res = await fetch(url, { method, headers: JSON_HEADERS, body: JSON.stringify(body) });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}

/** The AI's reply as the page's HTML, passed on piece by piece to onText as it arrives. */
async function generate(body, onText) {
    const res = await fetch("/api/ai/generate-stream", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "AI request failed");
    if (!res.body) throw new Error("AI request failed");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", out = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
            if (!part.startsWith("data:")) continue;
            let ev; try { ev = JSON.parse(part.slice(5)); } catch { continue; }
            if (ev.type === "delta") { out += ev.text; onText && onText(out); }
            if (ev.type === "error") throw new Error(ev.message);
        }
    }
    return out.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
}

/** @type {import("@windcraft/editor/design/host.js").Host} */
export const appHost = {
    createComponent: (fields) => send("POST", "/api/components", fields),
    updateComponent: (id, fields) => send("PUT", `/api/components/${id}`, fields),
    createProject: async (name) => { const p = await send("POST", "/api/projects", { name }); return { id: p.id, name: p.name }; },
    saveLayout: async (projectId, positions) => {
        try { await fetch(`/api/projects/${projectId}/layout`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ positions }) }); } catch { /* the position stays on screen; the next drag saves it again */ }
    },
    saveLayoutOnExit: (projectId, positions) => {
        if (navigator.sendBeacon) navigator.sendBeacon(`/api/projects/${projectId}/layout`, new Blob([JSON.stringify({ positions })], { type: "application/json" }));
    },
    generate,
    projectUrl: (id) => `/projects/${id}`,
    showDesign: (id) => window.history.replaceState({}, "", id ? `/design/${id}` : "/design/new"),
    openDesign: (id) => { window.location.href = `/design/${id}`; },
    updateFromFigma: async (id) => {
        const res = await fetch(`/design/${id}/update-from-figma`, { method: "POST", headers: JSON_HEADERS });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) throw new Error(body.message || `Could not update the design (the server answered ${res.status})`);
        return body;
    },
};
