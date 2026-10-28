// The Design tab's style sections after Position and Layout, laid out as Figma's: Appearance, Fill, Stroke, Effects, Typography,
// Margin and Other. Each starts from what the element already has: a fill, a stroke or an effect it has is shown as a row; one it
// has not is not, and the section's + adds it. Values the element's own styling gives are solid, defaults faint. Every edit goes
// through the same actions as the rest of the panel, so it is written where the value comes from:
//   setProp · setProps · resetProp · setPropLive · setPropDone · applyValue
import { html, useState } from "../vendor/preact-htm.js";
import { rgbToHex } from "./css-props.js";
import { srcOf, shownOf, styled } from "./panel-model.js";
import { TextInput, ColorInput } from "./controls.js";
import { I, IconBtn, NumField, FSection, Sub, PropField, num, owns, has, comp } from "./figma-sections.js";
import { PropRow } from "./prop-sections.js";

const SIDES = ["top", "right", "bottom", "left"];
const CORNERS = [["top-left", "radiusTL", "↖"], ["top-right", "radiusTR", "↗"], ["bottom-right", "radiusBR", "↘"], ["bottom-left", "radiusBL", "↙"]];
/** The alpha of an rgb() / rgba() colour: its fourth value, if it has one. */
const alphaOf = (c) => {
    const m = String(c).match(/^rgba?\(([^)]*)\)$/);
    const parts = m ? m[1].split(/[\s,/]+/).filter(Boolean) : [];
    if (parts.length < 4) return 1;
    return parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
};
const clear = (c) => !c || c === "transparent" || alphaOf(c) === 0;
/** The same value on every side (or corner), or "Mixed". */
const same = (s, props) => { const v = props.map((p) => comp(s, p)); return v.every((x) => x === v[0]) ? num(v[0]) : "Mixed"; };
const anyHas = (s, props) => props.some((p) => has(s, p));
/** A section header button: + to add, − to remove. */
const Add = ({ title, onClick }) => html`<${IconBtn} icon=${I.plus} title=${title} onClick=${onClick} />`;

/** A colour as Figma shows one: a swatch, its value (a Tailwind name where a class gives it, else hex), its opacity when not full. */
function ColorRow({ s, actions, p, all, group, onRemove, title }) {
    const src = srcOf(s, p), c = comp(s, p), hex = rgbToHex(c) || "#000000", a = alphaOf(c);
    const shown = src.source === "tailwind" ? shownOf(s, p, src) : hex.replace(/^#/, "").toUpperCase();
    const value = (v) => (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v.trim()) ? `#${v.trim()}` : v);
    // `all`: the colour goes on every one of these properties (a stroke's four sides), as one class where it can
    const commit = (v) => (all ? actions.setProps(all, value(v), group) : actions.setProp(p, value(v)));
    return html`<div class="frow">
        <div class=${`nf ${styled(src) ? "" : "unset"}`} title=${title || p}>
            <${ColorInput} class="cin" value=${hex} title="Pick a colour" hook=${{ "data-propcolor": p }}
                onLive=${(h) => (all ? actions.setPropsLive(all, h, group) : actions.setPropLive(p, h))}
                onDone=${(h, input) => (all ? actions.setPropsDone(all, h, group, input) : actions.setPropDone(p, h, input))} />
            <${TextInput} class="nfi" list="dl-colors" value=${shown} onCommit=${commit} />
            ${a < 1 && html`<span class="nfu">${Math.round(a * 100)}%</span>`}</div>
        ${onRemove && html`<${IconBtn} icon=${I.minus} title="Remove" onClick=${onRemove} />`}</div>`;
}

