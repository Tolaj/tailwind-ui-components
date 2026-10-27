// The Code tab below the element's own code, as components: the element's classes (chips, add one, edit them all as text), its
// inline CSS (the style attribute, as property/value rows), and its attributes. They act through `actions`, which the editor
// provides:
//   removeClass(index) · addClasses(text) · setClassesText(text) · setStyle(css | null) · setAttribute(name, value | null)
import { html, useState, useEffect, useRef } from "../vendor/preact-htm.js";
import { parseToken } from "@windcraft/core/class-groups.js";
import { TextInput, TextArea } from "./controls.js";

/** "color: red; margin: 0" -> [["color","red"],["margin","0"]] */
const parseStyle = (style) => (style || "").split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(":"); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; });
/** The style attribute for rows: only rows with both a property and a value count. null when there are none. */
const cssOf = (rows) => rows.filter(([k, v]) => k.trim() && v.trim()).map(([k, v]) => `${k.trim()}: ${v.trim()}`).join("; ");

/**
 * A row of two inputs (a property and its value, an attribute and its value). Each commits on Enter or leaving, with the
 * other as last committed; `onCommit({ k, v })`. A row only half filled stays as typed.
 */
function PairRow({ k, v, keyHolder, valueHolder, list, onCommit }) {
    const [cells, setCells] = useState({ k, v });
    const last = useRef({ k, v }); // what the row holds right now (two commits can come before a redraw)
    useEffect(() => { last.current = { k, v }; setCells({ k, v }); }, [k, v]); // an edit landed, or another element: show what is there
    const commit = (patch) => {
        const before = last.current, next = { ...before, ...patch };
        last.current = next;
        setCells(next);
        onCommit(next, before);
    };
    return html`<div class="kv">
        <${TextInput} list=${list} value=${cells.k} placeholder=${keyHolder} onCommit=${(text) => commit({ k: text })} />
        <${TextInput} value=${cells.v} placeholder=${valueHolder} onCommit=${(text) => commit({ v: text })} />
    </div>`;
}

/** The element's style attribute as rows, and an empty row to add one. */
function StyleRows({ style, actions }) {
    const [rows, setRows] = useState(() => parseStyle(style));
    const latest = useRef(rows); // the rows right now (two commits can come before a redraw)
    const show = (next) => { latest.current = next; setRows(next); };
    // the style changed from elsewhere (an undo, another element): show it; one we just saved keeps the rows as they are
    useEffect(() => { const now = parseStyle(style); if (cssOf(latest.current) !== cssOf(now)) show(now); }, [style]);
    const commit = (i, { k, v }) => {
        const next = latest.current.map((row, j) => (j === i ? [k, v] : row));
        if (i >= next.length) next.push([k, v]);
        const kept = next.filter(([a, b]) => a || b);
        show(kept);
        const css = cssOf(kept);
        actions.setStyle(css ? `${css};` : null);
    };
    return [...rows, ["", ""]].map(([k, v], i) => html`<${PairRow} key=${i} k=${k} v=${v} keyHolder="property" valueHolder="value" list="dl-cssprops" onCommit=${(next) => commit(i, next)} />`);
}

/** The element's attributes (class and style are above), and an empty row to add one. Renaming one removes the old name. */
function AttrRows({ attrs, actions }) {
    const entries = Object.entries(attrs || {});
    return [...entries, ["", ""]].map(([k, v], i) => html`<${PairRow} key=${i} k=${k} v=${v} keyHolder="attribute" valueHolder="value"
        onCommit=${(next, old) => {
            if (old.k && old.k !== next.k.trim()) actions.setAttribute(old.k, null);
            if (next.k.trim()) actions.setAttribute(next.k.trim(), next.v);
        }} />`);
}

export function ClassesSection({ s, actions }) {
    const toks = s.classes.split(/\s+/).filter(Boolean);
    return html`
        <div class="sec"><div class="secb nopad"><p class="sub first">Classes <span class="muted">${toks.length}</span></p>
            <div class="chips">${toks.length ? toks.map((t, i) => html`<span class=${`chip ${parseToken(t).variant ? "var" : ""}`}>${t}<button type="button" title="Remove" onClick=${() => actions.removeClass(i)}>×</button></span>`) : html`<span class="muted">No classes</span>`}</div>
            <${TextInput} placeholder="Add classes, press Enter (hover:bg-red-500)" blurCommits=${false} onCommit=${actions.addClasses} />
            <p class="sub">Edit all</p><${TextArea} class="fi area mono" rows=${4} spellcheck=${false} value=${s.classes} onInput=${actions.setClassesText} />
        </div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Inline CSS <span class="muted">style attribute</span></p><${StyleRows} style=${s.style} actions=${actions} /></div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Attributes</p><${AttrRows} attrs=${s.attrs} actions=${actions} /></div></div>`;
}
