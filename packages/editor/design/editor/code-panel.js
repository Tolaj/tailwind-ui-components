import { checkTags } from "../code-view.js";
import { parseComponentSource } from "../../playground/component-source.js";
import { createCodeEditor, tagProblems } from "../code-editor.js";
import { $, S, data, model } from "./base.js";
import { pref } from "./color-ui.js";
import { assemble, commit, loadFrame } from "./docs.js";
import { layout } from "./plane.js";

// ── Code panel (two-way with the canvas) ─────────────────────────────────────
// The editor itself is design/code-editor.js (CodeMirror); this part keeps it and the canvas in step.
let ed = null;          // the code editor, once the panel has been opened
let starting = false;
const codeOpen = () => !$("codePanel").classList.contains("hidden");
export const codeFocused = () => Boolean(ed && ed.hasFocus());
const codeValue = () => (ed ? ed.getValue() : "");
/** Copies text and says so on the button for a moment. */
function copyText(text, btn) {
    const done = (msg) => { if (!btn) return; const was = btn.textContent; btn.textContent = msg; setTimeout(() => { btn.textContent = was; }, 1200); };
    navigator.clipboard.writeText(text).then(() => done("Copied"), () => done("Copy failed"));
}

// ── The selected element, highlighted in the code ───────────────────────────
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
/** Where the element at `path` (element indices from the body down) sits in the markup text: its whole source, and just its opening tag. */
export function elementRange(markup, path) {
    const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    const key = path.join(".");
    const root = { kids: 0, path: [] }, stack = [];
    let m;
    while ((m = re.exec(markup))) {
        if (m[0].startsWith("<!--")) continue;
        const tag = m[2].toLowerCase();
        const end = m.index + m[0].length;
        if (m[1]) {
            const i = stack.map((n) => n.tag).lastIndexOf(tag);
            if (i < 0) continue;
            const node = stack[i];
            stack.length = i;
            if (node.path.join(".") === key) return { start: node.start, openEnd: node.openEnd, end };
            continue;
        }
        const parent = stack[stack.length - 1] || root;
        const node = { tag, start: m.index, openEnd: end, kids: 0, path: [...parent.path, parent.kids++] };
        const lone = VOID_TAGS.has(tag) || m[3].trim().endsWith("/");
        if (lone) { if (node.path.join(".") === key) return { start: node.start, openEnd: end, end }; continue; }
        if (["script", "style", "textarea", "title"].includes(tag)) { const close = markup.toLowerCase().indexOf(`</${tag}`, end); if (close >= 0) re.lastIndex = close; }
        stack.push(node);
    }
    return null;
}
/** Paints the selected element's source in the code (its opening tag darker), and when the selection just changed, scrolls to it. */
export function updateCodeHighlight(reveal) {
    if (!codeOpen() || !ed) return;
    const text = ed.getValue();
    const base = model.markup ? text.indexOf(model.markup) : -1;
    const r = S.selected && S.selected.path && S.selected.path.length && base >= 0 ? elementRange(model.markup, S.selected.path) : null;
    ed.setMarks(r ? [[base + r.start, base + r.end, "sel"], [base + r.start, base + r.openEnd, "selt"]] : []);
    const n = ed.lineCount();
    $("codeLines").textContent = `${n} line${n === 1 ? "" : "s"}`;
    if (reveal && r) ed.reveal(base + r.start);
}

