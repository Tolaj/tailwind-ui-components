import { checkTags } from "../code-view.js";
import { parseComponentSource } from "../../playground/component-source.js";
import { createCodeEditor, tagProblems } from "../code-editor.js";
import { $, S, model } from "./base.js";
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
// Resize: drag the panel's top edge; the height is remembered. The handle keeps the pointer (setPointerCapture) so the drag follows it over the
// design's iframe too, which would otherwise take the pointer and leave the drag stuck.
(() => {
    const panel = $("codePanel"), handle = $("codeResize");
    try { const h = Number(localStorage.getItem("wc:codeH")); if (h) panel.style.height = `${h}px`; } catch { /* storage is optional */ }
    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        drag = { y: e.clientY, h: panel.offsetHeight };
        handle.setPointerCapture(e.pointerId);
        document.body.style.cursor = "row-resize";
    });
    handle.addEventListener("pointermove", (e) => {
        if (!drag) return;
        panel.style.height = `${Math.round(Math.min(innerHeight * 0.8, Math.max(120, drag.h + drag.y - e.clientY)))}px`;
        layout();
    });
    const end = (e) => {
        if (!drag) return;
        drag = null;
        document.body.style.cursor = "";
        try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        try { localStorage.setItem("wc:codeH", String(panel.offsetHeight)); } catch { /* storage is optional */ }
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("lostpointercapture", end);
})();
}
