// @ts-check
// The building blocks of the Design tab as components (see panel.js for the shell). Each draws the same markup and classes
// the old HTML builders in inspector.js did, so the styles in canvas.handlebars apply unchanged; each keeps what is being
// typed in its own state and reports changes through callbacks. None reads the page or the editor's state.
import { html, useState, useRef } from "../vendor/preact-htm.js";
import { HUES, SHADES, SPECIAL_COLORS } from "./class-groups.js";

/**
 * A text input typed in freely. It shows `value` until it is focused, keeps what is typed in its own state, and hands the
 * text over on Enter or when it is left (`onCommit(text)`). Esc gives up. `onInput(text)` is called on every keystroke, for
 * fields that apply as you type. Whether the value changes is up to the caller: a refused entry shows the old value again.
 * Enter and Esc act at once rather than through blur, which a window without focus never sends.
 * @param {{ value?: string | number | null, onCommit?: (text: string) => void, onInput?: (text: string) => void, placeholder?: string, list?: string, title?: string, class?: string }} props
 */
export function TextInput({ value, onCommit, onInput, placeholder, list, title, class: cls = "fi" }) {
    const [draft, setDraft] = useState(/** @type {string | null} */ (null));
    const typed = useRef(/** @type {string | null} */ (null)); // the same text as `draft`, readable at once (a key can arrive before the redraw)
    const shown = draft ?? String(value ?? "");
    const type = (/** @type {string} */ text, /** @type {boolean} */ live) => { typed.current = text; setDraft(text); if (live && onInput) onInput(text); };
    const finish = (/** @type {boolean} */ commit) => {
        const text = typed.current;
        typed.current = null;
        setDraft(null);
        if (commit && text !== null && text !== String(value ?? "") && onCommit) onCommit(text);
    };
    return html`<input class=${cls} value=${shown} placeholder=${placeholder || ""} list=${list} title=${title} autocomplete="off"
        onFocus=${(e) => type(e.target.value, false)} onInput=${(e) => type(e.target.value, true)} onBlur=${() => finish(true)}
        onKeyDown=${(e) => { if (e.key === "Enter") { finish(true); e.target.blur(); } else if (e.key === "Escape") { finish(false); e.target.blur(); } }} />`;
}

/**
 * A dropdown. `options` are [value, label]; `onChange(value)` when another is picked. A `blank` option ("-") comes first when given.
 * @param {{ value?: string, options: string[][], onChange: (value: string) => void, blank?: string, title?: string, class?: string }} props
 */
export function SelectInput({ value, options, onChange, blank, title, class: cls = "fi" }) {
    return html`<select class=${cls} title=${title} onChange=${(e) => onChange(e.target.value)}>
        ${blank !== undefined && html`<option value="" selected=${!value}>${blank}</option>`}
        ${options.map(([v, l]) => html`<option value=${v} selected=${value === v}>${l}</option>`)}
    </select>`;
}

/**
 * A row of buttons where one can be on. `items` are [value, label, title]; clicking the one that is on sends "" (off), another sends its value.
 * @param {{ value?: string, items: string[][], onPick: (value: string) => void, off?: boolean }} props `off`: clicking the one that is on sends its value again (a fixed choice, not a toggle)
 */
export function Segmented({ value, items, onPick, off }) {
    return html`<div class="seg2">${items.map(([v, l, t]) => html`<button type="button" title=${t || l} class=${value === v ? "on" : ""}
        onClick=${() => onPick(value === v && !off ? "" : v)}>${l}</button>`)}</div>`;
}

/** A labelled row: <div class="row">. */
export const Row = ({ label, title, children }) => html`<div class="row" title=${title}><span class="lbl">${label}</span>${children}</div>`;
/** A labelled row whose control is an input, so the label is clickable: <label class="row"> (or a small <label class="cell">). */
export const Field = ({ label, title, cell, children }) => html`<label class=${cell ? "cell" : "row"} title=${title}><span class=${cell ? "clbl" : "lbl"}>${label}</span>${children}</label>`;
/** Two or four controls side by side. */
export const Two = ({ children }) => html`<div class="two">${children}</div>`;
export const Four = ({ children }) => html`<div class="four">${children}</div>`;

/**
 * A collapsible section with a header; a dot shows that something in it is set. `open` is what is shown, `onToggle` flips it.
 * @param {{ title: string, open: boolean, set?: boolean, onToggle: () => void, id?: string, children?: any }} props
 */
export function Section({ title, open, set, onToggle, id, children }) {
    return html`<div class="sec"><button type="button" class="sech" data-sec=${id} data-open=${String(open)} onClick=${onToggle}>
        <span class="car">${open ? "▾" : "▸"}</span><span class="t">${title}</span>${set && html`<i class="dot"></i>`}</button>
        ${open && html`<div class="secb">${children}</div>`}</div>`;
}

/**
 * A colour as a row: a swatch that opens the palette, the colour's name (typed), its opacity, and (when open) the palette:
 * the special colours, a custom colour picker, None, and every hue and shade.
 * @param {{ label: string, name: string, opacity: string, swatchClass?: string, swatchStyle?: string, customValue?: string, paletteOpen: boolean, onPalette: () => void, onName: (text: string) => void, onOpacity: (text: string) => void, onPick: (value: string) => void, onCustom: (hex: string, done: boolean, input: HTMLInputElement) => void, customKey?: string }} props
 */
export function ColorField({ label, name, opacity, swatchClass, swatchStyle, customValue, paletteOpen, onPalette, onName, onOpacity, onPick, onCustom, customKey }) {
    const cell = (/** @type {string} */ v, /** @type {string} */ cls) => html`<button type="button" title=${v} class=${`sw2 ${cls} ${name === v ? "on" : ""}`} onClick=${() => onPick(v)}></button>`;
    return html`
        <div class="crow"><span class="lbl">${label}</span>
            <button type="button" class=${`sw ${swatchClass || ""}`} style=${swatchStyle || undefined} title="Pick a color" onClick=${onPalette}></button>
            <${TextInput} class="fi grow" list="dl-colors" value=${name} placeholder="none" onCommit=${onName} />
            <${TextInput} class="fi op" value=${opacity} placeholder="100" title="Opacity %" onCommit=${onOpacity} /><span class="pct">%</span></div>
        ${paletteOpen && html`<div class="pal">
            <div class="palrow">${SPECIAL_COLORS.map((c) => cell(c, c === "black" ? "bg-black" : c === "white" ? "bg-white" : "swatch-t"))}
                <label class="sw2 custom" title="Custom color"><input type="color" data-ccustom=${customKey} value=${customValue || "#111"}
                    onInput=${(e) => onCustom(e.target.value, false, e.target)} onChange=${(e) => onCustom(e.target.value, true, e.target)} /></label>
                <button type="button" class="clear" onClick=${() => onPick("")}>None</button></div>
            ${HUES.map((h) => html`<div class="palrow">${SHADES.map((s) => cell(`${h}-${s}`, `bg-${h}-${s}`))}</div>`)}
        </div>`}`;
}
