// The Properties panel as components (Preact + htm, one vendored file, no build step).
//
// It is moved over piece by piece. What is not a component yet is still an HTML string from inspector.js, shown by <Raw>:
// the editor's click/input handlers keep working on it through the data attributes. What is a component keeps its own
// state (what is being typed, the cursor, errors) across renders, so the editor can redraw the panel whenever it likes.
// Moved so far: the Code tab's element code.
import { html, render, useState, useEffect, useLayoutEffect, useRef } from "../vendor/preact-htm.js";
import { highlight, checkTags } from "./code-view.js";

/** HTML from inspector.js, shown as it is (the wrapper takes no space of its own). */
const Raw = ({ html: h }) => html`<div style="display:contents" dangerouslySetInnerHTML=${{ __html: h }}></div>`;

/** Where the text at `offset` of an element's text is on screen, as { top, bottom } in the page's coordinates. */
function caretRect(root, offset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let left = offset, node = null;
    while (walker.nextNode()) {
        node = walker.currentNode;
        if (left <= node.length) break;
        left -= node.length;
    }
    if (!node) return null;
    const r = document.createRange();
    r.setStart(node, Math.min(left, node.length));
    r.collapse(true);
    const rect = r.getBoundingClientRect();
    return rect.height ? rect : (node.parentElement || root).getBoundingClientRect();
}

/**
 * The selected element's own code, editable. Ctrl/Cmd+Enter or leaving the box applies it (one undo step); Esc puts back
 * what was applied; anything typed is applied to *this* element when another is picked (the component is keyed by the
 * element's path, so it unmounts then). `onApply(path, code, indent, original)` returns { ok, message? }.
 */
function CodeTab({ path, source, indent, rest, onApply }) {
    const [draft, setDraft] = useState(source);
    const [error, setError] = useState("");
    const orig = useRef(source); // the code as last shown or applied
    const ta = useRef(null), box = useRef(null), hl = useRef(null);
    const live = useRef({});
    live.current = { draft, path, indent, onApply, ta };

    // the element's code changed from elsewhere (undo, the canvas, the code panel): show it, unless it is being typed in
    useEffect(() => {
        if (source === orig.current) return;
        orig.current = source;
        if (document.activeElement !== ta.current) { setDraft(source); setError(""); }
    }, [source]);

    // leaving (another element picked, another tab) applies what was typed
    useEffect(() => () => {
        const { draft: d, path: p, indent: i, onApply: apply, ta: t } = live.current;
        const code = t.current ? t.current.value : d;
        if (code.trim() !== orig.current.trim()) apply(p, code, i, orig.current);
    }, []);

    const dirty = draft.trim() !== orig.current.trim();
    const problem = dirty ? checkTags(draft) : null;

    // keep the cursor in view: this box scrolls, the textarea inside it does not
    useLayoutEffect(() => {
        const t = ta.current, b = box.current;
        if (!t || document.activeElement !== t) return;
        const r = caretRect(hl.current, t.selectionEnd), br = b.getBoundingClientRect();
        if (!r) return;
        if (r.top < br.top) b.scrollTop -= br.top - r.top + 8;
        else if (r.bottom > br.bottom) b.scrollTop += r.bottom - br.bottom + 8;
    }, [draft]);

    const apply = () => {
        const code = ta.current ? ta.current.value : draft; // what is in the box now, even if a redraw is still due
        const res = live.current.onApply(path, code, indent, orig.current);
        if (res.ok) { orig.current = code; setError(""); } else setError(res.message || "Not applied.");
        return res.ok;
    };
    const onKeyDown = (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (apply()) e.target.blur(); }
        else if (e.key === "Escape") { e.preventDefault(); setDraft(orig.current); setError(""); e.target.blur(); }
        else if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); document.execCommand("insertText", false, "  "); }
    };
    const copy = (e) => {
        const btn = e.currentTarget, was = btn.textContent;
        const done = (m) => { btn.textContent = m; setTimeout(() => { btn.textContent = was; }, 1200); };
        navigator.clipboard.writeText(draft).then(() => done("Copied"), () => done("Copy failed"));
    };

    const note = error || (problem ? `Line ${problem.line}: ${problem.message}` : dirty ? "Ctrl/Cmd+Enter or click away to apply. Esc undoes your typing." : "Edit it, then Ctrl/Cmd+Enter or click away to apply.");
    return html`
        <div class="sec"><div class="secb nopad">
            <div class="elhead"><p class="sub first">Element code</p><button type="button" title="Copy this element's HTML" onClick=${copy}>Copy</button></div>
            <div class="codebox elcode" ref=${box}><div class="elin">
                <pre class="code-layer ck" aria-hidden="true" ref=${hl} dangerouslySetInnerHTML=${{ __html: highlight(draft) }}></pre>
                <textarea class="code-layer" spellcheck="false" autocomplete="off" rows="1" ref=${ta} value=${draft}
                    onInput=${(e) => { setDraft(e.target.value); setError(""); }} onKeyDown=${onKeyDown} onBlur=${apply}></textarea>
            </div></div>
            <p class=${`muted ${error || problem ? "bad" : ""}`} data-elnote>${note}</p>
        </div></div>
        <${Raw} html=${rest} />`;
}

/** The panel: its head (tabs), then either a component or HTML from inspector.js. */
function Panel({ view, actions }) {
    return html`
        <${Raw} html=${view.head} />
        ${view.code
        ? html`<${CodeTab} key=${view.code.key} path=${view.code.path} source=${view.code.source} indent=${view.code.indent} rest=${view.code.rest} onApply=${actions.applyElement} />`
        : html`<${Raw} html=${view.body} />`}`;
}

/** Draws the panel into its element. `view` comes from inspectorView (inspector.js). */
export function renderPanel(container, view, actions) {
    render(html`<${Panel} view=${view} actions=${actions} />`, container);
}
