// The top of the Design tab as components: where the element is (crumbs), what tag it is, what you can do with it, how edits
// are written (legend, breakpoint and state), and what it says (content). They read the panel's state (breakpoint, state, the
// frame's breakpoint) through useUi() and act through `actions`, which the editor provides:
//   select(path) · move(dir) · duplicate() · remove() · setTag(tag) · setBreakpoint(bp) · setState(st) · setText(text) · setAttr(name, value)
import { html, useState } from "../vendor/preact-htm.js";
import { BREAKPOINT_WIDTH, parseToken } from "@windcraft/core/class-groups.js";
import { TAG_KINDS, variant, modeFor } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { TextInput, TextArea, SelectInput, Field } from "./controls.js";
import { I, IconBtn } from "./figma-sections.js";

const Crumbs = ({ s, actions }) => html`<div class="crumbs">${s.crumbs.map((c, i) => html`${i > 0 && html`<span class="sl">/</span>`}<button type="button" class=${i === s.crumbs.length - 1 ? "cur" : ""} onClick=${() => actions.select(c.path || [])}>${c.tag}</button>`)}</div>`;

/**
 * The element's tag (only tags that stay valid where it sits and for what it holds, grouped by kind) and what can be done with
 * it: move earlier / later among its siblings, duplicate, delete. One compact row under the crumbs.
 */
const ElementBar = ({ s, actions }) => {
    const opts = s.tagOptions || [];
    const many = (s.count || 1) > 1;
    const groups = TAG_KINDS.map(([label, re]) => [label, opts.filter((t) => re.test(t)).map((t) => [t, `<${t}>`])]).filter(([, list]) => list.length);
    const canTag = opts.length > 1 && !many;
    if (s.tag === "body") return null;
    return html`<div class="ebar">
        <label class=${`nf etag ${canTag ? "" : "off"}`} title=${canTag ? "Change the tag (only tags that stay valid here are listed)" : "This tag can't change here"}>
            <span class="nfl">Tag</span>${canTag
                ? html`<${SelectInput} class="nfs wide" value=${s.tag} groups=${groups} onChange=${actions.setTag} />`
                : html`<span class="nfi etagv">${many ? `${s.count} selected` : `<${s.tag}>`}</span>`}</label>
        <div class="ibg">
            <${IconBtn} icon=${I.up} title="Move earlier (before the previous sibling)" onClick=${() => actions.move(-1)} />
            <${IconBtn} icon=${I.down} title="Move later (after the next sibling)" onClick=${() => actions.move(1)} />
            <${IconBtn} icon=${I.copy} title="Duplicate (Ctrl/Cmd+D)" onClick=${actions.duplicate} />
            <button type="button" class="ib danger" title="Delete (Del)" onClick=${actions.remove}>${I.trash}</button>
        </div></div>`;
};

const Legend = ({ s }) => html`<p class="legend"><span class="stag tw">TW</span> Tailwind class <span class="stag css">CSS</span> style. Edits go where the value comes from; anything new is written as ${modeFor(s, useUi()) === "tailwind" ? "Tailwind" : "CSS"}.</p>`;

/**
 * Where edits go, as a frontend developer thinks of it: Screen (all sizes, or from a breakpoint up: md:) and State (default, or
 * hover:, focus:...). With All and Default an edit is a plain class. A dot marks a breakpoint or state this element already has
 * classes for; picking a breakpoint also takes the frame to its width, so what is edited is what is seen.
 */
const SCREENS = [["", "All"], ["sm", "sm"], ["md", "md"], ["lg", "lg"], ["xl", "xl"], ["2xl", "2xl"]];
const MAIN_STATES = [["", "Default"], ["hover", "Hover"], ["focus", "Focus"]]; // the rest in the + menu; any this element uses gets a chip
/** Every state Tailwind has a prefix for, grouped as the + menu shows them: [prefix, label, when it applies]. */
const STATE_GROUPS = [
    ["Interaction", [["hover", "Hover", "on hover"], ["focus", "Focus", "when focused"], ["focus-visible", "Focus visible", "when focused from the keyboard"], ["focus-within", "Focus within", "when something inside is focused"], ["active", "Active", "while pressed"], ["visited", "Visited", "once the link was visited"]]],
    ["Form", [["disabled", "Disabled", "when disabled"], ["checked", "Checked", "when checked"], ["required", "Required", "when required"], ["invalid", "Invalid", "when its value is invalid"], ["placeholder-shown", "Placeholder shown", "while the placeholder shows"], ["read-only", "Read only", "when read-only"]]],
    ["Children", [["first", "First", "on the first child"], ["last", "Last", "on the last child"], ["odd", "Odd", "on odd children"], ["even", "Even", "on even children"], ["only", "Only", "on an only child"], ["empty", "Empty", "when it has nothing inside"]]],
    ["Parent and sibling", [["group-hover", "Group hover", "when its .group parent is hovered"], ["group-focus", "Group focus", "when its .group parent is focused"], ["peer-hover", "Peer hover", "when the .peer before it is hovered"], ["peer-focus", "Peer focus", "when the .peer before it is focused"], ["peer-checked", "Peer checked", "when the .peer before it is checked"]]],
    ["Parts", [["placeholder", "Placeholder", "its placeholder text"], ["before", "Before", "its ::before"], ["after", "After", "its ::after"], ["selection", "Selection", "selected text in it"], ["marker", "Marker", "its list markers"], ["file", "File button", "its file-input button"]]],
    ["Theme and media", [["dark", "Dark", "in dark mode"], ["print", "Print", "when printed"], ["motion-reduce", "Reduced motion", "when motion is reduced"]]],
];
const STATE_INFO = Object.fromEntries(STATE_GROUPS.flatMap(([, list]) => list.map(([v, l, w]) => [v, { label: l, when: w }])));
const STATE_WORDS = Object.fromEntries(Object.entries(STATE_INFO).map(([v, i]) => [v, i.when]));
// the states the canvas can show on the selected element (the rest apply on their own: disabled, first, dark...)
const SHOWABLE = new Set(["hover", "focus", "focus-visible", "focus-within", "active", "group-hover", "group-focus", "peer-hover", "peer-focus"]);

