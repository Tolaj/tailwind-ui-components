// The Design tab's "Position and size" section as a component: X, Y, W, H and rotation, Free position, aligning and spreading
// selected elements, grouping them, and the note that a flex parent decides an item's size. It acts through `actions`, which
// the editor provides:
//   setGeom(key, text) · freePosition(on) · align(mode) · group() · ungroup() · autoLayout() · sizeItMyself() · toggleSection(id, wasOpen)
import { html } from "../vendor/preact-htm.js";
import { val } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { Section, Two, Field, TextInput } from "./controls.js";

/** A child that flex sizes along its axis ignores a width (or height) set on it: say so, with a one-click way out. */
function FlexNote({ s, actions }) {
    const f = s.flexItem;
    if (!f || !f.sized) return null;
    const what = f.dir === "row" ? "width" : "height";
    return html`<p class="hintnote">Its ${what} is set by the flex layout: it grows to fill the ${f.dir === "row" ? "row" : "column"}, so a ${what} you set here has no effect. <button type="button" onClick=${actions.sizeItMyself}>Size it myself</button></p>`;
}

const BTN = "flex-1 rounded border border-neutral-200 py-1 text-[10px] hover:bg-neutral-50";
const Btn = ({ title, onClick, children }) => html`<button type="button" title=${title} class=${BTN} onClick=${onClick}>${children}</button>`;

/** X, Y and rotation only mean something for a free (absolute) element; the others always do. */
function GeomField({ k, label, value, enabled, actions }) {
    return html`<${Field} cell label=${label} extra=${enabled ? "" : "opacity-50"}><${TextInput} value=${value ?? ""} disabled=${!enabled} onCommit=${(text) => actions.setGeom(k, text)} /></${Field}>`;
}

export function GeomSection({ s, actions }) {
    const ui = useUi();
    const g = s.geom || {};
    const abs = Boolean(g.abs);
    const count = s.count || 1;
    const open = ui.open.has("geom");
    const align = (mode, label, title) => html`<${Btn} title=${title} onClick=${() => actions.align(mode)}>${label}</${Btn}>`;
    return html`<${Section} title="Position and size" open=${open} set=${Boolean(val(s, "w", ui))} onToggle=${() => actions.toggleSection("geom", open)}>
        <${FlexNote} s=${s} actions=${actions} />
        <${Two}><${GeomField} k="x" label="X" value=${g.x} enabled=${abs} actions=${actions} /><${GeomField} k="y" label="Y" value=${g.y} enabled=${abs} actions=${actions} /></${Two}>
        <${Two}><${GeomField} k="w" label="W" value=${g.w} enabled=${true} actions=${actions} /><${GeomField} k="h" label="H" value=${g.h} enabled=${true} actions=${actions} /></${Two}>
        <${Two}><${GeomField} k="rot" label="Rot" value=${g.rot} enabled=${abs} actions=${actions} />
            <button type="button" title="Position this element freely (position: absolute) so you can drag it anywhere" onClick=${() => actions.freePosition(!abs)}
                class=${`h-6 rounded-md border ${abs ? "border-[#111] bg-[#e5f4ff] text-[#111]" : "border-neutral-200 hover:bg-neutral-50"} text-[11px]`}>${abs ? "Free position ✓" : "Free position"}</button></${Two}>
        ${abs && html`<div class="flex gap-1">${align("left", "Left", "Align left")}${align("hcenter", "Center", "Align horizontal centers")}${align("right", "Right", "Align right")}${align("top", "Top", "Align top")}${align("vcenter", "Middle", "Align vertical centers")}${align("bottom", "Bottom", "Align bottom")}</div>`}
        ${count > 2 && html`<div class="flex gap-1">${align("distribute-h", "Space horizontally", "Distribute horizontally")}${align("distribute-v", "Space vertically", "Distribute vertically")}</div>`}
        <div class="flex gap-1">
            ${count > 1 && html`<${Btn} title="Ctrl/Cmd+G" onClick=${actions.group}>Group</${Btn}><${Btn} title="Shift+A: line them up in a row or column with even spacing" onClick=${actions.autoLayout}>Auto layout</${Btn}>`}
            ${abs && html`<${Btn} title="Ctrl/Cmd+Shift+G" onClick=${actions.ungroup}>Ungroup</${Btn}>`}
        </div>
    </${Section}>`;
}
