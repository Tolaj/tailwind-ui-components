import { parseComponentSource, buildPreviewDocument } from "../playground/component-source.js";
import { createDescriptionFromElement } from "../element-description/index.js";
import { agentMain } from "./agent.js";
import { BREAKPOINT_WIDTH, setGroup } from "./class-groups.js";
import { ui, variant, val, renderInspectorHtml, mountDatalists } from "./inspector.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const data = JSON.parse($("designData").textContent);

// Coming from the quick Add Component dialog: pick up the code and details it handed over.
if (!data.id && new URLSearchParams(window.location.search).has("draft")) {
    try {
        const d = JSON.parse(sessionStorage.getItem("wc:draft") || "null");
        if (d) {
            Object.assign(data, {
                htmlCode: d.html || "", title: d.title || "", category: d.category || "", description: d.description || "",
                tags: String(d.tags || "").split(",").map((t) => t.trim()).filter(Boolean), isPublished: d.isPublished !== "false",
            });
            sessionStorage.removeItem("wc:draft");
        }
    } catch { /* ignore a bad draft */ }
    window.history.replaceState({}, "", "/design/new");
}

// Back returns to wherever the editor was opened from (the Library link is the fallback).
try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith("/design")) {
        $("backLink").href = ref.href;
        $("backLink").title = "Back";
        $("backLabel").textContent = "Back";
    }
} catch { /* keep the Library link */ }
let parsed = parseComponentSource(data.htmlCode);
const model = { markup: parsed.markup };
const isTailwindScript = (s) => s.src && /tailwindcss/i.test(s.src);

// ── State ────────────────────────────────────────────────────────────────────
let mode = "edit";
let device = 1280;
let zoom = "fit";
let frameHeight = 600;
let selected = null;
let tree = null;
let history = [];
let hIndex = -1;
let isNew = !data.id;
let savedMarkup = isNew ? "" : parsed.markup;
let lastKey = "";
let lastTime = 0;
const collapsed = new Set();

const frame = $("frame");
const send = (msg) => frame.contentWindow && frame.contentWindow.postMessage(msg, "*");

// ── Documents ────────────────────────────────────────────────────────────────
const scriptTag = (s) =>
    `<script${s.src ? ` src="${esc(s.src)}"` : ""}${s.type ? ` type="${esc(s.type)}"` : ""}${s.defer ? " defer" : ""}>${s.src ? "" : s.text.replace(/<\/script/gi, "<\\/script")}<\/script>`;
const styleTag = (s) => `<style${s.type ? ` type="${esc(s.type)}"` : ""}>${s.text.replace(/<\/style/gi, "<\\/style")}</style>`;

