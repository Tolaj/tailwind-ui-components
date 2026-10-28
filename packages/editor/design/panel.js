// The Properties panel as components (Preact + htm, one vendored file, no build step): the shell and the parts that are
// not a section of the Design tab. Everything is a component that keeps its own state (what is being typed, the cursor,
// errors) across redraws, so the editor can redraw the panel whenever it likes. The panel's own state (tab, breakpoint, open
// sections...) comes from panel-state.js through context; what to show comes from inspectorView (panel-model.js); what the
// components ask of the editor goes through `actions` (editor.js panelActions).
//   here: the head (tabs), the page panel, the AI tab, the Code tab's element code
//   design-tab.js · figma-sections.js · style-sections.js · prop-sections.js: the Design tab
//   classes-section.js: the Code tab below the element's code; controls.js, group-controls.js: the blocks they are made of
import { html, render, useState, useEffect, useLayoutEffect, useRef } from "../vendor/preact-htm.js";
import { UiContext } from "./panel-state.js";
import { highlight, checkTags } from "./code-view.js";
import { TextInput, Field } from "./controls.js";
import { DesignTop } from "./design-tab.js";
import { PositionSection, LayoutSection, ItemSection } from "./figma-sections.js";
import { TypographySection, BackgroundSection, BorderSection, EffectsSection, TransformSection, MotionSection, InteractionSection, MarginSection, AddBox } from "./style-sections.js";
import { ClassesSection } from "./classes-section.js";

/** A labelled text field of the page panel: typed freely, committed on Enter or leaving (controls.js TextInput). */
const PageField = ({ label, value, placeholder, onCommit, row }) => html`<${Field} label=${label} cell=${!row}><${TextInput} value=${value} placeholder=${placeholder} onCommit=${onCommit} /></${Field}>`;


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
            <${PageField} row label="Group" value=${pg.group} placeholder="none" onCommit=${set("group")} />
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

/**
 * The style sections after Position and Layout, in the order a frontend developer reaches for them (style-sections.js). The page
 * (its body) gets no Border, Effects, Transform or Interaction: those on a whole page are almost always a slip meant for an element,
 * and a border on a page as tall as the screen makes it outgrow its frame.
 */
const Styles = ({ k, s, actions, page }) => html`<${TypographySection} key=${`t${k}`} s=${s} actions=${actions} /><${BackgroundSection} key=${`b${k}`} s=${s} actions=${actions} />
    ${!page && html`<${BorderSection} key=${`r${k}`} s=${s} actions=${actions} /><${EffectsSection} key=${`e${k}`} s=${s} actions=${actions} />
        <${TransformSection} key=${`x${k}`} s=${s} actions=${actions} /><${MotionSection} key=${`n${k}`} s=${s} actions=${actions} /><${InteractionSection} key=${`i${k}`} s=${s} actions=${actions} />`}
    <${MarginSection} key=${`m${k}`} s=${s} actions=${actions} /><${AddBox} key=${`c${k}`} actions=${actions} />`;

const CLOSE = html`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>`;
const TABS = [["design", "Design"], ["classes", "Code"], ["ai", "AI"]];

/** The row at the top: the tabs (or just "Page" when no element is selected) and the close button. */
function Head({ page, tab, actions }) {
    return html`<div class="itabs">
        ${page ? html`<span class="px-1 text-[11px] font-medium text-neutral-800">Page</span>`
        : TABS.map(([k, label]) => html`<button type="button" class=${tab === k ? "on" : ""} onClick=${() => actions.setTab(k)}>${label}</button>`)}
        <button type="button" title="Close" style="padding:0" class="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100" onClick=${actions.closePanel}>${CLOSE}</button>
    </div>`;
}

/** The panel: its head, then what the view says to show. The Design tab's parts are keyed by the element: another one gets fresh fields, so nothing typed for one can land on the next. */
function Panel({ view, tab, actions }) {
    let body;
    if (view.design) {
        const { key, s } = view.design;
        body = html`<${DesignTop} key=${key} s=${s} actions=${actions} />
            ${s.tag !== "body" && html`<${PositionSection} key=${`p${key}`} s=${s} actions=${actions} />`}<${LayoutSection} key=${`l${key}`} s=${s} actions=${actions} />
            <${ItemSection} key=${`f${key}`} s=${s} actions=${actions} /><${Styles} k=${key} s=${s} actions=${actions} page=${s.tag === "body"} />`;
    }
    else if (view.code) body = html`<${CodeTab} key=${view.code.key} path=${view.code.path} source=${view.code.source} indent=${view.code.indent} s=${view.code.s} actions=${actions} />`;
    else if (view.classes) body = html`<${ClassesSection} key=${view.classes.key} s=${view.classes.s} actions=${actions} />`;
    else if (view.ai) body = html`<${AiTab} key=${view.ai.key} path=${view.ai.path} outer=${view.ai.outer} actions=${actions} />`;
    else if (view.page) body = html`<${PagePanel} page=${view.page} actions=${actions} />${view.pageBody && html`
        <div class="pagehead"><b>Page styling</b><span>Applies to the whole page (its body), not an element. Click an element to style it.</span></div>
        <${LayoutSection} key="page-l" s=${view.pageBody.s} actions=${view.pageBody.actions} /><${Styles} k="page" page s=${view.pageBody.s} actions=${view.pageBody.actions} />`}`;
    return html`<${Head} page=${view.page} tab=${tab} actions=${actions} />${body}`;
}

/** Draws the panel into its element. `view` comes from inspectorView (panel-model.js), `ui` is the panel's state (panel-state.js) plus what is worked out at the time of drawing. */
export function renderPanel(container, view, actions, ui) {
    render(html`<${UiContext.Provider} value=${ui}><${Panel} view=${view} tab=${ui.tab} actions=${actions} /></${UiContext.Provider}>`, container);
}
