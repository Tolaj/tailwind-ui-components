// The Properties panel as components (Preact + htm, one vendored file, no build step).
//
// It is moved over piece by piece. What is not a component yet is still an HTML string from inspector.js, shown by <Raw>:
// the editor's click/input handlers keep working on it through the data attributes. What is a component keeps its own
// state (what is being typed, the cursor, errors) across renders, so the editor can redraw the panel whenever it likes.
// Moved so far: the Code tab's element code, the AI tab, the page panel (shown when no element is selected), and the top of
// the Design tab (design-tab.js) its position and size (geom-section.js), its property sections (prop-sections.js) and its Tailwind extras (extras-section.js): the whole Design tab; controls.js and group-controls.js hold the blocks the rest of the Design tab will be made of.
import { html, render, useState, useEffect, useLayoutEffect, useRef } from "../vendor/preact-htm.js";
import { highlight, checkTags } from "./code-view.js";
import { TextInput, Field } from "./controls.js";
import { DesignTop } from "./design-tab.js";
import { GeomSection } from "./geom-section.js";
import { PropSections } from "./prop-sections.js";
import { ExtrasSection } from "./extras-section.js";
import { ClassesSection } from "./classes-section.js";

/** A labelled text field of the page panel: typed freely, committed on Enter or leaving (controls.js TextInput). */
const PageField = ({ label, value, placeholder, onCommit, row }) => html`<${Field} label=${label} cell=${!row}><${TextInput} value=${value} placeholder=${placeholder} onCommit=${onCommit} /></${Field}>`;


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
function CodeTab({ path, source, indent, s, actions }) {
    const onApply = actions.applyElement;
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
        <${ClassesSection} s=${s} actions=${actions} />`;
}

/** A box for asking the AI something: its own text, status and busy state. `run(prompt)` returns { ok, message? }. */
function AskBox({ title, placeholder, rows, button, help, empty, done, run }) {
    const [prompt, setPrompt] = useState("");
    const [note, setNote] = useState(null);
    const [busy, setBusy] = useState(false);
    const go = async () => {
        if (!prompt.trim()) return setNote({ text: empty, bad: true });
        setBusy(true);
        setNote({ text: "Working..." });
        const res = await run(prompt.trim());
        setBusy(false);
        if (res.ok) { setPrompt(""); setNote(done ? { text: done } : null); } else setNote({ text: res.message || "Something went wrong.", bad: true });
    };
    return html`
        <div class="sec"><div class="secb nopad">
            <p class="sub first">${title}</p>
            <textarea class="fi area" rows=${rows} placeholder=${placeholder} value=${prompt} onInput=${(e) => setPrompt(e.target.value)}></textarea>
            <button type="button" class="primary" disabled=${busy} onClick=${go}>${button}</button>
            ${note && html`<p class=${`text-[11px] ${note.bad ? "text-red-700" : "text-neutral-500"}`}>${note.text}</p>`}
            <p class="muted">${help}</p>
        </div></div>`;
}

/** The AI tab: change the selected element. Keyed by the element, so a request still running applies to the one it was made for. */
function AiTab({ path, outer, actions }) {
    return html`<${AskBox} title="Ask AI about this element" placeholder="e.g. make this a dark card with a larger title" rows=${4}
        button="Apply to this element" help="Changes only the selected element. Undo with Ctrl/Cmd+Z." empty="Describe the change first."
        done="Applied. Undo with Ctrl/Cmd+Z." run=${(prompt) => actions.askAI(path, outer, prompt)} />`;
}

/** The page's own panel (no element selected): name, version, size, position, and a draft box while the page is empty. */
function PagePanel({ page: pg, actions }) {
    const dev = (w, l) => html`<button type="button" onClick=${() => actions.setDevice(w)}
        class=${`flex-1 rounded border py-1 text-[10px] ${pg.w === w ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 hover:bg-neutral-50"}`}>${l}</button>`;
    const btn = (l, fn) => html`<button type="button" onClick=${fn} class="flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50">${l}</button>`;
    const set = (key) => (text) => actions.setPageField(key, text);
    return html`
        <div class="sec"><div class="secb nopad"><p class="sub first">Page</p>
            <${PageField} row label="Name" value=${pg.name} onCommit=${set("name")} />
            <div class="row"><span class="lbl">Version</span><span class="text-[11px] text-neutral-700">${pg.isNew ? "not saved yet" : `v${pg.version}`}${pg.project ? ` · ${pg.project}` : ""}</span></div>
        </div></div>
        ${pg.empty && html`<${AskBox} title="Generate with AI" placeholder="e.g. a pricing section with three tiers and a highlighted middle plan" rows=${3}
            button="Generate" help="Or draw with the tools, add blocks from +, or paste code in the code panel." empty="Describe what you want first."
            run=${actions.draftPage} />`}
        <div class="sec"><div class="secb nopad"><p class="sub first">Size</p>
            <div class="flex gap-1">${dev(1280, "Desktop")}${dev(768, "Tablet")}${dev(390, "Mobile")}</div>
            <div class="two"><${PageField} label="W" value=${pg.w} onCommit=${set("w")} /><${PageField} label="H" value=${pg.auto ? "" : pg.h} placeholder="auto" onCommit=${set("h")} /></div>
            <p class="text-[10px] text-neutral-500">Leave the height empty and it follows the content.</p>
        </div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Position on the canvas</p>
            <div class="two"><${PageField} label="X" value=${pg.x} onCommit=${set("x")} /><${PageField} label="Y" value=${pg.y} onCommit=${set("y")} /></div>
        </div></div>
        <div class="sec"><div class="secb nopad"><div class="flex gap-1">${btn("Zoom to fit", actions.fit)}${btn("Details…", actions.details)}</div>
            <p class="text-[10px] text-neutral-500">Click an element in the page to edit it.</p>
        </div></div>`;
}

/** The panel: its head (tabs), then a component or HTML from inspector.js. */
function Panel({ view, actions }) {
    let body;
    if (view.design) {
        const d = view.design;
        // keyed by the element: another one gets fresh fields, so nothing typed for one can land on the next
        body = html`<${DesignTop} key=${d.key} s=${d.s} ctx=${d.ctx} actions=${actions} /><${GeomSection} key=${d.key} s=${d.s} actions=${actions} /><${PropSections} key=${d.key} s=${d.s} actions=${actions} /><${ExtrasSection} key=${d.key} s=${d.s} actions=${actions} />`;
    }
    else if (view.code) body = html`<${CodeTab} key=${view.code.key} path=${view.code.path} source=${view.code.source} indent=${view.code.indent} s=${view.code.s} actions=${actions} />`;
    else if (view.classes) body = html`<${ClassesSection} key=${view.classes.key} s=${view.classes.s} actions=${actions} />`;
    else if (view.ai) body = html`<${AiTab} key=${view.ai.key} path=${view.ai.path} outer=${view.ai.outer} actions=${actions} />`;
    else if (view.page) body = html`<${PagePanel} page=${view.page} actions=${actions} />`;
    else body = html`<${Raw} html=${view.body} />`;
    return html`<${Raw} html=${view.head} />${body}`;
}

/** Draws the panel into its element. `view` comes from inspectorView (inspector.js). */
export function renderPanel(container, view, actions) {
    render(html`<${Panel} view=${view} actions=${actions} />`, container);
}