function editDocument() {
    const head = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">'];
    if (!parsed.hasTailwindScript) head.push('<script src="https://cdn.tailwindcss.com"><\/script>');
    else head.push(...parsed.scripts.filter(isTailwindScript).map(scriptTag));
    head.push(...parsed.links, ...parsed.styles.map(styleTag), "<style>html,body{margin:0}</style>");
    const attrs = Object.entries(parsed.bodyAttrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
    return `<!DOCTYPE html><html><head>${head.join("\n")}</head><body${attrs}>${model.markup}<script data-wc-agent>(${agentMain.toString()})()<\/script></body></html>`;
}

/** Rebuilds the component source: original head assets and scripts around the edited markup. */
function assemble() {
    const css = [...parsed.links, ...parsed.styles.map(styleTag)].join("\n");
    const js = parsed.scripts.map(scriptTag).join("\n");
    const bodyAttrs = Object.entries(parsed.bodyAttrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
    if (bodyAttrs) return `<!DOCTYPE html>\n<html>\n<head>\n${css}\n</head>\n<body${bodyAttrs}>\n${model.markup}\n${js}\n</body>\n</html>\n`;
    return [css, model.markup, js].filter(Boolean).join("\n") + "\n";
}

function loadFrame() {
    selected = null;
    renderInspector();
    frame.srcdoc = mode === "edit" ? editDocument() : buildPreviewDocument(parseComponentSource(assemble()), { width: device });
}

// ── History, dirty state, layout ─────────────────────────────────────────────
const isDirty = () => (isNew ? model.markup.trim() !== "" : model.markup !== savedMarkup);

function updateChrome() {
    $("undoBtn").disabled = hIndex <= 0;
    $("redoBtn").disabled = hIndex >= history.length - 1;
    $("saveBtn").disabled = !isDirty();
    $("saveState").textContent = isNew ? (isDirty() ? "Not saved yet" : "") : isDirty() ? "Unsaved changes" : "Saved";
    $("versionBadge").textContent = isNew ? "new" : `v${data.version}`;
    $("titleText").textContent = data.title || "Untitled component";
    document.title = `${data.title || "New component"} | Windcraft design`;
    const empty = model.markup.trim() === "";
    $("startCard").classList.toggle("hidden", !empty || mode !== "edit");
    $("startCard").classList.toggle("flex", empty && mode === "edit");
    if (!codeFocused()) syncCode();
}

function commit(html, key) {
    model.markup = html;
    const now = Date.now();
    if (key && key === lastKey && now - lastTime < 800 && hIndex === history.length - 1) {
        history[hIndex] = html;
    } else {
        history = history.slice(0, hIndex + 1);
        history.push(html);
        hIndex = history.length - 1;
    }
    lastKey = key || "";
    lastTime = now;
    updateChrome();
}

function step(delta) {
    const next = hIndex + delta;
    if (next < 0 || next >= history.length) return;
    hIndex = next;
    model.markup = history[hIndex];
    send({ cmd: "load", html: model.markup, selectPath: selected ? selected.path : null });
    updateChrome();
}

function layout() {
    const canvas = $("canvas");
    const scale = zoom === "fit" ? Math.min(1, (canvas.clientWidth - 48) / device) : Number(zoom);
    const h = Math.max(frameHeight, Math.round((canvas.clientHeight - 80) / scale));
    frame.style.width = `${device}px`;
    frame.style.height = `${h}px`;
    frame.style.transform = scale === 1 ? "none" : `scale(${scale})`;
    const wrap = $("frameWrap");
    $("frameLabel").style.width = `${device * scale}px`;
    $("frameLabel").textContent = `${{ 1280: "Desktop", 768: "Tablet", 390: "Mobile" }[device] || "Custom"}  ·  ${device}  ·  ${Math.round(scale * 100)}%`;
    wrap.style.width = `${device * scale}px`;
    wrap.style.height = `${h * scale}px`;
}

// ── Messages from the frame ──────────────────────────────────────────────────
const inspectorEditing = () => Boolean(document.activeElement && document.activeElement.matches && document.activeElement.matches("[data-live]") && $("inspector").contains(document.activeElement));

window.addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow) return;
    const m = e.data || {};
    if (m.type === "ready") {
        if (!history.length) { history = [m.html]; hIndex = 0; model.markup = m.html; if (!isNew) savedMarkup = m.html; }
        tree = m.tree;
        renderLayers();
        updateChrome();
        layout();
    } else if (m.type === "height" || m.type === "preview-height") {
        frameHeight = m.height;
        layout();
    } else if (m.type === "changed") {
        tree = m.tree;
        if (m.silent) model.markup = m.html;
        else commit(m.html, pendingKey);
        pendingKey = "";
        if (m.info) selected = m.info;
        renderLayers();
        if (!inspectorEditing()) renderInspector();
    } else if (m.type === "selected") {
        selected = m.info;
        renderLayers();
        if (!inspectorEditing()) renderInspector();
    } else if (m.type === "key") {
        handleKey(m);
    }
});

let pendingKey = "";
const cmd = (msg, key = "") => { pendingKey = key; send(msg); };

// ── Layers ───────────────────────────────────────────────────────────────────
const pathKey = (p) => (p || []).join(".");