// ── Appearance: opacity and corner radius ──────────────────────────────────────────────────────────────────────────────────
export function AppearanceSection({ s, actions }) {
    const corners = CORNERS.map(([c]) => `border-${c}-radius`);
    const [each, setEach] = useState(false);
    const mixed = same(s, corners) === "Mixed";
    const op = comp(s, "opacity");
    return html`<${FSection} title="Appearance">
        <div class="frow">
            <${NumField} label="◐" title="Opacity" value=${op === "" ? "100" : String(Math.round(parseFloat(op) * 100))} set=${has(s, "opacity")}
                onCommit=${(t) => { const n = parseFloat(t); if (Number.isFinite(n)) actions.setProp("opacity", String(Math.max(0, Math.min(100, n)) / 100)); }}><span class="nfu">%</span></${NumField}>
            <${NumField} label="⌜" title="Corner radius" value=${same(s, corners)} set=${anyHas(s, corners)}
                onCommit=${(t) => actions.setProps(corners, t, "radius", CORNERS.map(([, k]) => k))} />
            <${IconBtn} icon=${I.corners} on=${each || mixed} title="Each corner on its own" onClick=${() => setEach(!each)} />
        </div>
        ${(each || mixed) && html`<div class="frow two2">${CORNERS.map(([c, k, l]) => html`<${NumField} label=${l} title=${`${c} radius`} value=${num(comp(s, `border-${c}-radius`))}
            set=${has(s, `border-${c}-radius`)} onCommit=${(t) => actions.setProps([`border-${c}-radius`], t, k)} />`)}</div>`}
    </${FSection}>`;
}

