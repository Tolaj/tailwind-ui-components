// @ts-check
// The building blocks of the Design tab as components (see panel.js for the shell). Each draws the same markup and classes
// the old HTML builders in inspector.js did, so the styles in canvas.handlebars apply unchanged; each keeps what is being
// typed in its own state and reports changes through callbacks. None reads the page or the editor's state.
import { html, useState, useRef } from "../vendor/preact-htm.js";
import { HUES, SHADES, SPECIAL_COLORS } from "./class-groups.js";

/**
 * What a typed-in field needs: it shows `value` until it is focused, keeps what is typed in its own state (a redraw with the
 * old value must not undo a keystroke), and hands the text over: `onInput(text)` on every keystroke, `onCommit(text)` on Enter
 * (a single line) or when it is left. Esc gives up. Whether the value changes is up to the caller: a refused entry shows the
 * old value again. Enter and Esc act at once rather than through blur, which a window without focus never sends.
 */
function useTyped(value, onCommit, onInput, multiline) {
    const [draft, setDraft] = useState(/** @type {string | null} */ (null));
    const typed = useRef(/** @type {string | null} */ (null)); // the same text as `draft`, readable at once (a key can arrive before the redraw)
    const type = (/** @type {string} */ text, /** @type {boolean} */ live) => { typed.current = text; setDraft(text); if (live && onInput) onInput(text); };
    const finish = (/** @type {boolean} */ commit) => {
        const text = typed.current;
        typed.current = null;
        setDraft(null);
        if (commit && text !== null && text !== String(value ?? "") && onCommit) onCommit(text);
    };
    return {
        shown: draft ?? String(value ?? ""),
        onFocus: (/** @type {any} */ e) => type(e.target.value, false),
        onInput: (/** @type {any} */ e) => type(e.target.value, true),
        onBlur: () => finish(true),
        onKeyDown: (/** @type {any} */ e) => {
            if (e.key === "Enter" && !multiline) { finish(true); e.target.blur(); }
            else if (e.key === "Escape") { finish(false); e.target.blur(); }
        },
    };
}

/**
 * A text input typed in freely (see useTyped).
 * @param {{ value?: string | number | null, onCommit?: (text: string) => void, onInput?: (text: string) => void, placeholder?: string, list?: string, title?: string, disabled?: boolean, class?: string }} props
 */
export function TextInput({ value, onCommit, onInput, placeholder, list, title, disabled, class: cls = "fi" }) {
    const t = useTyped(value, onCommit, onInput, false);
    return html`<input class=${cls} value=${t.shown} placeholder=${placeholder || undefined} list=${list} title=${title} disabled=${disabled || undefined} autocomplete="off"
        onFocus=${t.onFocus} onInput=${t.onInput} onBlur=${t.onBlur} onKeyDown=${t.onKeyDown} />`;
}

/**
 * A multi-line text box typed in freely (see useTyped); Enter is a new line.
 * @param {{ value?: string | null, onCommit?: (text: string) => void, onInput?: (text: string) => void, placeholder?: string, rows?: number, class?: string }} props
 */
export function TextArea({ value, onCommit, onInput, placeholder, rows = 3, class: cls = "fi area" }) {
    const t = useTyped(value, onCommit, onInput, true);
    return html`<textarea class=${cls} rows=${rows} placeholder=${placeholder || undefined} value=${t.shown}
        onFocus=${t.onFocus} onInput=${t.onInput} onBlur=${t.onBlur} onKeyDown=${t.onKeyDown}></textarea>`;
}

/**
 * A dropdown. `options` are [value, label]; `onChange(value)` when another is picked. A `blank` option ("-") comes first when
 * given. `groups` ([label, options][]) instead of `options` draws <optgroup>s.
 * @param {{ value?: string, options?: string[][], groups?: [string, string[][]][], onChange: (value: string) => void, blank?: string, title?: string, class?: string }} props
 */
export function SelectInput({ value, options, groups, onChange, blank, title, class: cls = "fi" }) {
    const opt = (/** @type {string[]} */ [v, l]) => html`<option value=${v} selected=${value === v}>${l}</option>`;
    return html`<select class=${cls} title=${title} onChange=${(e) => onChange(e.target.value)}>
        ${blank !== undefined && html`<option value="" selected=${!value}>${blank}</option>`}
        ${options && options.map(opt)}
        ${groups && groups.map(([label, list]) => html`<optgroup label=${label}>${list.map(opt)}</optgroup>`)}
    </select>`;
}

/**
 * A row of buttons where one can be on. `items` are [value, label, title]; the title is the label when it is left out, and none
 * when it is null. Clicking the one that is on sends "" (off), another sends its value.
 * @param {{ value?: string, items: (string | null)[][], onPick: (value: string) => void, off?: boolean }} props `off`: clicking the one that is on sends its value again (a fixed choice, not a toggle)
 */
export function Segmented({ value, items, onPick, off }) {
    return html`<div class="seg2">${items.map(([v, l, t]) => html`<button type="button" title=${t === null ? undefined : t || l} class=${value === v ? "on" : ""}
        onClick=${() => onPick(value === v && !off ? "" : /** @type {string} */ (v))}>${l}</button>`)}</div>`;
}

/** A labelled row: <div class="row">. */
export const Row = ({ label, title, children }) => html`<div class="row" title=${title}><span class="lbl">${label}</span>${children}</div>`;
/** A labelled row whose control is an input, so the label is clickable: <label class="row"> (or a small <label class="cell">). `extra`: more classes (opacity-50 for a dimmed one). */
export const Field = ({ label, title, cell, extra, children }) => html`<label class=${[cell ? "cell" : "row", extra].filter(Boolean).join(" ")} title=${title}><span class=${cell ? "clbl" : "lbl"}>${label}</span>${children}</label>`;
/** Two or four controls side by side. */
export const Two = ({ children }) => html`<div class="two">${children}</div>`;
export const Four = ({ children }) => html`<div class="four">${children}</div>`;

/**
 * A collapsible section with a header; a dot shows that something in it is set. `open` is what is shown, `onToggle` flips it.
 * (It has no data-sec: the editor's delegated handler for the sections still in HTML would toggle it a second time.)
 * @param {{ title: string, open: boolean, set?: boolean, onToggle: () => void, children?: any }} props
 */
export function Section({ title, open, set, onToggle, children }) {
    return html`<div class="sec"><button type="button" class="sech" onClick=${onToggle}>
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

/**
 * A colour input. While it is being dragged it shows what is picked (the redraws that follow each change carry the old value
 * until the page reports the new one). `onLive(hex)` on every move, `onDone(hex, input)` when it is released or closed.
 * `hook` is extra attributes, such as { "data-propcolor": prop }, which the editor's colour picker uses to find the field again.
 * @param {{ value: string, title?: string, class?: string, hook?: Record<string, string>, onLive: (hex: string) => void, onDone: (hex: string, input: HTMLInputElement) => void }} props
 */
export function ColorInput({ value, title, class: cls = "cinp", hook, onLive, onDone }) {
    const [draft, setDraft] = useState(/** @type {string | null} */ (null));
    return html`<input type="color" class=${cls} value=${draft ?? value} title=${title} ...${hook || {}}
        onInput=${(e) => { setDraft(e.target.value); onLive(e.target.value); }}
        onChange=${(e) => { setDraft(null); onDone(e.target.value, e.target); }} />`;
}