function layerNode(n, depth) {
    const key = pathKey(n.path);
    const has = n.children.length > 0;
    const isCollapsed = collapsed.has(key);
    const isSel = selected && pathKey(selected.path) === key;
    const row = `<div class="layer-row cursor-pointer gap-1 px-1 ${isSel ? "is-selected" : ""}" style="padding-left:${depth * 12 + 4}px" data-path="${key}" ${n.tag === "body" ? "" : 'draggable="true"'}>
        <span data-caret="${key}" class="inline-flex h-4 w-4 shrink-0 items-center justify-center text-neutral-400">${has ? (isCollapsed ? "▸" : "▾") : ""}</span>
        <span class="shrink-0 font-mono text-[11px] text-neutral-500">${n.tag}</span>
        <span class="truncate text-neutral-800">${esc(n.label)}</span></div>`;
    return row + (has && !isCollapsed ? n.children.map((c) => layerNode(c, depth + 1)).join("") : "");
}

function renderLayers() {
    $("layers").innerHTML = tree ? layerNode(tree, 0) : "";
}

const parsePath = (s) => (s === "" ? [] : s.split(".").map(Number));

$("layers").addEventListener("click", (e) => {
    const caret = e.target.closest("[data-caret]");
    if (caret) {
        const k = caret.dataset.caret;
        collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k);
        return renderLayers();
    }
    const row = e.target.closest("[data-path]");
    if (row) { send({ cmd: "select", path: parsePath(row.dataset.path) }); send({ cmd: "scrollTo", path: parsePath(row.dataset.path) }); }
});
$("layers").addEventListener("mouseover", (e) => { const row = e.target.closest("[data-path]"); if (row) send({ cmd: "hover", path: parsePath(row.dataset.path) }); });
$("layers").addEventListener("mouseleave", () => send({ cmd: "hover", path: null }));

let dragPath = null;
$("layers").addEventListener("dragstart", (e) => { const row = e.target.closest("[data-path]"); if (!row) return; dragPath = row.dataset.path; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragPath); });
const clearDrop = () => document.querySelectorAll(".drop-before,.drop-after,.drop-inside").forEach((r) => r.classList.remove("drop-before", "drop-after", "drop-inside"));
const dropZone = (e, row) => { const r = row.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height; return y < 0.28 ? "before" : y > 0.72 ? "after" : "inside"; };
$("layers").addEventListener("dragover", (e) => {
    const row = e.target.closest("[data-path]");
    if (!row || dragPath === null) return;
    e.preventDefault();
    clearDrop();
    const zone = dropZone(e, row);
    if (row.dataset.path === "" && zone !== "inside") return;
    row.classList.add(`drop-${zone}`);
});
$("layers").addEventListener("dragleave", (e) => { if (!e.relatedTarget || !$("layers").contains(e.relatedTarget)) clearDrop(); });
$("layers").addEventListener("drop", (e) => {
    const row = e.target.closest("[data-path]");
    if (!row || dragPath === null) return;
    e.preventDefault();
    const zone = row.dataset.path === "" ? "inside" : dropZone(e, row);
    clearDrop();
    cmd({ cmd: "moveTo", path: parsePath(dragPath), targetPath: parsePath(row.dataset.path), position: zone });
    dragPath = null;
});
$("layers").addEventListener("dragend", () => { clearDrop(); dragPath = null; });

// ── Inspector (see inspector.js for the controls) ───────────────────────────
const insp = $("inspector");

function renderInspector() {
    const top = insp.scrollTop;
    insp.innerHTML = renderInspectorHtml(selected);
    insp.scrollTop = top;
}

function applyValue(key, value) {
    if (!selected) return;
    const next = setGroup(selected.classes, key, value, variant());
    if (next === null) return renderInspector();
    selected.classes = next;
    cmd({ cmd: "setClasses", path: selected.path, value: next });
}