// ── Fill: the background colour, and an image or gradient ────────────────────────────────────────────────────────────────
export function FillSection({ s, actions }) {
    const color = !clear(comp(s, "background-color")), img = comp(s, "background-image"), image = img && img !== "none";
    const remove = (p) => (owns(s, p) ? actions.resetProp(p) : actions.setProp(p, p === "background-color" ? "transparent" : "none"));
    return html`<${FSection} title="Fill" extra=${!color && html`<${Add} title="Add a fill" onClick=${() => actions.setProp("background-color", "white")} />`}>
        ${color && html`<${ColorRow} s=${s} actions=${actions} p="background-color" title="Fill colour" onRemove=${() => remove("background-color")} />`}
        ${image && html`<div class="frow"><label class=${`nf ${has(s, "background-image") ? "" : "unset"}`} title=${img}><span class="nfl">${/gradient/.test(img) ? "Gradient" : "Image"}</span>
                <${TextInput} class="nfi" value=${shownOf(s, "background-image", srcOf(s, "background-image"))} onCommit=${(t) => actions.setProp("background-image", t)} /></label>
            <${IconBtn} icon=${I.minus} title="Remove" onClick=${() => remove("background-image")} /></div>
            ${/url\(/.test(img) && html`<${PropRow} s=${s} actions=${actions} c=${{ p: "background-size", l: "Size", t: "select", o: ["auto", "cover", "contain"] }} />
                <${PropRow} s=${s} actions=${actions} c=${{ p: "background-position", l: "Position", t: "text" }} />`}`}
    </${FSection}>`;
}

// ── Stroke: the border ────────────────────────────────────────────────────────────────────────────────────────────────────
export function StrokeSection({ s, actions }) {
    const widths = SIDES.map((d) => `border-${d}-width`), styles = SIDES.map((d) => `border-${d}-style`);
    const on = SIDES.some((d) => parseFloat(comp(s, `border-${d}-width`)) > 0 && comp(s, `border-${d}-style`) !== "none");
    const [each, setEach] = useState(false);
    const mixed = same(s, widths) === "Mixed";
    const add = () => {
        actions.setProps(widths, "1", "borderWidth", ["borderT", "borderR", "borderB", "borderL"]);
        if (comp(s, "border-top-style") === "none") actions.setProps(styles, "solid", "borderStyle"); // Tailwind's base styles already make it solid
    };
    // a stroke from classes loses them; one from CSS (or the design's stylesheet) gets a width of 0
    const remove = () => (widths.some((p) => srcOf(s, p).source === "tailwind")
        ? ["borderWidth", "borderT", "borderR", "borderB", "borderL", "borderColor", "borderStyle"].forEach((k) => actions.applyValue(k, "")) // its colour and style go with it
        : actions.setProps(widths, "0", "borderWidth"));
    if (!on) return html`<${FSection} title="Stroke" extra=${html`<${Add} title="Add a stroke (1px solid)" onClick=${add} />`} />`;
    const style = comp(s, "border-top-style");
    return html`<${FSection} title="Stroke" extra=${html`<${IconBtn} icon=${I.minus} title="Remove the stroke" onClick=${remove} />`}>
        <${ColorRow} s=${s} actions=${actions} p="border-top-color" all=${SIDES.map((d) => `border-${d}-color`)} group="borderColor" title="Stroke colour (every side)" />
        <div class="frow">
            <${NumField} label="≡" title="Stroke weight" value=${same(s, widths)} set=${anyHas(s, widths)} onCommit=${(t) => actions.setProps(widths, t, "borderWidth", ["borderT", "borderR", "borderB", "borderL"])} />
            <label class=${`nf ${anyHas(s, styles) ? "" : "unset"}`} title="Line style"><select class="nfs wide" onChange=${(e) => actions.setProps(styles, e.target.value, "borderStyle")}>
                ${["solid", "dashed", "dotted", "double"].map((v) => html`<option value=${v} selected=${style === v}>${v[0].toUpperCase() + v.slice(1)}</option>`)}</select></label>
            <${IconBtn} icon=${I.sides} on=${each || mixed} title="Each side on its own" onClick=${() => setEach(!each)} />
        </div>
        ${(each || mixed) && html`<div class="frow two2">${SIDES.map((d, i) => html`<${NumField} label=${["T", "R", "B", "L"][i]} title=${`${d} stroke`} value=${num(comp(s, `border-${d}-width`))}
            set=${has(s, `border-${d}-width`)} onCommit=${(t) => actions.setProps([`border-${d}-width`], t, ["borderT", "borderR", "borderB", "borderL"][i])} />`)}</div>`}
    </${FSection}>`;
}

// ── Effects: shadows and blurs ────────────────────────────────────────────────────────────────────────────────────────────
// the CSS each Tailwind shadow stands for, written when the element is styled with CSS rather than classes
const SHADOWS = {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)", default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)", inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
};
const BLURS = ["sm", "default", "md", "lg", "xl", "2xl", "3xl"];
function EffectRow({ label, value, options, custom, onPick, onRemove, set }) {
    const opts = options.includes(value) ? options : [value, ...options];
    return html`<div class="frow"><label class=${`nf ${set ? "" : "unset"}`}><span class="nfl">${label}</span>
        <select class="nfs wide" onChange=${(e) => { if (!(custom && e.target.value === value)) onPick(e.target.value); }}>${opts.map((v) => html`<option value=${v} selected=${v === value}>${v === value && custom ? "Custom" : v}</option>`)}</select></label>
        <${IconBtn} icon=${I.minus} title="Remove" onClick=${onRemove} /></div>`;
}
export function EffectsSection({ s, actions }) {
    const sh = comp(s, "box-shadow"), shadow = sh && sh !== "none", inner = /inset/.test(sh);
    const shTok = (srcOf(s, "box-shadow").token || "").replace(/^(?:[\w-]+:)*/, ""), shName = shTok === "shadow" ? "default" : shTok.replace(/^shadow-/, "");
    const blurOf = (p) => { const m = comp(s, p).match(/blur\(([\d.]+)px\)/); return m ? Number(m[1]) : 0; };
    const blur = blurOf("filter"), back = blurOf("backdrop-filter");
    const blurName = (n) => ({ 4: "sm", 8: "default", 12: "md", 16: "lg", 24: "xl", 40: "2xl", 64: "3xl" }[n] || `${n}px`);
    const setShadow = (v) => actions.setProp("box-shadow", v, SHADOWS[v] || v);
    const add = (kind) => {
        if (kind === "drop") setShadow("md");
        if (kind === "inner") setShadow("inner");
        if (kind === "blur") actions.applyValue("blur", "md");
        if (kind === "back") actions.applyValue("backdropBlur", "md");
    };
    return html`<${FSection} title="Effects" extra=${html`<label class="ib addsel" title="Add an effect">${I.plus}<select onChange=${(e) => { add(e.target.value); e.target.value = ""; }}>
            <option value="" selected>Add an effect</option>${!shadow && html`<option value="drop">Drop shadow</option><option value="inner">Inner shadow</option>`}
            ${!blur && html`<option value="blur">Layer blur</option>`}${!back && html`<option value="back">Background blur</option>`}</select></label>`}>
        ${shadow && html`<${EffectRow} label=${inner ? "Inner shadow" : "Drop shadow"} value=${shName || "custom"} custom=${!shName} set=${has(s, "box-shadow")}
            options=${inner ? ["inner"] : ["sm", "default", "md", "lg", "xl", "2xl"]} onPick=${setShadow}
            onRemove=${() => (owns(s, "box-shadow") ? actions.resetProp("box-shadow") : actions.setProp("box-shadow", "none"))} />`}
        ${blur > 0 && html`<${EffectRow} label="Layer blur" value=${blurName(blur)} options=${BLURS} set=${has(s, "filter")} onPick=${(v) => actions.applyValue("blur", v === "default" ? "default" : v)} onRemove=${() => actions.applyValue("blur", "")} />`}
        ${back > 0 && html`<${EffectRow} label="Background blur" value=${blurName(back)} options=${BLURS} set=${has(s, "backdrop-filter")} onPick=${(v) => actions.applyValue("backdropBlur", v)} onRemove=${() => actions.applyValue("backdropBlur", "")} />`}
    </${FSection}>`;
}

