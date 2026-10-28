// A shared project, read-only: every design with a live preview (in the project's theme) and its code to copy.
import { parseComponentSource, buildPreviewDocument, setPreviewTheme } from "@windcraft/editor/playground/component-source.js";
import { themeHead } from "@windcraft/core/theme.js";
import { exportComponent } from "@windcraft/core/exporters.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const data = JSON.parse($("shareData").textContent);
setPreviewTheme(data.project.theme);
const FORMATS = [["html", "HTML"], ["react", "React"], ["vue", "Vue"], ["svelte", "Svelte"]];

const flash = (btn, text) => { const was = btn.textContent; btn.textContent = text; setTimeout(() => { btn.textContent = was; }, 1200); };
$("themeCopy").addEventListener("click", async (e) => { await navigator.clipboard.writeText(themeHead(data.project.theme)); flash(e.currentTarget, "Copied"); });

$("shareList").innerHTML = data.items.map((it) => `
    <section data-item="${it.id}">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div><h2 class="text-xl font-semibold text-gray-900">${esc(it.title)}</h2>${it.description ? `<p class="text-sm text-gray-500">${esc(it.description)}</p>` : ""}</div>
            <div class="flex items-center gap-2">
                <div class="flex items-center rounded-full bg-gray-200 p-1 text-xs font-medium">
                    <button type="button" data-tab="preview" class="rounded-full bg-white px-3 py-1 text-gray-900 shadow">Preview</button>
                    <button type="button" data-tab="code" class="rounded-full px-3 py-1 text-gray-600">Code</button>
                </div>
                <select data-fmt class="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs">${FORMATS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
                <button type="button" data-copy class="h-8 rounded-md bg-black px-3 text-xs font-medium text-white hover:bg-neutral-800">Copy code</button>
            </div>
        </div>
        <div data-preview class="overflow-hidden rounded-xl border border-gray-200 bg-white"><iframe title="${esc(it.title)}" class="block w-full border-0" style="height:300px" data-frame></iframe></div>
        <pre data-code class="hidden max-h-[28rem] overflow-auto rounded-xl bg-slate-900 p-5 text-sm leading-relaxed text-slate-300"><code></code></pre>
    </section>`).join("");

const codeOf = (it, fmt) => (fmt === "html" ? it.htmlCode : exportComponent(it.htmlCode, fmt, it.title.replace(/[^A-Za-z0-9]+/g, " ").trim().replace(/ (\w)/g, (_, c) => c.toUpperCase()) || "Design"));

document.querySelectorAll("[data-item]").forEach((sec) => {
    const it = data.items.find((x) => x.id === sec.dataset.item);
    const frame = sec.querySelector("[data-frame]"), pre = sec.querySelector("[data-code]"), prev = sec.querySelector("[data-preview]"), fmt = sec.querySelector("[data-fmt]");
    frame.onload = () => { // the frame is same-origin: follow its content's height
        const b = frame.contentDocument && frame.contentDocument.body;
        if (!b) return;
        const fit = () => { frame.style.height = `${Math.max(120, b.scrollHeight)}px`; };
        new ResizeObserver(fit).observe(b);
        fit();
    };
    frame.srcdoc = buildPreviewDocument(parseComponentSource(it.htmlCode), {});
    const showCode = () => { pre.querySelector("code").textContent = codeOf(it, fmt.value); };
    sec.addEventListener("click", async (e) => {
        const tab = e.target.closest("[data-tab]");
        if (tab) {
            const code = tab.dataset.tab === "code";
            prev.classList.toggle("hidden", code);
            pre.classList.toggle("hidden", !code);
            sec.querySelectorAll("[data-tab]").forEach((b) => { const on = b === tab; b.className = `rounded-full px-3 py-1 ${on ? "bg-white text-gray-900 shadow" : "text-gray-600"}`; });
            if (code) showCode();
        }
        const copy = e.target.closest("[data-copy]");
        if (copy) { await navigator.clipboard.writeText(codeOf(it, fmt.value)); flash(copy, "Copied"); }
    });
    fmt.addEventListener("change", () => { if (!pre.classList.contains("hidden")) showCode(); });
});
