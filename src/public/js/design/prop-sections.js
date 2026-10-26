// The Design tab's property sections (Layout, Size, Spacing, Position offsets, Typography, Fill, Border and radius, Effects) as
// components. Every row shows a CSS property wherever its value comes from (a Tailwind class, the element's style attribute,
// the design's own CSS, or a parent) and edits it there (editor.js setProp). Which sections are open comes from the panel's
// state (useUi); they act through `actions`, which the editor provides:
//   setProp(prop, value) · setPropLive(prop, hex) · setPropDone(prop, hex, input) · resetProp(prop) · arrange(kind) · toggleSection(id, wasOpen)
import { html } from "../vendor/preact-htm.js";
import { CSS_SECTIONS, rgbToHex } from "./css-props.js";
import { variantOf } from "./prop-tailwind.js";
import { srcOf, shownOf, ownsValue } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { TextInput, SelectInput, Segmented, Section, ColorInput } from "./controls.js";

const bare = (v) => String(v || "").replace(/:$/, "");
const cap = (o) => o[0].toUpperCase() + o.slice(1);

/** Where a value comes from: TW (a Tailwind class, with its variant), CSS (style attribute, or the design's own CSS), or a parent's class. */
function SourceTag({ src }) {
    if (src.source === "tailwind" || (src.source === "tie" && src.token)) return html`<span class="stag tw" title=${`Tailwind class ${src.token}`}>TW${variantOf(src.token) ? ` ${bare(variantOf(src.token))}` : ""}</span>`;
    if (src.source === "inline") return html`<span class="stag css" title="This element's style attribute">CSS</span>`;
    if (src.source === "design") return html`<span class="stag css" title=${`The design's CSS: ${src.selector}. Edits are written as an inline style that overrides it.`}>CSS</span>`;
    if (src.source === "parent") return html`<span class="stag up" title=${`Set by ${src.token} on a parent element`}>${src.token}</span>`;
    return null;
}

/** One property: its label, a control for its kind, where the value comes from, and a × to remove it where it is set. */
function PropRow({ s, c, actions }) {
    const src = srcOf(s, c.p);
    const shown = shownOf(s, c.p, src);
    const comp = (s.computed || {})[c.p] ?? "";
    let control;
    if (c.t === "select") {
        const opts = c.o.includes(comp) || !comp ? c.o : [comp, ...c.o]; // a value the list doesn't have is shown too
        control = html`<${SelectInput} value=${comp} options=${opts.map((o) => [o, o])} onChange=${(v) => actions.setProp(c.p, v)} />`;
    } else if (c.t === "seg") {
        control = html`<${Segmented} off value=${comp === "start" ? "left" : comp} items=${c.o.map((o) => [o, cap(o), null])} onPick=${(v) => actions.setProp(c.p, v)} />`;
    } else if (c.t === "color") {
        control = html`<${ColorInput} value=${rgbToHex(comp) || "#000000"} title="Pick a color" hook=${{ "data-propcolor": c.p }}
            onLive=${(hex) => actions.setPropLive(c.p, hex)} onDone=${(hex, input) => actions.setPropDone(c.p, hex, input)} />
            <${TextInput} list="dl-colors" value=${shown} onCommit=${(v) => actions.setProp(c.p, v)} />`;
    } else {
        control = html`<${TextInput} list=${c.list} value=${shown} onCommit=${(v) => actions.setProp(c.p, v)} />`;
    }
    return html`<div class="row" title=${c.p}><span class="lbl">${c.l}</span><div class="flex min-w-0 flex-1 items-center gap-1">${control}<${SourceTag} src=${src} />
        ${ownsValue(src) && html`<button type="button" class="rst" title=${src.source === "tailwind" ? `Remove ${src.token}` : "Remove the inline value"} onClick=${() => actions.resetProp(c.p)}>×</button>`}</div></div>`;
}

/** Margin around padding around the element: eight small inputs in nested boxes, coloured by where each value comes from. */
function PropBox({ s, actions }) {
    const i = (p) => {
        const src = srcOf(s, p);
        const kind = src.source === "tailwind" ? "tw" : src.source === "inline" || src.source === "design" ? "css" : "";
        const why = src.source === "tailwind" ? `Tailwind: ${src.token}` : src.source === "inline" ? "CSS: style attribute" : src.source === "design" ? `CSS: ${src.selector}` : src.source === "parent" ? `from ${src.token} on a parent` : "not set";
        return html`<${TextInput} class=${`bmi ${kind}`} placeholder="-" title=${`${p} (${why})`} value=${String(shownOf(s, p, src)).replace(/px$/, "")} onCommit=${(v) => actions.setProp(p, v)} />`;
    };
    return html`<div class="bm"><span class="bml">margin</span><div class="bmr">${i("margin-top")}</div>
        <div class="bmr mid">${i("margin-left")}<div class="bp"><span class="bml">padding</span><div class="bmr">${i("padding-top")}</div><div class="bmr mid">${i("padding-left")}<div class="bc">${s.tag}</div>${i("padding-right")}</div><div class="bmr">${i("padding-bottom")}</div></div>${i("margin-right")}</div>
        <div class="bmr">${i("margin-bottom")}</div></div>`;
}

/** Children stacked in the normal flow: make them a row, a column or a grid, keeping their spacing (editor.js arrange). */
const ArrangeRow = ({ s, actions }) => s.arrange ? html`<div class="arrange"><span>Arrange ${s.arrange.count} children</span>${[["row", "Row"], ["col", "Column"], ["grid", "Grid"]].map(([k, l]) => html`<button type="button" onClick=${() => actions.arrange(k)}>${l}</button>`)}</div>` : null;

const BOX = ["margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left"];

/** All the property sections, open or closed as the panel remembers (a free element opens Position offsets by itself). */
export function PropSections({ s, actions }) {
    const ui = useUi();
    return CSS_SECTIONS.map(([id, title, controls]) => {
        const props = controls === "box" ? BOX : controls.map((c) => c.p);
        const open = ui.open.has(id) || (id === "css-offsets" && s.geom && s.geom.abs && !ui.closed.has(id));
        return html`<${Section} title=${title} open=${open} set=${props.some((p) => ownsValue(srcOf(s, p)))} onToggle=${() => actions.toggleSection(id, open)}>
            ${id === "css-layout" && html`<${ArrangeRow} s=${s} actions=${actions} />`}
            ${controls === "box" ? html`<${PropBox} s=${s} actions=${actions} />` : controls.map((c) => html`<${PropRow} s=${s} c=${c} actions=${actions} />`)}
        </${Section}>`;
    });
}
