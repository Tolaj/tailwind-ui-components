import { parseComponentSource, buildPreviewDocument } from "../playground/component-source.js";
import { createDescriptionFromElement } from "../element-description/index.js";
import { agentMain } from "./agent.js";
import { HUES, SHADES, getGroup, setGroup } from "./class-groups.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const data = JSON.parse($("designData").textContent);
const parsed = parseComponentSource(data.htmlCode);
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
let savedMarkup = parsed.markup;
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
const isDirty = () => model.markup !== savedMarkup;

function updateChrome() {
    $("undoBtn").disabled = hIndex <= 0;
    $("redoBtn").disabled = hIndex >= history.length - 1;
    $("saveBtn").disabled = !isDirty();
    $("saveState").textContent = isDirty() ? "Unsaved changes" : "Saved";
    $("versionBadge").textContent = `v${data.version}`;
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
    wrap.style.width = `${device * scale}px`;
    wrap.style.height = `${h * scale}px`;
}

// ── Messages from the frame ──────────────────────────────────────────────────
const inspectorEditing = () => $("inspector").contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

window.addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow) return;
    const m = e.data || {};
    if (m.type === "ready") {
        if (!history.length) { history = [m.html]; hIndex = 0; model.markup = m.html; savedMarkup = m.html; }
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
    const row = `<div class="layer-row flex cursor-pointer items-center gap-1 rounded px-1 py-[3px] ${isSel ? "is-selected" : "hover:bg-neutral-100"}" style="padding-left:${depth * 12 + 4}px" data-path="${key}" ${n.tag === "body" ? "" : 'draggable="true"'}>
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

// ── Inspector ────────────────────────────────────────────────────────────────
const SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
const WEIGHTS = ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"];
const STEPS = ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"];
const RADII = [["none", "None"], ["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["xl", "XL"], ["2xl", "2XL"], ["3xl", "3XL"], ["full", "Full"]];
const SHADOWS = ["sm", "md", "lg", "xl", "2xl"];

const section = (title, body) => `<div class="border-b border-neutral-200 p-3"><p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">${title}</p><div class="space-y-2">${body}</div></div>`;
const row = (label, control) => `<label class="flex items-center gap-2"><span class="w-16 shrink-0 text-neutral-500">${label}</span><div class="min-w-0 flex-1">${control}</div></label>`;

function select(group, current, options, prefix) {
    const opts = [`<option value="">-</option>`, ...options.map(([v, label]) => `<option value="${prefix}${v}" ${current === `${prefix}${v}` ? "selected" : ""}>${label}</option>`)].join("");
    return `<select class="field" data-group="${group}">${opts}</select>`;
}
const simple = (arr) => arr.map((v) => [v, v]);

function segmented(group, current, items) {
    return `<div class="seg flex overflow-hidden rounded-md border border-neutral-300">${items.map(([value, label], i) =>
        `<button type="button" data-act="class" data-group="${group}" data-value="${current === value ? "" : value}" class="flex-1 px-1.5 py-1 text-[11px] ${i ? "border-l border-neutral-300" : ""} ${current === value ? "is-on" : ""}">${label}</button>`).join("")}</div>`;
}

function palette(group, prefix, current) {
    const swatch = (name, bg) => `<button type="button" title="${name}" data-act="class" data-group="${group}" data-value="${current === `${prefix}${name}` ? "" : `${prefix}${name}`}" class="swatch ${bg} ${current === `${prefix}${name}` ? "is-on" : ""}"></button>`;
    const special = [["black", "bg-black"], ["white", "bg-white"], ["transparent", "swatch-t"]];
    const hues = HUES.map((h) => `<div class="flex gap-1">${SHADES.map((s) => swatch(`${h}-${s}`, `bg-${h}-${s}`)).join("")}</div>`).join("");
    return `<div class="flex flex-wrap gap-1">${special.map(([n, bg]) => swatch(n, bg)).join("")}</div><div class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">${hues}</div>`;
}

function renderInspector() {
    const el = $("inspector");
    if (!selected) {
        el.innerHTML = `<div class="p-4 text-neutral-500">Select an element on the canvas, or in Layers, to edit it.</div>`;
        return;
    }
    const s = selected;
    const c = s.classes;
    const g = (k) => getGroup(c, k);
    const isBody = s.tag === "body";
    const crumbs = s.crumbs.map((cr, i) => `<button type="button" data-crumb="${pathKey(cr.path)}" class="rounded px-1 hover:bg-neutral-100 ${i === s.crumbs.length - 1 ? "font-semibold text-neutral-900" : "text-neutral-500"}">${cr.tag}</button>`).join('<span class="text-neutral-300">/</span>');

    const attrFields = [];
    if (s.tag === "img") attrFields.push(["src", "Image URL"], ["alt", "Alt text"]);
    if (s.tag === "a") attrFields.push(["href", "Link"], ["target", "Target"]);
    if (["input", "textarea"].includes(s.tag)) attrFields.push(["placeholder", "Placeholder"], ["type", "Type"], ["value", "Value"]);
    if (s.tag === "button") attrFields.push(["type", "Type"]);
    attrFields.push(["id", "ID"]);

    const content =
        (s.leaf && !["img", "input", "hr", "br"].includes(s.tag) ? `<textarea class="field" rows="3" data-field="text" placeholder="Text">${esc(s.text)}</textarea>` : "") +
        attrFields.map(([a, label]) => row(label, `<input class="field" data-attr="${a}" value="${esc(s.attrs[a] || "")}">`)).join("");

    el.innerHTML =
        `<div class="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 px-3 py-2 text-[11px]">${crumbs}</div>` +
        (isBody ? "" : `<div class="flex gap-1 border-b border-neutral-200 p-2">
            <button type="button" data-do="up" class="h-7 flex-1 rounded-md border border-neutral-300 text-[11px] hover:bg-neutral-50" title="Move earlier">Up</button>
            <button type="button" data-do="down" class="h-7 flex-1 rounded-md border border-neutral-300 text-[11px] hover:bg-neutral-50" title="Move later">Down</button>
            <button type="button" data-do="duplicate" class="h-7 flex-1 rounded-md border border-neutral-300 text-[11px] hover:bg-neutral-50" title="Ctrl/Cmd+D">Duplicate</button>
            <button type="button" data-do="remove" class="h-7 flex-1 rounded-md border border-neutral-300 text-[11px] text-red-700 hover:bg-red-50" title="Delete">Delete</button></div>`) +
        section("Ask AI", `<textarea id="aiInput" class="field" rows="2" placeholder="e.g. make this a dark card with a larger title"></textarea><button type="button" data-do="ai" class="h-8 w-full rounded-md bg-black text-[12px] font-medium text-white hover:bg-neutral-800">Apply to this element</button><p id="aiNote" class="hidden text-[11px]"></p>`) +
        (content ? section("Content", content) : "") +
        section("Typography",
            row("Size", select("fontSize", g("fontSize"), simple(SIZES), "text-")) +
            row("Weight", select("fontWeight", g("fontWeight"), simple(WEIGHTS), "font-")) +
            row("Align", segmented("textAlign", g("textAlign"), [["text-left", "Left"], ["text-center", "Center"], ["text-right", "Right"]])) +
            `<p class="text-neutral-500">Color</p>${palette("textColor", "text-", g("textColor"))}`) +
        section("Fill", palette("bgColor", "bg-", g("bgColor"))) +
        section("Spacing",
            row("Padding", select("p", g("p"), simple(STEPS), "p-")) +
            row("Pad X", select("px", g("px"), simple(STEPS), "px-")) +
            row("Pad Y", select("py", g("py"), simple(STEPS), "py-")) +
            row("Top", select("mt", g("mt"), simple(STEPS), "mt-")) +
            row("Bottom", select("mb", g("mb"), simple(STEPS), "mb-")) +
            row("Gap", select("gap", g("gap"), simple(STEPS), "gap-"))) +
        section("Shape",
            row("Radius", select("radius", g("radius"), RADII, "rounded-")) +
            row("Shadow", select("shadow", g("shadow"), simple(SHADOWS), "shadow-")) +
            row("Border", select("borderWidth", g("borderWidth"), [["", "1px"], ["-2", "2px"], ["-4", "4px"]], "border")) +
            `<p class="text-neutral-500">Border color</p>${palette("borderColor", "border-", g("borderColor"))}`) +
        section("Layout",
            row("Display", select("display", g("display"), simple(["block", "flex", "grid", "inline-block", "hidden"]), "")) +
            row("Direction", segmented("flexDir", g("flexDir"), [["flex-row", "Row"], ["flex-col", "Column"]])) +
            row("Justify", select("justify", g("justify"), simple(["start", "center", "end", "between", "around", "evenly"]), "justify-")) +
            row("Align", select("items", g("items"), simple(["start", "center", "end", "stretch", "baseline"]), "items-")) +
            row("Width", select("width", g("width"), simple(["auto", "full", "fit", "screen", "1/2", "1/3", "2/3", "1/4", "3/4"]), "w-"))) +
        section("Classes", `<textarea class="field" rows="4" data-field="classes" spellcheck="false">${esc(c)}</textarea>`);
}

function applyGroup(group, value) {
    const next = setGroup(selected.classes, group, value);
    selected.classes = next;
    cmd({ cmd: "setClasses", path: selected.path, value: next });
}

$("inspector").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act='class']");
    if (b) return applyGroup(b.dataset.group, b.dataset.value);
    const crumb = e.target.closest("[data-crumb]");
    if (crumb) return send({ cmd: "select", path: parsePath(crumb.dataset.crumb) });
    const d = e.target.closest("[data-do]");
    if (!d || !selected) return;
    const path = selected.path;
    if (d.dataset.do === "up") cmd({ cmd: "move", path, dir: -1 });
    if (d.dataset.do === "down") cmd({ cmd: "move", path, dir: 1 });
    if (d.dataset.do === "duplicate") cmd({ cmd: "duplicate", path });
    if (d.dataset.do === "remove") cmd({ cmd: "remove", path });
    if (d.dataset.do === "ai") askAI();
});
$("inspector").addEventListener("change", (e) => {
    if (e.target.matches("select[data-group]")) applyGroup(e.target.dataset.group, e.target.value);
});
$("inspector").addEventListener("input", (e) => {
    if (!selected) return;
    const t = e.target;
    if (t.dataset.field === "text") cmd({ cmd: "setText", path: selected.path, text: t.value }, "text");
    else if (t.dataset.field === "classes") { selected.classes = t.value.trim(); cmd({ cmd: "setClasses", path: selected.path, value: selected.classes }, "classes"); }
    else if (t.dataset.attr) cmd({ cmd: "setAttr", path: selected.path, name: t.dataset.attr, value: t.value }, `attr-${t.dataset.attr}`);
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
$("deviceSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-device]");
    if (!b) return;
    device = Number(b.dataset.device);
    setSeg("deviceSeg", "device", device);
    if (mode === "preview") loadFrame();
    layout();
});
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

// ── Go ───────────────────────────────────────────────────────────────────────
updateChrome();
renderInspector();
loadFrame();
