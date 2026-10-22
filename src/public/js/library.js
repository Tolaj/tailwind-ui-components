import { parseComponentSource, buildPreviewDocument } from "./playground/component-source.js";
import { openForEdit, openForNew } from "./playground/playground-dialog.js";

const items = JSON.parse(document.getElementById("libraryData").textContent);
const grid = document.getElementById("libGrid");
const empty = document.getElementById("libEmpty");
let activeTag = "";
let query = "";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = (msg) => window.showToast?.(msg) ?? console.log(msg);

// ── Cards ────────────────────────────────────────────────────────────────────
const PREVIEW_WIDTH = 1280;

const previewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        previewObserver.unobserve(entry.target);
        mountPreview(entry.target);
    });
}, { rootMargin: "200px" });

function mountPreview(box) {
    const item = items.find((i) => i.id === box.dataset.id);
    if (!item) return;
    const scale = box.clientWidth / PREVIEW_WIDTH;
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("tabindex", "-1");
    frame.title = `${item.title} preview`;
    frame.style.cssText = `width:${PREVIEW_WIDTH}px;height:${box.clientHeight / scale}px;border:0;transform:scale(${scale});transform-origin:0 0;pointer-events:none;background:#fff;`;
    frame.srcdoc = buildPreviewDocument(parseComponentSource(item.htmlCode), { width: PREVIEW_WIDTH });
    box.appendChild(frame);
}

function matches(item) {
    if (activeTag && !item.tags.includes(activeTag)) return false;
    if (!query) return true;
    const hay = `${item.title} ${item.description} ${item.categoryName} ${item.tags.join(" ")}`.toLowerCase();
    return query.split(/\s+/).every((w) => hay.includes(w));
}

const btn = "h-8 rounded-md border border-gray-300 px-2.5 text-[13px] font-medium text-gray-800 hover:bg-gray-50";

