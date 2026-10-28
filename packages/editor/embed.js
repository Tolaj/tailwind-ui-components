// embedEditor(container, options): the editor inside a container of your page, isolated in an iframe (its own keys, zoom and styles), with
// the same object mountEditor() gives back. Several can be on one page. The page that embeds it keeps the host (saving) and, if it likes,
// the code and the details form.
//
//   const ed = await embedEditor(el, { host, data: { htmlCode }, ui: { panels: false, nav: false }, onDetails: (fields) => showMyForm(fields) });
//   ed.onChange(({ html, dirty, status, source }) => ...);   ed.setHtml(html);   ed.save();   await ed.saveDetails(fields);   ed.destroy();
//
// options.src   where the editor's embed.html is served (default: next to this file); it needs the same import map as any editor page
//               (see embed.html). options.tailwind false when the iframe page already has Tailwind.
const here = (path) => new URL(path, import.meta.url).href;

/**
 * @param {HTMLElement} container
 * @param {{ host: import("./design/host.js").Host, data?: object, ui?: object, src?: string, tailwind?: boolean, onDetails?: (fields: object) => void }} options
 */
export function embedEditor(container, { host, data = {}, ui = {}, src = here("./embed.html"), tailwind = true, onDetails }) {
    const iframe = Object.assign(document.createElement("iframe"), { src, title: "Design editor" });
    iframe.style.cssText = "width:100%;height:100%;border:0;display:block";
    container.append(iframe);
    const listeners = new Set();
    const pending = new Map();
    let seq = 0, html = String(data.htmlCode || ""), dirty = false, status = "", details = null;
    const tell = (msg) => iframe.contentWindow && iframe.contentWindow.postMessage({ wc: "host", ...msg }, "*");

    let mountedOk;
    const mounted = new Promise((resolve) => { mountedOk = resolve; });
    const onMessage = async (e) => {
        const m = e.data;
        if (e.source !== iframe.contentWindow || !m || m.wc !== "editor") return;
        if (m.t === "ready") tell({ t: "init", data, ui, tailwind, hostMethods: Object.keys(host).filter((k) => typeof host[k] === "function") });
        else if (m.t === "mounted") { html = m.html; details = m.details; mountedOk(); }
        else if (m.t === "change") { ({ html, dirty, status } = m.state); listeners.forEach((fn) => fn(m.state)); }
        else if (m.t === "details") onDetails && onDetails(m.fields);
        else if (m.t === "rpc") {
            try { tell({ t: "rpcResult", id: m.id, ok: true, value: await host[m.method](...m.args) }); }
            catch (err) { tell({ t: "rpcResult", id: m.id, ok: false, error: (err && err.message) || String(err) }); }
        } else if (m.t === "detailsResult") {
            const p = pending.get(m.id);
            pending.delete(m.id);
            if (p) m.ok ? p.resolve() : p.reject(new Error(m.error));
        }
    };
    addEventListener("message", onMessage);

    return {
        /** Resolves when the editor has opened the design. */
        ready: mounted,
        getHtml: () => html,
        setHtml: (value) => { html = String(value); tell({ t: "setHtml", html }); },
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        isDirty: () => dirty,
        status: () => status,
        details: () => details,
        save: () => tell({ t: "save" }),
        release: () => tell({ t: "release" }),
        saveDetails: (fields) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); tell({ t: "saveDetails", id, fields }); }),
        destroy() { removeEventListener("message", onMessage); iframe.remove(); listeners.clear(); },
    };
}