/** The + menu: every state, grouped, the ones this element uses marked; picking one makes it the state edits go to. */
function StateMenu({ used, current, onPick }) {
    const [open, setOpen] = useState(false);
    return html`<div class="vadd">
        <button type="button" class=${`vchip vplus ${open ? "on" : ""}`} title="More states (disabled, first, dark, group-hover…)" onClick=${() => setOpen(!open)}>+</button>
        ${open && html`<div class="vpop" onMouseLeave=${() => setOpen(false)}>
            ${STATE_GROUPS.map(([g, list]) => html`<p class="vpg">${g}</p><div class="vpl">${list.map(([v, l, w]) => html`<button type="button"
                class=${`vpi ${current === v ? "on" : ""}`} title=${`${w} (${v}:)`} onClick=${() => { setOpen(false); onPick(v); }}>${l}${used.has(v) && html`<i></i>`}</button>`)}</div>`)}
        </div>`}</div>`;
}

const VariantBar = ({ s, actions }) => {
    const ui = useUi(), prefix = variant(ui);
    // the breakpoints and states this element has classes for
    const used = { bp: new Set(), st: new Set() };
    String(s.classes || "").split(/\s+/).filter(Boolean).forEach((t) => {
        const v = parseToken(t).variant.split(":").filter(Boolean);
        v.forEach((x) => (BREAKPOINT_WIDTH[x] !== undefined ? used.bp.add(x) : used.st.add(x)));
    });
    const chip = (on, dot, label, title, onClick) => html`<button type="button" class=${`vchip ${on ? "on" : ""}`} title=${title} onClick=${onClick}>${label}${dot && html`<i></i>`}</button>`;
    // states beyond the four main ones that this element uses, or that is picked: a chip of their own, one click away
    const others = [...new Set([...used.st, ui.st].filter((x) => x && !MAIN_STATES.some(([m]) => m === x)))];
    const where = [ui.bp && `from ${BREAKPOINT_WIDTH[ui.bp]}px wide`, ui.st && STATE_WORDS[ui.st]].filter(Boolean).join(", ");
    const hidden = ui.bp && ui.frameW && ui.frameW < BREAKPOINT_WIDTH[ui.bp]; // the frame is narrower: these classes don't show there
    return html`<div class="vbar2">
        <div class="vrow"><span class="vl">Screen</span><div class="vchips">${SCREENS.map(([v, l]) => chip(ui.bp === v, v && used.bp.has(v), l,
            v ? `${l}: ${BREAKPOINT_WIDTH[v]}px and wider (${v}:)${used.bp.has(v) ? " · this element has classes here" : ""}` : "Every screen size (plain classes)",
            () => actions.setBreakpoint(ui.bp === v ? "" : v)))}</div></div>
        <div class="vrow vtop"><span class="vl">State</span><div class="vstates">
            <div class="vchips">${MAIN_STATES.map(([v, l]) => chip(ui.st === v, v && used.st.has(v), l,
                v ? `${STATE_WORDS[v]} (${v}:)${used.st.has(v) ? " · this element has classes here" : ""}` : "Its normal look (no state)", () => actions.setState(ui.st === v ? "" : v)))}
                <${StateMenu} used=${used.st} current=${ui.st} onPick=${(v) => actions.setState(v)} /></div>
            ${others.length > 0 && html`<div class="vchips vextra">${others.map((v) => chip(ui.st === v, used.st.has(v), (STATE_INFO[v] || {}).label || v,
                `${STATE_WORDS[v] || v} (${v}:)${used.st.has(v) ? " · this element has classes here" : ""}`, () => actions.setState(ui.st === v ? "" : v)))}</div>`}
        </div></div>
        ${prefix && html`<p class="vnote on">Editing <code>${prefix}</code> styles: ${where}.${ui.st && SHOWABLE.has(ui.st) ? " The selected element shows this state on the canvas." : ""} Fields show this element's ${prefix} values; faint ones are inherited.
            ${hidden ? html` The frame is narrower than ${BREAKPOINT_WIDTH[ui.bp]}px, so they don't show in it.` : null}
            <button type="button" onClick=${() => { actions.setBreakpoint(""); actions.setState(""); }}>Back to all</button></p>`}
    </div>`;
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
    return html`<${Crumbs} s=${s} actions=${actions} /><${ElementBar} s=${s} actions=${actions} />
        <${Legend} s=${s} /><${VariantBar} s=${s} actions=${actions} /><${Content} s=${s} actions=${actions} />`;
}