function applyColor(key, name, op) {
    const o = op === undefined ? (val(selected, key).match(/\/(\d+)$/) || [])[1] || "" : op;
    const base = /^(#|rgb|hsl)/.test(name) ? `[${name.replace(/\s+/g, "_")}]` : name;
    applyValue(key, base ? base + (o && o !== "100" ? `/${o}` : "") : "");
}

function setDevice(w) {
    device = w;
    document.querySelectorAll("#deviceSeg button").forEach((b) => b.classList.toggle("is-on", b.dataset.device === String(w)));
    if (mode === "preview") loadFrame();
    layout();
}

const setClassString = (next) => { selected.classes = next; cmd({ cmd: "setClasses", path: selected.path, value: next }); };

insp.addEventListener("click", (e) => {
    const t = e.target;
    const tab = t.closest("[data-tab]");
    if (tab) { ui.tab = tab.dataset.tab; return renderInspector(); }
    const sec = t.closest("[data-sec]");
    if (sec) { ui.open.has(sec.dataset.sec) ? ui.open.delete(sec.dataset.sec) : ui.open.add(sec.dataset.sec); return renderInspector(); }
    const sg = t.closest("[data-seg]");
    if (sg) return applyValue(sg.dataset.seg, sg.dataset.v);
    const pal = t.closest("[data-pal]");
    if (pal) { ui.palette = ui.palette === pal.dataset.pal ? null : pal.dataset.pal; return renderInspector(); }
    const cv = t.closest("[data-cv]");
    if (cv && ui.palette) return applyColor(ui.palette, cv.dataset.cv);
    const crumb = t.closest("[data-crumb]");
    if (crumb) return send({ cmd: "select", path: parsePath(crumb.dataset.crumb) });
    const rm = t.closest("[data-rm]");
    if (rm && selected) return setClassString(selected.classes.split(/\s+/).filter(Boolean).filter((_, i) => i !== Number(rm.dataset.rm)).join(" "));
    const d = t.closest("[data-do]");
    if (!d || !selected) return;
    const path = selected.path;
    if (d.dataset.do === "up") cmd({ cmd: "move", path, dir: -1 });
    if (d.dataset.do === "down") cmd({ cmd: "move", path, dir: 1 });
    if (d.dataset.do === "duplicate") cmd({ cmd: "duplicate", path });
    if (d.dataset.do === "remove") cmd({ cmd: "remove", path });
    if (d.dataset.do === "ai") askAI();
});

insp.addEventListener("change", (e) => {
    const t = e.target;
    if (!selected) return;
    if (t.matches("[data-g]")) return applyValue(t.dataset.g, t.value.trim());
    if (t.dataset.cname !== undefined) return applyColor(t.dataset.cname, t.value.trim());
    if (t.dataset.cop !== undefined) {
        const name = val(selected, t.dataset.cop).replace(/\/\d+$/, "");
        return name ? applyColor(t.dataset.cop, name, t.value.trim()) : renderInspector();
    }
    if (t.dataset.ccustom !== undefined) return applyColor(t.dataset.ccustom, t.value);
    if (t.matches("[data-bp]")) { ui.bp = t.value; setDevice(BREAKPOINT_WIDTH[ui.bp]); return renderInspector(); }
    if (t.matches("[data-st]")) { ui.st = t.value; return renderInspector(); }
    const stRow = t.closest("[data-stylerow]");
    if (stRow) {
        const css = [...insp.querySelectorAll("[data-stylerow]")]
            .map((r) => { const [k, v] = r.querySelectorAll("input"); return k.value.trim() && v.value.trim() ? `${k.value.trim()}: ${v.value.trim()}` : ""; })
            .filter(Boolean).join("; ");
        return cmd({ cmd: "setAttr", path: selected.path, name: "style", value: css ? css + ";" : null });
    }
    const aRow = t.closest("[data-arow]");
    if (aRow) {
        const [k, v] = aRow.querySelectorAll("input");
        const old = aRow.dataset.old;
        if (old && old !== k.value.trim()) cmd({ cmd: "setAttr", path: selected.path, name: old, value: null });
        if (k.value.trim()) cmd({ cmd: "setAttr", path: selected.path, name: k.value.trim(), value: v.value });
    }
});

insp.addEventListener("input", (e) => {
    if (!selected) return;
    const t = e.target;
    if (t.dataset.field === "text") cmd({ cmd: "setText", path: selected.path, text: t.value }, "text");
    else if (t.dataset.field === "classes") { selected.classes = t.value.trim(); cmd({ cmd: "setClasses", path: selected.path, value: selected.classes }, "classes"); }
    else if (t.dataset.attr) cmd({ cmd: "setAttr", path: selected.path, name: t.dataset.attr, value: t.value === "" ? null : t.value }, `attr-${t.dataset.attr}`);
});

insp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("[data-addclass]") && selected) {
        e.preventDefault();
        const add = e.target.value.split(/\s+/).filter(Boolean);
        if (!add.length) return;
        const cur = selected.classes.split(/\s+/).filter(Boolean);
        setClassString([...cur, ...add.filter((c) => !cur.includes(c))].join(" "));
        e.target.value = "";
    }
});

