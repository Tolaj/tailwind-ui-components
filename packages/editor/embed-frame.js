// The editor's side of embedEditor() (embed.js): it runs inside the iframe, takes its settings from the embedding page, asks that page's
// host for saving through messages, and reports changes back. See embed.js for the messages.
import { mountEditor } from "./index.js";

const parentWin = window.parent;
const post = (msg) => parentWin.postMessage({ wc: "editor", ...msg }, "*");
let seq = 0;
const waiting = new Map();

/** A host whose methods are answered by the embedding page. */
const proxyHost = (names) => Object.fromEntries(names.map((name) => [name, (...args) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    post({ t: "rpc", id, method: name, args: args.filter((a) => typeof a !== "function") });
})]));

let api = null;
addEventListener("message", async (e) => {
    const m = e.data;
    if (e.source !== parentWin || !m || m.wc !== "host") return;
    if (m.t === "init") {
        api = await mountEditor(document.getElementById("root"), {
            host: proxyHost(m.hostMethods), data: m.data, ui: { ...m.ui, onDetails: (fields) => post({ t: "details", fields }) }, tailwind: m.tailwind !== false,
        });
        api.onChange((state) => post({ t: "change", state }));
        post({ t: "mounted", html: api.getHtml(), details: api.details() });
    } else if (m.t === "rpcResult") {
        const w = waiting.get(m.id);
        waiting.delete(m.id);
        if (w) m.ok ? w.resolve(m.value) : w.reject(new Error(m.error));
    } else if (api && m.t === "setHtml") api.setHtml(m.html);
    else if (api && m.t === "save") api.save();
    else if (api && m.t === "release") api.release();
    else if (api && m.t === "saveDetails") {
        try { await api.saveDetails(m.fields); post({ t: "detailsResult", id: m.id, ok: true }); } catch (err) { post({ t: "detailsResult", id: m.id, ok: false, error: err.message || "Could not save" }); }
    }
});
post({ t: "ready" });
