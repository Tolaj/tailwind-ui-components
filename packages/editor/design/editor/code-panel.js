import { highlight, lineNumbers, checkTags, formatHtml } from "../code-view.js";
import { parseComponentSource } from "../../playground/component-source.js";
import { $, S, model } from "./base.js";
import { assemble, commit, loadFrame } from "./docs.js";
import { layout } from "./plane.js";

// ── Code panel (two-way with the canvas) ─────────────────────────────────────
const codeText = $("codeText");
const codeOpen = () => !$("codePanel").classList.contains("hidden");
export const codeFocused = () => document.activeElement === codeText;
const CODE_LINE = 20, CODE_PAD = 12; // the code box's line height and padding (canvas.handlebars .code-layer)
/** Scrolls the code box so the character at `index` is in view (lines don't wrap, so its line gives its height). */
function revealInCode(text, index) {
    const y = CODE_PAD + (text.slice(0, index).split("\n").length - 1) * CODE_LINE;
    if (y < codeText.scrollTop || y > codeText.scrollTop + codeText.clientHeight - 2 * CODE_LINE) codeText.scrollTop = Math.max(0, y - codeText.clientHeight / 2);
    syncCodeScroll();
}
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
const codeHl = $("codeHl"), codeGutter = $("codeGutter");
/** The coloured copy and the line numbers follow the textarea's scrolling. */
function syncCodeScroll() {
    codeHl.scrollTop = codeText.scrollTop;
    codeHl.scrollLeft = codeText.scrollLeft;
    codeGutter.scrollTop = codeText.scrollTop;
}
/** Paints the code in colour, shading the selected element's source (its opening tag darker), and when the selection just changed, scrolls to it. */
export function updateCodeHighlight(reveal) {
    if (!codeOpen()) return;
    const text = codeText.value;
    const base = model.markup ? text.indexOf(model.markup) : -1;
    const r = S.selected && S.selected.path && S.selected.path.length && base >= 0 ? elementRange(model.markup, S.selected.path) : null;
    const marks = r ? [[base + r.start, base + r.end, "sel"], [base + r.start, base + r.openEnd, "selt"]] : [];
    codeHl.innerHTML = highlight(text, marks);
    const n = text.split("\n").length;
    if (codeGutter.dataset.n !== String(n)) { codeGutter.textContent = lineNumbers(text) + "\n"; codeGutter.dataset.n = String(n); }
    $("codeLines").textContent = `${n} line${n === 1 ? "" : "s"}`;
    syncCodeScroll();
    if (reveal && r) revealInCode(text, base + r.start);
}

export function syncCode() {
    if (!codeOpen()) return;
    const next = model.markup.trim() ? assemble() : "";
    const prev = codeText.value;
    if (prev === next) return updateCodeHighlight(false);
    const left = codeText.scrollLeft, top = codeText.scrollTop;
    codeText.value = next;
    codeText.scrollLeft = left;
    codeText.scrollTop = top;
    // show what changed: the first place the new code differs from the old
    let i = 0;
    while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
    if (prev) revealInCode(next, i);
    updateCodeHighlight(false);
}
function setCodePanel(open) {
    $("codePanel").classList.toggle("hidden", !open);
    $("codePanel").classList.toggle("flex", open);
    $("codeBtn").classList.toggle("on", open);
    if (open) { syncCode(); updateCodeHighlight(true); codeText.focus(); }
    layout();
}
let codeTimer = null;
/** Shows the first place the tags don't match up (and returns it), or hides the warning. */
function showCodeProblem() {
    const bad = checkTags(codeText.value);
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
    S.parsed = parseComponentSource(codeText.value);
    commit(S.parsed.markup, "code");
    loadFrame();
    return true;
}
const copyFlash = (btn, msg) => { const was = btn.textContent; btn.textContent = msg; setTimeout(() => { btn.textContent = was; }, 1200); };

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {
    codeText.addEventListener("scroll", syncCodeScroll);
    $("codeBtn").addEventListener("click", () => setCodePanel(!codeOpen()));
    $("codeClose").addEventListener("click", () => setCodePanel(false));
    codeText.addEventListener("input", () => {
        updateCodeHighlight(false);
        clearTimeout(codeTimer);
        // broken tags are shown at once but never sent to the canvas, where the browser would "repair" them its own way
        codeTimer = setTimeout(applyCode, 500);
    });
    codeText.addEventListener("keydown", (e) => {
        if (e.key === "Tab" && !e.shiftKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); document.execCommand("insertText", false, "  "); }
    });
    $("codeWarn").addEventListener("click", () => {
        const line = Number($("codeWarn").dataset.line) || 1;
        const lines = codeText.value.split("\n");
        const at = lines.slice(0, line - 1).reduce((s, l) => s + l.length + 1, 0);
        codeText.focus();
        codeText.setSelectionRange(at, at + (lines[line - 1] || "").length);
        revealInCode(codeText.value, at);
    });
    $("codeCopy").addEventListener("click", (e) => copyText(codeText.value, e.currentTarget));
    // Format: tidy indentation of the design's markup (its <style> and <script> stay as they are), as one undo step
    $("codeFormat").addEventListener("click", (e) => {
        if (codeTimer && !applyCode()) return;
        if (showCodeProblem()) return;
        const next = formatHtml(model.markup);
        if (next === model.markup) { copyFlash(e.currentTarget, "Already tidy"); return; }
        model.markup = next;
        commit(next, "format");
        loadFrame();
        syncCode();
    });
// Resize: drag the panel's top edge; the height is remembered
(() => {
    const panel = $("codePanel");
    try { const h = Number(localStorage.getItem("wc:codeH")); if (h) panel.style.height = `${h}px`; } catch { /* storage is optional */ }
    $("codeResize").addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const startY = e.clientY, startH = panel.offsetHeight;
        const move = (ev) => { panel.style.height = `${Math.round(Math.min(innerHeight * 0.8, Math.max(120, startH + startY - ev.clientY)))}px`; layout(); };
        const up = () => {
            removeEventListener("pointermove", move);
            removeEventListener("pointerup", up);
            try { localStorage.setItem("wc:codeH", String(panel.offsetHeight)); } catch { /* storage is optional */ }
        };
        addEventListener("pointermove", move);
        addEventListener("pointerup", up);
    });
})();
}
