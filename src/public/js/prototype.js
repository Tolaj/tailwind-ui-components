// The prototype page (/prototype/<link>): a project's pages one at a time, full screen. Anyone with the link can open it; the owner can
// make (or stop) the link with Share.
import { setPreviewTheme } from "@windcraft/editor/playground/component-source.js";
import { createPresenter, SCALE_NAMES } from "@windcraft/editor/design/presenter.js";

const data = JSON.parse(document.getElementById("protoData").textContent);
setPreviewTheme(data.project.theme);

const params = new URLSearchParams(location.search);
const start = Math.max(0, data.items.findIndex((i) => i.id === params.get("page")));
const scaling = SCALE_NAMES.includes(params.get("scaling")) ? params.get("scaling") : ""; // none chosen: the viewer picks by the page's width
let token = data.token, current = { key: data.items[start]?.id, scaling };

const linkFor = () => `${location.origin}/prototype/${token}?page=${encodeURIComponent(current.key)}${current.scaling ? `&scaling=${current.scaling}` : ""}`;

// ── Share: the link to this prototype ────────────────────────────────────────
let pop = null;
const closePop = () => { if (pop) { pop.remove(); pop = null; } };
function openShare(anchor, root) {
    if (pop) return closePop();
    pop = document.createElement("div");
    pop.className = "pv-pop";
    const r = anchor.getBoundingClientRect();
    pop.style.cssText = `top:${Math.max(8, Math.min(r.bottom + 6, innerHeight - 240))}px;left:${Math.max(8, Math.min(innerWidth - 348, r.right - 340))}px;width:340px;padding:14px;`;
    root.appendChild(pop);
    paint();
    const away = (e) => { if (pop && !pop.contains(e.target) && !anchor.contains(e.target)) { closePop(); document.removeEventListener("pointerdown", away, true); } };
    document.addEventListener("pointerdown", away, true);
}
const field = "height:32px;border:1px solid #d4d4d4;border-radius:8px;padding:0 10px;font-size:13px;min-width:0;";
const btn = "height:32px;border-radius:8px;padding:0 12px;font-size:13px;font-weight:500;";
function paint() {
    if (!pop) return;
    if (!token) {
        pop.innerHTML = `<p style="font-size:13px;margin:0 0 4px;font-weight:600">Share this prototype</p>
            <p style="font-size:12px;color:#737373;margin:0 0 12px">Make a link anyone can open. They click through the pages and nothing else: no code, no editing.</p>
            <button type="button" data-make style="${btn}background:#111;color:#fff">Create link</button><p data-err style="font-size:12px;color:#b91c1c;margin:8px 0 0"></p>`;
        pop.querySelector("[data-make]").onclick = async (e) => {
            e.currentTarget.disabled = true;
            try {
                const res = await fetch(`/api/projects/${data.project.id}/prototype-share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: true }) });
                const json = await res.json();
                if (!json.success) throw new Error(json.message || "Could not create the link");
                token = json.token;
                paint();
            } catch (err) { e.currentTarget.disabled = false; pop.querySelector("[data-err]").textContent = err.message; }
        };
        return;
    }
    pop.innerHTML = `<p style="font-size:13px;margin:0 0 4px;font-weight:600">Share this prototype</p>
        <p style="font-size:12px;color:#737373;margin:0 0 10px">Anyone with this link can click through the pages. It starts on the page you are on.</p>
        <div style="display:flex;gap:8px"><input data-url readonly value="${linkFor()}" style="${field}flex:1"><button type="button" data-copy style="${btn}background:#111;color:#fff">Copy link</button></div>
        ${data.owner ? '<button type="button" data-stop style="margin-top:12px;font-size:12px;color:#b91c1c;text-decoration:underline">Stop sharing</button>' : ""}`;
    const input = pop.querySelector("[data-url]");
    input.onfocus = () => input.select();
    pop.querySelector("[data-copy]").onclick = async (e) => {
        const b = e.currentTarget;
        try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand("copy"); }
        b.textContent = "Copied";
        setTimeout(() => { b.textContent = "Copy link"; }, 1400);
    };
    const stop = pop.querySelector("[data-stop]");
    if (stop) stop.onclick = async () => {
        if (!confirm("Stop sharing? The link stops working for everyone who has it.")) return;
        const res = await fetch(`/api/projects/${data.project.id}/prototype-share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: false }) });
        if ((await res.json()).success) { token = ""; paint(); }
    };
}

// ── The viewer ───────────────────────────────────────────────────────────────
if (data.items.length) createPresenter({
    name: data.project.name,
    pages: data.items.map((i) => ({ key: i.id, title: i.title, width: i.width, height: i.height, source: i.htmlCode })),
    start,
    scaling,
    share: { label: "Share", open: openShare, close: closePop },
    onChange({ key, scaling: s }) {
        current = { key, scaling: s };
        const url = new URL(location.href);
        url.searchParams.set("page", key);
        if (s) url.searchParams.set("scaling", s); else url.searchParams.delete("scaling");
        history.replaceState(null, "", url);
        const item = data.items.find((i) => i.id === key);
        document.title = `${item ? item.title + " · " : ""}${data.project.name} (prototype) — Windcraft`;
        if (pop) paint(); // the link starts on the page now shown
    },
});
if (!data.items.length) document.body.insertAdjacentHTML("beforeend", '<p style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#a1a1aa;font-family:sans-serif">Nothing in this project yet.</p>');
