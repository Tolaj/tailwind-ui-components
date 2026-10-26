// The Design tab's "Tailwind extras" section as a component: the controls that have no single CSS property of their own (a
// gradient, a ring, space between children, transforms, motion and filters). Everything that is one CSS property lives in the
// property sections, which edit wherever the value comes from. It is made of the Tailwind-class controls of
// group-controls.js, which act through `actions` (see there) plus toggleSection(id, wasOpen).
import { html } from "../vendor/preact-htm.js";
import { val, EXTRA_KEYS } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { Section, Two } from "./controls.js";
import { GroupCombo, GroupSelect, GroupSeg, GroupColor } from "./group-controls.js";

const Sub = ({ first, children }) => html`<p class=${first ? "sub first" : "sub"}>${children}</p>`;

export function ExtrasSection({ s, actions }) {
    const ui = useUi();
    const open = ui.open.has("tw-extras");
    const combo = (k, label, cell = true) => html`<${GroupCombo} s=${s} k=${k} label=${label} cell=${cell} actions=${actions} />`;
    const select = (k, label) => html`<${GroupSelect} s=${s} k=${k} label=${label} actions=${actions} />`;
    const color = (k, label) => html`<${GroupColor} s=${s} k=${k} label=${label} actions=${actions} />`;
    return html`<${Section} title="Tailwind extras" open=${open} set=${EXTRA_KEYS.some((k) => val(s, k, ui))} onToggle=${() => actions.toggleSection("tw-extras", open)}>
        <${Sub} first>Gradient</${Sub}>${select("bgImage", "Direction")}${color("gradFrom", "From")}${color("gradVia", "Via")}${color("gradTo", "To")}
        <${Sub}>Ring</${Sub}><${Two}>${combo("ring", "Width")}<span></span></${Two}>${color("ringColor", "Color")}
        <${Sub}>Children and grid</${Sub}><${Two}>${combo("spaceX", "Space X")}${combo("spaceY", "Space Y")}</${Two}><${Two}>${combo("gridRows", "Rows")}${combo("order", "Order")}</${Two}>
        <${Two}>${combo("colSpan", "Col span")}${combo("rowSpan", "Row span")}</${Two}>${select("self", "Align self")}${select("flexNum", "Flex")}
        <${GroupSeg} s=${s} k="grow" label="Grow" items=${[["grow", "Grow"], ["grow-0", "No grow"]]} actions=${actions} />${combo("lineClamp", "Line clamp", false)}
        <${Sub}>Transform</${Sub}><${Two}>${combo("rotate", "Rotate")}${combo("scale", "Scale")}</${Two}><${Two}>${combo("translateX", "Move X")}${combo("translateY", "Move Y")}</${Two}>
        <${Sub}>Motion and filters</${Sub}>${select("transition", "Transition")}<${Two}>${combo("duration", "Time")}${combo("delay", "Delay")}</${Two}>${select("ease", "Easing")}
        ${select("blur", "Blur")}${select("backdropBlur", "Backdrop")}<${Two}>${combo("brightness", "Bright")}<span></span></${Two}>${select("grayscale", "Grayscale")}${select("userSelect", "Select")}
    </${Section}>`;
}