function render() {
    const list = items.filter(matches);
    grid.innerHTML = list
        .map((i) => `
        <article class="overflow-hidden rounded-xl border border-gray-200 bg-white" data-card="${i.id}">
            <div class="relative h-52 overflow-hidden border-b border-gray-200 bg-gray-50" data-preview data-id="${i.id}"></div>
            <div class="p-4">
                <div class="flex items-start justify-between gap-2">
                    <h3 class="truncate text-sm font-semibold text-gray-900">${esc(i.title)}</h3>
                    <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">v${i.version}</span>
                </div>
                <p class="mt-1 line-clamp-2 text-[13px] text-gray-500">${esc(i.description)}</p>
                <div class="mt-3 flex flex-wrap items-center gap-1.5">
                    <span class="rounded-full border px-2 py-0.5 text-[11px] font-medium ${i.isPublished ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-600"}">${i.isPublished ? "Public" : "Private"}</span>
                    ${i.forked ? `<span class="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">From gallery</span>` : ""}
                    ${i.tags.map((t) => `<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">${esc(t)}</span>`).join("")}
                </div>
                <label class="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-gray-600" title="When on, AI generation can use this component as a style reference">
                    <input type="checkbox" data-ref="${i.id}" ${i.useAsReference ? "checked" : ""} class="h-3.5 w-3.5 rounded border-gray-300 accent-black">
                    Use as AI reference
                </label>
                <div class="mt-4 flex flex-wrap gap-2">
                    <button class="${btn}" data-act="export" data-id="${i.id}">Export</button>
                    <button class="${btn}" data-act="history" data-id="${i.id}">History</button>
                    <button class="${btn}" data-act="edit" data-id="${i.id}">Edit</button>
                    <button class="${btn} text-red-700 hover:bg-red-50" data-act="delete" data-id="${i.id}">Delete</button>
                </div>
            </div>
        </article>`)
        .join("");
    empty.classList.toggle("hidden", list.length > 0);
    grid.querySelectorAll("[data-preview]").forEach((el) => previewObserver.observe(el));
}

// ── Filters ──────────────────────────────────────────────────────────────────
document.getElementById("libSearch").addEventListener("input", (e) => {
    query = e.target.value.trim().toLowerCase();
    render();
});

document.getElementById("tagBar").addEventListener("click", (e) => {
    const chip = e.target.closest(".tag-chip");
    if (!chip) return;
    activeTag = chip.dataset.tag;
    document.querySelectorAll(".tag-chip").forEach((c) => {
        const on = c === chip;
        c.classList.toggle("bg-black", on);
        c.classList.toggle("text-white", on);
        c.classList.toggle("border-gray-900", on);
        c.classList.toggle("bg-white", !on);
        c.classList.toggle("text-gray-700", !on);
        c.classList.toggle("border-gray-300", !on);
    });
    render();
});

// ── Export + history modal ───────────────────────────────────────────────────
const modal = document.getElementById("libModal");
const codeEl = document.getElementById("libCode");
const historyEl = document.getElementById("libHistory");
const copyBtn = document.getElementById("libCopy");
const tabsEl = document.getElementById("libTabs");
const TABS = [["spec", "Spec"], ["html", "HTML"], ["react", "React"], ["vue", "Vue"], ["svelte", "Svelte"], ["history", "History"]];
const cache = {};
let current = null;

async function showTab(tab) {
    current.tab = tab;
    tabsEl.innerHTML = TABS.map(([k, label]) =>
        `<button data-tab="${k}" class="rounded-md px-3 py-1 text-[13px] font-medium ${k === tab ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}">${label}</button>`).join("");

    const isHistory = tab === "history";
    codeEl.classList.toggle("hidden", isHistory);
    historyEl.classList.toggle("hidden", !isHistory);
    copyBtn.classList.toggle("hidden", isHistory);

    if (isHistory) {
        historyEl.innerHTML = `<p class="p-5 text-sm text-gray-500">Loading…</p>`;
        const res = await fetch(`/api/components/${current.id}/versions`);
        const json = await res.json();
        if (!json.success) { historyEl.innerHTML = `<p class="p-5 text-sm text-red-700">${esc(json.message)}</p>`; return; }
        historyEl.innerHTML = json.data.map((v) => `
            <div class="flex items-center justify-between gap-3 px-5 py-3">
                <div><span class="font-mono text-sm font-medium">v${v.version}</span>
                    <span class="ml-2 text-[13px] text-gray-500">${esc(v.note || (v.current ? "Current" : "Saved version"))}</span></div>
                ${v.current ? `<span class="text-xs text-gray-400">Current</span>` : `<button data-restore="${v.version}" class="${btn}">Restore</button>`}
            </div>`).join("");
        return;
    }

    const key = `${current.id}:${tab}`;
    codeEl.textContent = "Loading…";
    if (!cache[key] && tab === "spec") {
        const res = await fetch(`/api/components/${current.id}/spec`);
        const json = await res.json();
        cache[key] = json.success ? json.markdown : json.message;
    } else if (!cache[key]) {
        const res = await fetch(`/api/components/${current.id}/export?format=${tab}`);
        const json = await res.json();
        cache[key] = json.success ? json.code : json.message;
    }
    if (current.tab === tab) codeEl.textContent = cache[key];
}

const downloadBtn = document.getElementById("libDownload");

async function openGuide() {
    current = { id: "__guide", tab: "guide" };
    document.getElementById("libModalTitle").textContent = "Design guide";
    tabsEl.innerHTML = `<span class="px-2 text-[13px] text-gray-500">Generated from your components. Agents read it with <code class="font-mono">get_design_guide</code>; you can also paste it into a CLAUDE.md.</span>`;
    historyEl.classList.add("hidden");
    codeEl.classList.remove("hidden");
    copyBtn.classList.remove("hidden");
    downloadBtn.classList.remove("hidden");
    downloadBtn.classList.add("inline-flex");
    codeEl.textContent = "Loading…";
    modal.showModal();
    const res = await fetch("/library/design-guide.md");
    codeEl.textContent = await res.text();
}

function openModal(id, tab) {
    downloadBtn.classList.add("hidden");
    downloadBtn.classList.remove("inline-flex");
    const item = items.find((i) => i.id === id);
    current = { id, tab };
    document.getElementById("libModalTitle").textContent = `${item.title}  ·  v${item.version}`;
    modal.showModal();
    showTab(tab);
}

tabsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) showTab(b.dataset.tab);
});
historyEl.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-restore]");
    if (!b) return;
    if (!confirm(`Restore v${b.dataset.restore}? The current version is kept in history.`)) return;
    const res = await fetch(`/api/components/${current.id}/versions/${b.dataset.restore}/restore`, { method: "POST" });
    const json = await res.json();
    if (json.success) location.reload();
    else alert(json.message);
});
copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(codeEl.textContent);
    copyBtn.textContent = "Copied";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
});
document.getElementById("libModalClose").addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

grid.addEventListener("change", async (e) => {
    const box = e.target.closest("[data-ref]");
    if (!box) return;
    const item = items.find((i) => i.id === box.dataset.ref);
    const res = await fetch(`/api/components/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useAsReference: box.checked }),
    });
    const json = await res.json();
    if (json.success) item.useAsReference = box.checked;
    else { box.checked = !box.checked; alert(json.message); }
});

