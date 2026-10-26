// The top of the Design tab as components: where the element is (crumbs), what tag it is, what you can do with it, how edits
// are written (legend, breakpoint and state), and what it says (content). They read the panel's state (breakpoint, state, the
// frame's breakpoint) through useUi() and act through `actions`, which the editor provides:
//   select(path) · move(dir) · duplicate() · remove() · setTag(tag) · setBreakpoint(bp) · setState(st) · setText(text) · setAttr(name, value)
import { html } from "../vendor/preact-htm.js";
import { BREAKPOINTS, STATES } from "./class-groups.js";
import { TAG_KINDS, variant, modeFor } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { TextInput, TextArea, SelectInput, Field } from "./controls.js";

const Crumbs = ({ s, actions }) => html`<div class="crumbs">${s.crumbs.map((c, i) => html`${i > 0 && html`<span class="sl">/</span>`}<button type="button" class=${i === s.crumbs.length - 1 ? "cur" : ""} onClick=${() => actions.select(c.path || [])}>${c.tag}</button>`)}</div>`;

/** The tag it can be changed to (only tags that stay valid where it sits and for what it holds), grouped by kind. */
const TagRow = ({ s, actions }) => {
    const opts = s.tagOptions || [];
    if (opts.length < 2 || (s.count || 1) > 1) return null;
    const groups = TAG_KINDS.map(([label, re]) => [label, opts.filter((t) => re.test(t)).map((t) => [t, `<${t}>`])]).filter(([, list]) => list.length);
    return html`<label class="row tagrow" title="Only tags that stay valid here are listed"><span class="lbl">Tag</span>
        <${SelectInput} value=${s.tag} groups=${groups} onChange=${actions.setTag} /></label>`;
};

const Actions = ({ s, actions }) => s.tag === "body" ? null : html`<div class="acts">
    <button type="button" title="Move earlier" onClick=${() => actions.move(-1)}>Up</button>
    <button type="button" title="Move later" onClick=${() => actions.move(1)}>Down</button>
    <button type="button" title="Ctrl/Cmd+D" onClick=${actions.duplicate}>Duplicate</button>
    <button type="button" class="danger" title="Delete" onClick=${actions.remove}>Delete</button></div>`;

const Legend = ({ s }) => html`<p class="legend"><span class="stag tw">TW</span> Tailwind class <span class="stag css">CSS</span> style. Edits go where the value comes from; anything new is written as ${modeFor(s, useUi()) === "tailwind" ? "Tailwind" : "CSS"}.</p>`;

/** Which breakpoint and state new Tailwind classes are written for. */
const VariantBar = ({ actions }) => {
    const ui = useUi(), prefix = variant(ui);
    return html`
        <div class="vbar">
            <${SelectInput} value=${ui.bp} options=${BREAKPOINTS.map((b) => [b, b ? `${b} and up` : "Base (all sizes)"])} onChange=${actions.setBreakpoint} />
            <${SelectInput} value=${ui.st} options=${STATES.map((b) => [b, b || "Default state"])} onChange=${actions.setState} />
        </div>
        ${prefix ? html`<p class="vnote">New Tailwind classes get <code>${prefix}</code></p>`
            : ui.frameBp ? html`<p class="vnote">At this frame width, sizes and spacing get <code>${ui.frameBp}</code> (the base class if none is set yet)</p>` : null}`;
};

/** The element's text and the attributes that matter for its kind; each applies as you type. */
const Content = ({ s, actions }) => {
    const fields = [];
    if (s.tag === "img") fields.push(["src", "Image URL"], ["alt", "Alt text"]);
    if (s.tag === "a") fields.push(["href", "Link"], ["target", "Target"]);
    if (["input", "textarea"].includes(s.tag)) fields.push(["placeholder", "Placeholder"], ["type", "Type"], ["value", "Value"]);
    const text = s.leaf && !["img", "input", "hr", "br"].includes(s.tag);
    if (!text && !fields.length) return null;
    return html`<div class="sec"><div class="secb nopad"><p class="sub first">Content</p>
        ${text && html`<${TextArea} value=${s.text} placeholder="Text" onInput=${actions.setText} />`}
        ${fields.map(([a, l]) => html`<${Field} label=${l}><${TextInput} value=${s.attrs[a] || ""} onInput=${(v) => actions.setAttr(a, v)} /></${Field}>`)}
    </div></div>`;
};

/** Everything above the Design tab's sections. */
export function DesignTop({ s, actions }) {
    return html`<${Crumbs} s=${s} actions=${actions} /><${TagRow} s=${s} actions=${actions} /><${Actions} s=${s} actions=${actions} />
        <${Legend} s=${s} /><${VariantBar} actions=${actions} /><${Content} s=${s} actions=${actions} />`;
}
