// One CSS property as a row of the Properties panel (used by style-sections.js for the settings that are not a Figma field):
// its label, a control for its kind, where its value comes from (a Tailwind class, the element's style attribute, the design's
// own CSS, or a parent), and a × to take it off. It edits the property where it comes from, through `actions`:
//   setProp(prop, value) · setPropLive(prop, hex) · setPropDone(prop, hex, input) · resetProp(prop)
import { html } from "../vendor/preact-htm.js";
import { rgbToHex } from "./css-props.js";
import { variantOf } from "@windcraft/core/prop-tailwind.js";
import { srcOf, shownOf, ownsValue, styled } from "./panel-model.js";
import { TextInput, SelectInput, Segmented, ColorInput } from "./controls.js";

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
export function PropRow({ s, c, actions }) {
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
    return html`<div class=${`row ${styled(src) ? "" : "unset"}`} title=${c.p}><span class="lbl">${c.l}</span><div class="flex min-w-0 flex-1 items-center gap-1">${control}<${SourceTag} src=${src} />
        ${ownsValue(src) && html`<button type="button" class="rst" title=${src.source === "tailwind" ? `Remove ${src.token}` : "Remove the inline value"} onClick=${() => actions.resetProp(c.p)}>×</button>`}</div></div>`;
}