// ── Card actions ─────────────────────────────────────────────────────────────
grid.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.dataset.id;
    const item = items.find((i) => i.id === id);
    if (b.dataset.act === "export") openModal(id, "react");
    if (b.dataset.act === "history") openModal(id, "history");
    if (b.dataset.act === "edit") openForEdit(item);
    if (b.dataset.act === "delete") {
        if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
        const res = await fetch(`/api/components/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json.success) return alert(json.message);
        items.splice(items.indexOf(item), 1);
        render();
    }
});

document.getElementById("guideBtn").addEventListener("click", openGuide);
document.getElementById("newComponentBtn").addEventListener("click", openForNew);

// ── Import designs: drop / choose files (html, zip), paste, optional section split ──
const importModal = document.getElementById("importModal");
const importInput = document.getElementById("importInput");
const dropZone = document.getElementById("dropZone");
const fileList = document.getElementById("importFiles");
const statusEl = document.getElementById("importStatus");
const goBtn = document.getElementById("importGo");
let pending = [];

const setStatus = (msg, kind = "info") => {
    statusEl.textContent = msg;
    statusEl.className = `text-sm ${kind === "error" ? "text-red-700" : "text-gray-600"}`;
    statusEl.classList.toggle("hidden", !msg);
};

function renderPending() {
    fileList.classList.toggle("hidden", !pending.length);
    fileList.innerHTML = pending
        .map((p, i) => `<li class="flex items-center justify-between px-3 py-1.5"><span class="truncate">${esc(p.name)}</span><button type="button" data-drop="${i}" class="ml-3 text-xs text-gray-500 hover:text-red-700">Remove</button></li>`)
        .join("");
}

/** Reads the .html files inside a zip using the browser's built-in inflate. */
async function readZip(file) {
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("Not a valid zip file");
    let p = dv.getUint32(eocd + 16, true);
    const count = dv.getUint16(eocd + 10, true);
    const out = [];
    for (let n = 0; n < count && dv.getUint32(p, true) === 0x02014b50; n++) {
        const method = dv.getUint16(p + 10, true);
        const compSize = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
        const localOffset = dv.getUint32(p + 42, true);
        const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nameLen));
        p += 46 + nameLen + extraLen + commentLen;
        if (!/\.html?$/i.test(name) || name.startsWith("__MACOSX") || name.endsWith("/")) continue;
        const dataStart = localOffset + 30 + dv.getUint16(localOffset + 26, true) + dv.getUint16(localOffset + 28, true);
        const raw = new Blob([buf.slice(dataStart, dataStart + compSize)]);
        const stream = method === 0 ? raw.stream() : raw.stream().pipeThrough(new DecompressionStream("deflate-raw"));
        out.push({ name: name.split("/").pop(), html: await new Response(stream).text() });
    }
    return out;
}

async function addFiles(files) {
    setStatus("");
    for (const file of files) {
        try {
            if (/\.zip$/i.test(file.name)) pending.push(...(await readZip(file)));
            else if (/\.html?$/i.test(file.name) || file.type === "text/html") pending.push({ name: file.name, html: await file.text() });
            else setStatus(`Skipped ${file.name} (only .html and .zip are supported)`, "error");
        } catch (err) {
            setStatus(`${file.name}: ${err.message}`, "error");
        }
    }
    renderPending();
}

document.getElementById("importBtn").addEventListener("click", () => {
    pending = [];
    renderPending();
    setStatus("");
    document.getElementById("pasteHtml").value = "";
    document.getElementById("pasteTitle").value = "";
    importModal.showModal();
});
["importClose", "importCancel"].forEach((id) => document.getElementById(id).addEventListener("click", () => importModal.close()));
importInput.addEventListener("change", async () => { await addFiles([...importInput.files]); importInput.value = ""; });
fileList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-drop]");
    if (b) { pending.splice(Number(b.dataset.drop), 1); renderPending(); }
});
["dragenter", "dragover"].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("border-gray-900", "bg-gray-50"); }));
["dragleave", "drop"].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("border-gray-900", "bg-gray-50"); }));
dropZone.addEventListener("drop", (e) => addFiles([...e.dataTransfer.files]));

goBtn.addEventListener("click", async () => {
    const items = pending.map((p) => ({
        title: /<title[\s>]/i.test(p.html) ? "" : p.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
        html: p.html,
    }));
    const pasted = document.getElementById("pasteHtml").value.trim();
    if (pasted) items.push({ title: document.getElementById("pasteTitle").value.trim(), html: pasted });
    if (!items.length) return setStatus("Add a file or paste some HTML first.", "error");

    goBtn.disabled = true;
    goBtn.textContent = "Importing...";
    try {
        const res = await fetch("/api/components/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items, split: document.getElementById("splitToggle").checked, tags: "imported" }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Import failed");
        const okRows = json.results.filter((r) => r.ok);
        const sections = okRows.reduce((n, r) => n + r.sections.length, 0);
        const failed = json.results.filter((r) => !r.ok);
        setStatus(`Imported ${okRows.length} design${okRows.length === 1 ? "" : "s"} and ${sections} section${sections === 1 ? "" : "s"}.${failed.length ? ` ${failed.length} failed: ${failed.map((f) => f.message).join("; ")}` : ""}`, failed.length ? "error" : "info");
        if (okRows.length) setTimeout(() => location.reload(), failed.length ? 2500 : 900);
    } catch (err) {
        setStatus(err.message, "error");
    } finally {
        goBtn.disabled = false;
        goBtn.textContent = "Import";
    }
});

// ── MCP token ────────────────────────────────────────────────────────────────
document.getElementById("genTokenBtn").addEventListener("click", async () => {
    if (!confirm("Generate a new token? Any previous token stops working.")) return;
    const res = await fetch("/users/api-token", { method: "POST" });
    const json = await res.json();
    if (!json.success) return alert(json.message || "Could not create token");
    document.getElementById("connectCmd").textContent =
        `claude mcp add --transport http tailwind-library ${window.__LIB.mcpUrl} --header "Authorization: Bearer ${json.token}"`;
    document.getElementById("connectBox").classList.remove("hidden");
});
document.getElementById("copyCmdBtn").addEventListener("click", async (e) => {
    await navigator.clipboard.writeText(document.getElementById("connectCmd").textContent);
    e.target.textContent = "Copied";
    setTimeout(() => (e.target.textContent = "Copy"), 1200);
});

render();