// ── Ask AI about the selected element ────────────────────────────────────────
async function askAI() {
    const input = $("aiInput");
    const note = $("aiNote");
    const prompt = input.value.trim();
    const say = (msg, bad) => { note.textContent = msg; note.className = `text-[11px] ${bad ? "text-red-700" : "text-neutral-500"}`; };
    if (!prompt) return say("Describe the change first.", true);
    const path = selected.path;
    say("Working...");
    try {
        const res = await fetch("/api/ai/generate-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: `${prompt}\n\nReturn ONLY the full modified HTML of this single element, keeping the same root tag. No explanation and no code fences.`,
                currentHtml: selected.outer,
                useLibrary: false,
            }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "AI request failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", out = "";
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop();
            for (const part of parts) {
                if (!part.startsWith("data:")) continue;
                let ev; try { ev = JSON.parse(part.slice(5)); } catch { continue; }
                if (ev.type === "delta") out += ev.text;
                if (ev.type === "error") throw new Error(ev.message);
            }
        }
        const html = out.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
        if (!html.startsWith("<")) throw new Error("The AI didn't return HTML. Try rephrasing.");
        cmd({ cmd: "replaceOuter", path, html });
        input.value = "";
        say("Applied. Undo with Ctrl/Cmd+Z.");
    } catch (err) {
        say(err.message, true);
    }
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
function setSeg(id, attr, value) {
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle("is-on", b.dataset[attr] === String(value)));
}
$("deviceSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-device]"); if (b) setDevice(Number(b.dataset.device)); });
$("modeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (!b || b.dataset.mode === mode) return;
    mode = b.dataset.mode;
    setSeg("modeSeg", "mode", mode);
    $("inspector").style.opacity = $("layers").style.opacity = mode === "edit" ? "" : "0.4";
    $("inspector").style.pointerEvents = $("layers").style.pointerEvents = mode === "edit" ? "" : "none";
    $("canvasHint").textContent = mode === "edit" ? "Click to select. Double-click text to edit it. Drag layers to reorder." : "Preview: running with its JavaScript. Switch back to Edit to change it.";
    loadFrame();
});
$("zoomSel").addEventListener("change", (e) => { zoom = e.target.value; layout(); });
$("undoBtn").addEventListener("click", () => step(-1));
$("redoBtn").addEventListener("click", () => step(1));
window.addEventListener("resize", layout);

