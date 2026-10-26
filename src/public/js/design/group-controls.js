// The Design tab's controls for Tailwind class groups (a size, a colour, a choice, a few buttons), drawn from controls.js.
// What they show comes from the selection's classes at the panel's breakpoint and state (val, useUi); what they do goes
// through `actions`, which the editor provides:
//   applyValue(key, value)                    set a group (empty clears it)
//   applyColor(key, name, opacity?, undoKey?) set a colour group
//   togglePalette(key)                        open or close a colour's palette
//   customColor(key, hex, done, input)        the custom colour picker moved (done: it was released or closed)
//   redraw()                                  show the stored values again
import { html } from "../vendor/preact-htm.js";
import { val, PRESETS, OPTS, splitOpacity } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { TextInput, SelectInput, Segmented, Row, Field, ColorField } from "./controls.js";

/** A free-typed value with suggestions (a size, a spacing...). `cell`: the small labelled cell instead of a full row. */
export function GroupCombo({ s, k, label, cell, actions }) {
    const ui = useUi();
    return html`<${Field} label=${label} title=${k} cell=${cell}>
        <${TextInput} list=${`dl-${PRESETS[k] ? k : "spacing"}`} value=${val(s, k, ui)} placeholder="-" onCommit=${(text) => actions.applyValue(k, text.trim())} />
    </${Field}>`;
}

/** One of a fixed set of values, or "-" for none. */
export function GroupSelect({ s, k, label, actions }) {
    const ui = useUi();
    return html`<${Field} label=${label}>
        <${SelectInput} blank="-" value=${val(s, k, ui)} options=${OPTS[k]} onChange=${(v) => actions.applyValue(k, v.trim())} />
    </${Field}>`;
}

/** Buttons for a few values; the one that is on turns the group off when clicked again. `items`: [value, label, title]. */
export function GroupSeg({ s, k, label, items, actions }) {
    const ui = useUi();
    return html`<${Row} label=${label}><${Segmented} value=${val(s, k, ui)} items=${items} onPick=${(v) => actions.applyValue(k, v)} /></${Row}>`;
}

/** A colour: swatch, name, opacity, and the palette while it is open (the panel state's palette). */
export function GroupColor({ s, k, label, actions }) {
    const ui = useUi();
    const [name, op] = splitOpacity(val(s, k, ui));
    const named = /^(?:black|white|transparent|current|inherit)$/.test(name) || /^[a-z]+-\d{2,3}$/.test(name);
    const arb = name.match(/^\[(.*)\]$/);
    return html`<${ColorField} label=${label} name=${name} opacity=${op} customKey=${k}
        swatchStyle=${name && arb ? `background:${arb[1].replace(/_/g, " ")}` : ""}
        swatchClass=${name && named ? (/^(?:transparent|current|inherit)$/.test(name) ? "swatch-t" : `bg-${name}`) : ""}
        customValue=${arb && /^#[0-9a-f]{6}$/i.test(arb[1]) ? arb[1] : "#111"}
        paletteOpen=${ui.palette === k}
        onPalette=${() => actions.togglePalette(k)}
        onName=${(text) => actions.applyColor(k, text.trim())}
        onOpacity=${(text) => { const base = val(s, k, ui).replace(/\/\d+$/, ""); if (base) actions.applyColor(k, base, text.trim()); else actions.redraw(); }}
        onPick=${(v) => actions.applyColor(k, v)}
        onCustom=${(hex, done, input) => actions.customColor(k, hex, done, input)} />`;
}
