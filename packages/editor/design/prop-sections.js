// One CSS property as a row of the Properties panel, for the settings that have no field of their own (cursor, object fit,
// text decoration...). It is drawn like every other field: the label inside, a blue edge when a Tailwind class gives the value
// and amber when CSS does (the tooltip names the class or rule), faint when it is a default. Beside it, as for every style in
// the panel: − takes a set value off; − (onCancel) also closes a row that was just added and has no value yet.
// It edits the property where it comes from, through `actions`: setProp(prop, value) · resetProp(prop)
import { html } from "../vendor/preact-htm.js";
import { I, IconBtn, PropField, PropSelect, owns, has } from "./figma-sections.js";

/** `c`: { p: the CSS property, l: its label, t: "select" with `o` (its values) or "text" }. */
export function PropRow({ s, c, actions, onCancel }) {
    return html`<div class="frow">${c.t === "select"
        ? html`<${PropSelect} s=${s} actions=${actions} p=${c.p} label=${c.l} options=${c.o.map((o) => [o, o])} />`
        : html`<${PropField} s=${s} actions=${actions} p=${c.p} label=${c.l} list=${c.list} />`}
        ${owns(s, c.p) ? html`<${IconBtn} icon=${I.minus} title=${`Remove ${c.l.toLowerCase()}`} onClick=${() => { actions.resetProp(c.p); if (onCancel) onCancel(); }} />`
            // given by the design's own CSS rule: it can't be taken off, so it is switched off with the property's initial value
            : has(s, c.p) ? html`<${IconBtn} icon=${I.minus} title=${`Remove ${c.l.toLowerCase()} (overrides the design's CSS)`} onClick=${() => { actions.setProp(c.p, "initial"); if (onCancel) onCancel(); }} />`
            : onCancel ? html`<${IconBtn} icon=${I.minus} title="Remove" onClick=${onCancel} />` : null}</div>`;
}