async function save() {
    if (!isDirty()) return;
    if (isNew) return openDetails();
    $("saveBtn").disabled = true;
    $("saveState").textContent = "Saving...";
    try {
        const doc = new DOMParser().parseFromString(model.markup, "text/html");
        const res = await fetch(`/api/components/${data.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                htmlCode: assemble(),
                elementsDescription: [...doc.body.children].map((c) => createDescriptionFromElement(c)),
                note: "Edited in design canvas",
            }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        data.version = json.data.version;
        savedMarkup = model.markup;
        updateChrome();
        $("saveState").textContent = `Saved as v${data.version}`;
    } catch (err) {
        updateChrome();
        $("saveState").textContent = "Save failed";
        alert(err.message || "Could not save");
    }
}
$("saveBtn").addEventListener("click", save);

// ── Keyboard ─────────────────────────────────────────────────────────────────
function handleKey({ key, meta, shift }) {
    if (meta && key === "z") return step(shift ? 1 : -1);
    if (meta && key === "y") return step(1);
    if (meta && key === "s") return save();
    if (!selected || selected.tag === "body") return;
    if (meta && key === "d") return cmd({ cmd: "duplicate", path: selected.path });
    if (key === "delete" || key === "backspace") return cmd({ cmd: "remove", path: selected.path });
}
document.addEventListener("keydown", (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const meta = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (["delete", "backspace"].includes(key) || (meta && ["z", "y", "d", "s"].includes(key))) {
        e.preventDefault();
        handleKey({ key, meta, shift: e.shiftKey });
    }
});
window.addEventListener("beforeunload", (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ""; } });


// ── Code panel (two-way with the canvas) ─────────────────────────────────────
const codeText = $("codeText");
const codeOpen = () => !$("codePanel").classList.contains("hidden");
const codeFocused = () => document.activeElement === codeText;
function syncCode() { if (codeOpen()) codeText.value = model.markup.trim() ? assemble() : ""; }
function setCodePanel(open) {
    $("codePanel").classList.toggle("hidden", !open);
    $("codePanel").classList.toggle("flex", open);
    $("codeBtn").classList.toggle("bg-neutral-100", open);
    if (open) { syncCode(); codeText.focus(); }
    layout();
}
$("codeBtn").addEventListener("click", () => setCodePanel(!codeOpen()));
$("codeClose").addEventListener("click", () => setCodePanel(false));
let codeTimer = null;
codeText.addEventListener("input", () => {
    clearTimeout(codeTimer);
    codeTimer = setTimeout(() => {
        parsed = parseComponentSource(codeText.value);
        commit(parsed.markup, "code");
        loadFrame();
    }, 500);
});

// ── Add menu: build from blocks ──────────────────────────────────────────────
const BLOCKS = [
    ["Section", '<section class="p-10"><h2 class="text-2xl font-bold">Section title</h2><p class="mt-2 text-gray-600">Describe this section.</p></section>'],
    ["Container", '<div class="mx-auto max-w-5xl p-6"></div>'],
    ["Columns (2)", '<div class="grid grid-cols-1 gap-6 md:grid-cols-2"><div class="p-6">Column one</div><div class="p-6">Column two</div></div>'],
    ["Heading", '<h2 class="text-3xl font-bold">Heading</h2>'],
    ["Text", '<p class="text-gray-600">Write something here.</p>'],
    ["Button", '<a href="#" class="inline-block rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white">Button</a>'],
    ["Image", '<img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=60" alt="Image" class="rounded-lg">'],
    ["Card", '<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h3 class="font-semibold">Card title</h3><p class="mt-1 text-sm text-gray-600">Card text.</p></div>'],
    ["Input", '<input type="text" placeholder="Type here" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">'],
];
const CONTAINERS = new Set(["body", "div", "section", "header", "footer", "main", "nav", "ul", "ol", "form", "article", "aside"]);
$("addMenu").innerHTML = BLOCKS.map(([name], i) => `<button type="button" data-block="${i}" class="block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-neutral-100">${name}</button>`).join("");
$("addBtn").addEventListener("click", (e) => { e.stopPropagation(); $("addMenu").classList.toggle("hidden"); });
document.addEventListener("click", () => $("addMenu").classList.add("hidden"));
$("addMenu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-block]");
    if (!b) return;
    const html = BLOCKS[Number(b.dataset.block)][1];
    if (model.markup.trim() === "" || !selected) {
        if (model.markup.trim() === "") { addToEmpty(html); return; }
        return cmd({ cmd: "insert", path: [], html, position: "inside" });
    }
    cmd({ cmd: "insert", path: selected.path, html, position: CONTAINERS.has(selected.tag) ? "inside" : "after" });
});
function addToEmpty(html) {
    model.markup = html;
    commit(html);
    loadFrame();
}

// ── Start screen: AI draft, paste, or a section ──────────────────────────────
$("startBlank").addEventListener("click", () => addToEmpty(BLOCKS[0][1]));
$("startPaste").addEventListener("click", () => setCodePanel(true));

async function streamAI(body, onText) {
    const res = await fetch("/api/ai/generate-stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "AI request failed");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", out = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
            if (!part.startsWith("data:")) continue;
            let ev; try { ev = JSON.parse(part.slice(5)); } catch { continue; }
            if (ev.type === "delta") { out += ev.text; onText && onText(out); }
            if (ev.type === "error") throw new Error(ev.message);
        }
    }
    return out.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
}

$("startGo").addEventListener("click", async () => {
    const prompt = $("startPrompt").value.trim();
    const note = $("startNote");
    const say = (msg, bad) => { note.textContent = msg; note.className = `mt-2 text-xs ${bad ? "text-red-700" : "text-neutral-500"}`; };
    if (!prompt) return say("Describe what you want first.", true);
    $("startGo").disabled = true;
    say("Drafting...");
    try {
        const html = await streamAI({ prompt, useLibrary: true });
        if (!html.startsWith("<")) throw new Error("The AI didn't return HTML. Try rephrasing.");
        parsed = parseComponentSource(html);
        commit(parsed.markup);
        loadFrame();
        if (!data.title) { data.title = prompt.slice(0, 60); updateChrome(); }
        $("startPrompt").value = "";
        say("");
    } catch (err) {
        say(err.message, true);
    } finally {
        $("startGo").disabled = false;
    }
});

// ── Details dialog: name, category, tags, visibility ─────────────────────────
const dlg = $("detailsDlg");
$("dCategory").innerHTML += (data.categories || []).map((g) => `<optgroup label="${esc(g.group)}">${g.items.map((i) => `<option value="${i.slug}">${esc(i.name)}</option>`).join("")}</optgroup>`).join("");

function openDetails() {
    $("dTitle").value = data.title || "";
    $("dCategory").value = data.category || "";
    $("dDesc").value = data.description || "";
    $("dTags").value = (data.tags || []).join(", ");
    $("dVis").value = String(data.isPublished);
    $("detailsTitle").textContent = isNew ? "Name and save your component" : "Component details";
    $("detailsSave").textContent = isNew ? "Create component" : "Save details";
    $("detailsError").classList.add("hidden");
    dlg.showModal();
}
$("detailsBtn").addEventListener("click", openDetails);
$("detailsCancel").addEventListener("click", () => dlg.close());

$("detailsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fields = { title: $("dTitle").value.trim(), category: $("dCategory").value, description: $("dDesc").value.trim(), tags: $("dTags").value, isPublished: $("dVis").value };
    if (!fields.title || !fields.category || !fields.description) return;
    const err = $("detailsError");
    $("detailsSave").disabled = true;
    try {
        let res;
        if (isNew) {
            const doc = new DOMParser().parseFromString(model.markup, "text/html");
            res = await fetch("/api/components", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fields, htmlCode: assemble(), elementsDescription: [...doc.body.children].map((c) => createDescriptionFromElement(c)) }),
            });
        } else {
            res = await fetch(`/api/components/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
        }
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        Object.assign(data, { title: fields.title, category: fields.category, description: fields.description, tags: fields.tags.split(",").map((t) => t.trim()).filter(Boolean), isPublished: fields.isPublished === "true" });
        if (isNew) {
            data.id = json.data._id;
            data.version = json.data.version || 1;
            isNew = false;
            savedMarkup = model.markup;
            window.history.replaceState({}, "", `/design/${data.id}`);
        }
        dlg.close();
        updateChrome();
    } catch (error) {
        err.textContent = error.message || "Could not save";
        err.classList.remove("hidden");
    } finally {
        $("detailsSave").disabled = false;
    }
});

// ── Go ───────────────────────────────────────────────────────────────────────
mountDatalists();
updateChrome();
renderInspector();
loadFrame();