// ── Typography ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const TYPE = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "color", "text-decoration-line", "text-transform", "font-style", "white-space"];
const WEIGHTS = [["100", "Thin"], ["200", "Extra light"], ["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["800", "Extra bold"], ["900", "Black"]];
const FAMILIES = [["sans", "Sans", "ui-sans-serif, system-ui, sans-serif"], ["serif", "Serif", "ui-serif, Georgia, serif"], ["mono", "Mono", "ui-monospace, SFMono-Regular, monospace"]];
const MORE_TYPE = [
    { p: "text-decoration-line", l: "Decor", t: "select", o: ["none", "underline", "line-through", "overline"] },
    { p: "text-transform", l: "Case", t: "select", o: ["none", "uppercase", "lowercase", "capitalize"] },
    { p: "font-style", l: "Style", t: "select", o: ["normal", "italic"] },
    { p: "white-space", l: "Wrap", t: "select", o: ["normal", "nowrap", "pre", "pre-wrap", "pre-line"] },
];
export function TypographySection({ s, actions }) {
    const [open, setOpen] = useState(false);
    const [more, setMore] = useState(false);
    const shown = open || s.ownText || s.tag === "body" || anyHas(s, TYPE);
    if (!shown) return html`<${FSection} title="Typography" extra=${html`<${Add} title="Set this element's text style (its children inherit it)" onClick=${() => setOpen(true)} />`} />`;
    const fam = comp(s, "font-family"), famName = (fam.split(",")[0] || "").replace(/["']/g, "").trim();
    const known = FAMILIES.find(([, , stack]) => fam.includes(stack.split(",")[0]));
    const align = comp(s, "text-align");
    const al = (v, icon, title) => html`<${IconBtn} icon=${icon} title=${title} on=${align === v || (v === "left" && align === "start")} onClick=${() => actions.setProp("text-align", v)} />`;
    const extra = MORE_TYPE.filter((c) => more || has(s, c.p) || (c.p === "text-decoration-line" && comp(s, c.p) !== "none" && comp(s, c.p) !== ""));
    return html`<${FSection} title="Typography" extra=${html`<${IconBtn} icon=${I.dots} on=${more} title=${more ? "Fewer text settings" : "Decoration, case, italic, wrapping"} onClick=${() => setMore(!more)} />`}>
        <div class="frow"><label class=${`nf ${has(s, "font-family") ? "" : "unset"}`} title=${fam}>
            <select class="nfs wide" onChange=${(e) => { const f = FAMILIES.find(([v]) => v === e.target.value); if (f) actions.setProp("font-family", f[0], f[2]); }}>
                ${!known && html`<option value="" selected>${famName || "Font"}</option>`}
                ${FAMILIES.map(([v, l]) => html`<option value=${v} selected=${known && known[0] === v}>${l}</option>`)}</select></label></div>
        <div class="frow">
            <label class=${`nf ${has(s, "font-weight") ? "" : "unset"}`}><select class="nfs wide" title="Weight" onChange=${(e) => actions.setProp("font-weight", e.target.value)}>
                ${WEIGHTS.map(([v, l]) => html`<option value=${v} selected=${comp(s, "font-weight") === v}>${l}</option>`)}</select></label>
            <${PropField} s=${s} actions=${actions} p="font-size" label="Aa" title="Font size" />
        </div>
        <div class="frow">
            <${PropField} s=${s} actions=${actions} p="line-height" label="↕" title="Line height" />
            <${PropField} s=${s} actions=${actions} p="letter-spacing" label="↔" title="Letter spacing" />
        </div>
        <div class="frow"><div class="ibg wide">${al("left", I.textL, "Align left")}${al("center", I.textC, "Align centre")}${al("right", I.textR, "Align right")}${al("justify", I.textJ, "Justify")}</div></div>
        <${ColorRow} s=${s} actions=${actions} p="color" title="Text colour" />
        ${extra.map((c) => html`<${PropRow} s=${s} actions=${actions} c=${c} />`)}
    </${FSection}>`;
}

// ── Margin ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function MarginSection({ s, actions }) {
    const f = (d, l) => html`<${PropField} s=${s} actions=${actions} p=${`margin-${d}`} label=${l} title=${`margin-${d} (auto works too)`} />`;
    return html`<${FSection} title="Margin"><div class="frow two2">${f("top", "T")}${f("right", "R")}${f("bottom", "B")}${f("left", "L")}</div></${FSection}>`;
}

// ── Other: the rest, only what is set, and + to add one ────────────────────────────────────────────────────────────────────
const OTHER = [
    { p: "cursor", l: "Cursor", t: "select", o: ["auto", "default", "pointer", "text", "move", "not-allowed", "grab", "crosshair"] },
    { p: "mix-blend-mode", l: "Blend", t: "select", o: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference"] },
    { p: "pointer-events", l: "Pointer", t: "select", o: ["auto", "none"] },
    { p: "object-fit", l: "Object fit", t: "select", o: ["fill", "contain", "cover", "none", "scale-down"] },
    { p: "transform", l: "Transform", t: "text" },
    { p: "transition", l: "Transition", t: "text" },
    { p: "outline", l: "Outline", t: "text" },
];
export function OtherSection({ s, actions }) {
    const [added, setAdded] = useState(/** @type {string[]} */ ([]));
    const media = ["img", "video", "picture"].includes(s.tag);
    const rows = OTHER.filter((c) => has(s, c.p) || added.includes(c.p) || (c.p === "object-fit" && media));
    const left = OTHER.filter((c) => !rows.includes(c));
    return html`<${FSection} title="Other" extra=${left.length > 0 && html`<label class="ib addsel" title="Add a property">${I.plus}<select onChange=${(e) => { if (e.target.value) setAdded([...added, e.target.value]); e.target.value = ""; }}>
            <option value="" selected>Add a property</option>${left.map((c) => html`<option value=${c.p}>${c.l}</option>`)}</select></label>`}>
        ${rows.map((c) => html`<${PropRow} s=${s} actions=${actions} c=${c} />`)}
    </${FSection}>`;
}
