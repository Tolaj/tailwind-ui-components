// The Code tab below the element's own code, as components: the element's classes (one box: a chip per class, click one to edit
// it, × to remove it, type at the end to add), its inline CSS (the style attribute, as property/value rows), and its attributes.
// They act through `actions`, which the editor provides:
//   setClassesText(text) · setStyle(css | null) · setAttribute(name, value | null)
import { html, useState, useEffect, useRef } from "../vendor/preact-htm.js";
import { parseToken } from "@windcraft/core/class-groups.js";
import { TextInput } from "./controls.js";

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

/**
 * The element's classes in one box, like a tag input: each class a chip (a md: / hover: one tinted), × removes it, a click
 * turns it into text to change (Enter or leaving saves; emptied, it goes), and typing at the end adds classes (Enter, space or
 * a paste of several). Backspace in the empty end takes the last chip back into the text to change it. Every change saves
 * the whole list at once (setClassesText), so the classes keep their order.
 */
function ClassBox({ classes, actions }) {
    const toks = String(classes || "").split(/\s+/).filter(Boolean);
    const [editing, setEditing] = useState(/** @type {number | null} */ (null));
    const [draft, setDraft] = useState("");
    const end = useRef(/** @type {HTMLInputElement | null} */ (null));
    const save = (list) => actions.setClassesText([...new Set(list.filter(Boolean))].join(" "));
    const add = (text) => { const more = text.split(/[\s,]+/).filter(Boolean); if (more.length) save([...toks, ...more]); setDraft(""); };
    const replace = (i, text) => { setEditing(null); const parts = text.split(/\s+/).filter(Boolean); if (parts.join(" ") !== toks[i]) save([...toks.slice(0, i), ...parts, ...toks.slice(i + 1)]); };
    const keyEnd = (e) => {
        if (e.key === "Enter" || e.key === " " || e.key === ",") { if (draft.trim()) { e.preventDefault(); add(draft); } else if (e.key !== "Enter") e.preventDefault(); }
        else if (e.key === "Backspace" && !draft && toks.length) { e.preventDefault(); setDraft(toks[toks.length - 1]); save(toks.slice(0, -1)); }
        else if (e.key === "Escape") { setDraft(""); e.target.blur(); }
    };
    return html`<div class="cbox" onMouseDown=${(e) => { if (e.target === e.currentTarget) { e.preventDefault(); end.current && end.current.focus(); } }}>
        ${toks.map((t, i) => (editing === i
            ? html`<input class="cbedit" value=${t} size=${Math.max(4, t.length)} autofocus spellcheck=${false}
                ref=${(el) => el && document.activeElement !== el && el.focus()}
                onKeyDown=${(e) => { if (e.key === "Enter") { e.preventDefault(); replace(i, e.target.value); } else if (e.key === "Escape") setEditing(null); }}
                onBlur=${(e) => replace(i, e.target.value)} />`
            : html`<span class=${`chip ${parseToken(t).variant ? "var" : ""}`} title="Click to change it" onClick=${() => setEditing(i)}>${t}
                <button type="button" title=${`Remove ${t}`} onMouseDown=${(e) => e.preventDefault()} onClick=${(e) => { e.stopPropagation(); save(toks.filter((_, j) => j !== i)); }}>×</button></span>`))}
        <input ref=${end} class="cbin" value=${draft} spellcheck=${false} placeholder=${toks.length ? "Add a class…" : "Add classes (hover:bg-red-500)…"}
            onInput=${(e) => setDraft(e.target.value)} onKeyDown=${keyEnd} onBlur=${() => draft.trim() && add(draft)}
            onPaste=${(e) => { const t = e.clipboardData.getData("text"); if (/\s/.test(t.trim())) { e.preventDefault(); add(draft + " " + t); } }} />
    </div>`;
}

export function ClassesSection({ s, actions }) {
    const n = s.classes.split(/\s+/).filter(Boolean).length;
    return html`
        <div class="sec"><div class="secb nopad"><p class="sub first">Classes <span class="muted">${n}</span></p>
            <${ClassBox} classes=${s.classes} actions=${actions} />
        </div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Inline CSS <span class="muted">style attribute</span></p><${StyleRows} style=${s.style} actions=${actions} /></div></div>
        <div class="sec"><div class="secb nopad"><p class="sub first">Attributes</p><${AttrRows} attrs=${s.attrs} actions=${actions} /></div></div>`;
}