export function syncCode() {
    if (!codeOpen() || !ed) return;
    const next = model.markup.trim() ? assemble() : "";
    const prev = ed.getValue();
    if (prev === next) return updateCodeHighlight(false);
    ed.setValue(next); // keeps the scroll position and the cursor
    // show what changed: the first place the new code differs from the old
    let i = 0;
    while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
    if (prev) ed.reveal(i);
    updateCodeHighlight(false);
}
async function setCodePanel(open) {
    $("codePanel").classList.toggle("hidden", !open);
    $("codePanel").classList.toggle("flex", open);
    $("codeBtn").classList.toggle("on", open);
    if (open && !ed && !starting) {
        starting = true;
        try {
            ed = await createCodeEditor($("codeMount"), {
                value: model.markup.trim() ? assemble() : "", onChange: onCodeInput, problems: tagProblems, onSave: () => $("saveBtn").click(),
                wrap: true, // long class lists wrap instead of scrolling sideways (a narrow panel beside the design would cut off the start of the line)
            });
        } finally { starting = false; }
    }
    if (open && ed) { syncCode(); updateCodeHighlight(true); ed.focus(); }
    layout();
}
let codeTimer = null;
/** Shows the first place the tags don't match up (and returns it), or hides the warning. */
function showCodeProblem() {
    const bad = checkTags(codeValue());
    const w = $("codeWarn");
    w.classList.toggle("hidden", !bad);
    if (bad) { w.textContent = `Line ${bad.line}: ${bad.message}. Not applied until fixed.`; w.dataset.line = String(bad.line); }
    return bad;
}
/** Applies the code to the design now (it waits half a second after typing), unless its tags don't match up. */
function applyCode() {
    clearTimeout(codeTimer);
    codeTimer = null;
    if (showCodeProblem()) return false;
    S.parsed = parseComponentSource(codeValue());
    commit(S.parsed.markup, "code");
    loadFrame();
    return true;
}
/** Typing in the code: the squiggles and the warning show at once; the canvas follows once typing pauses (broken tags are never sent to it, where the browser would "repair" them its own way). */
function onCodeInput() {
    const n = ed.lineCount();
    $("codeLines").textContent = `${n} line${n === 1 ? "" : "s"}`;
    showCodeProblem();
    clearTimeout(codeTimer);
    codeTimer = setTimeout(applyCode, 500);
}
const copyFlash = (btn, msg) => { const was = btn.textContent; btn.textContent = msg; setTimeout(() => { btn.textContent = was; }, 1200); };

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {
    $("codeBtn").addEventListener("click", () => setCodePanel(!codeOpen()));
    $("codeClose").addEventListener("click", () => setCodePanel(false));
    $("codeWarn").addEventListener("click", () => {
        if (!ed) return;
        const [from, to] = ed.lineRange(Number($("codeWarn").dataset.line) || 1);
        ed.select(from, to);
    });
    $("codeCopy").addEventListener("click", (e) => copyText(codeValue(), e.currentTarget));
    $("codeFind").addEventListener("click", () => ed && ed.openSearch());
    // Format: Prettier tidies the whole code (markup, <style> and <script>), as one undo step
    $("codeFormat").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        if (!ed) return;
        const r = await ed.format();
        if (!r.ok) { copyFlash(btn, "Fix the errors first"); return; }
        if (!r.changed) { copyFlash(btn, "Already tidy"); return; }
        applyCode();
        syncCode();
    });
// ── Where the code sits: below the design, or to its left (side by side) ──────────────────────────────────────────────────────────────────
// Below the design by default. The choice is remembered; a design opened with `codeDock` starts there.
let dock = "bottom";
const sectionEl = () => $("canvas").parentElement; // the column that holds the design (and the code, when it is below)
const DOCK_ICON = {
    left: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 4v16"/></svg>',
    bottom: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h18"/></svg>',
};
function setDock(side, remember = true) {
    const panel = $("codePanel"), handle = $("codeResize");
    dock = side;
    if (side === "left") {
        sectionEl().parentElement.insertBefore(panel, sectionEl());
        panel.classList.remove("border-t");
        panel.classList.add("border-r");
        panel.style.height = "";
        panel.style.width = `${Number(pref("wc:codeW")) || 440}px`;
        handle.className = "absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize";
    } else {
        sectionEl().append(panel);
        panel.classList.add("border-t");
        panel.classList.remove("border-r");
        panel.style.width = "";
        panel.style.height = `${Number(pref("wc:codeH")) || 256}px`;
        handle.className = "absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize";
    }
    // the button shows where the code would go next
    $("codeDock").innerHTML = DOCK_ICON[side === "left" ? "bottom" : "left"];
    $("codeDock").title = side === "left" ? "Dock the code below the design" : "Dock the code beside the design (left)";
    if (remember) pref("wc:codeDock", side);
    layout();
}

// Resize: drag the panel's edge (top when below, right when beside); the size is remembered. The handle keeps the pointer
// (setPointerCapture) so the drag follows it over the design's iframe too, which would otherwise take the pointer and leave it stuck.
(() => {
    const panel = $("codePanel"), handle = $("codeResize");
    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        drag = { x: e.clientX, y: e.clientY, w: panel.offsetWidth, h: panel.offsetHeight, side: dock };
        handle.setPointerCapture(e.pointerId);
        document.body.style.cursor = dock === "left" ? "col-resize" : "row-resize";
    });
    handle.addEventListener("pointermove", (e) => {
        if (!drag) return;
        if (drag.side === "left") panel.style.width = `${Math.round(Math.min(innerWidth * 0.7, Math.max(260, drag.w + e.clientX - drag.x)))}px`;
        else panel.style.height = `${Math.round(Math.min(innerHeight * 0.8, Math.max(120, drag.h + drag.y - e.clientY)))}px`;
        layout();
    });
    const end = (e) => {
        if (!drag) return;
        const side = drag.side;
        drag = null;
        document.body.style.cursor = "";
        try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        pref(side === "left" ? "wc:codeW" : "wc:codeH", String(side === "left" ? panel.offsetWidth : panel.offsetHeight));
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("lostpointercapture", end);
    $("codeDock").addEventListener("click", () => setDock(dock === "left" ? "bottom" : "left"));
    setDock(data.codeDock || pref("wc:codeDock") || "bottom", false);
    if (data.codeOpen) setCodePanel(true); // a new component starts with its code open
})();
}
