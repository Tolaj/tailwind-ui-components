// The Design tab's style sections after Position, Layout and the flex / grid item, named as a frontend developer knows them:
// Typography, Background, Border, Effects, Transform, Motion, Interaction and Margin, then a box to add any class or CSS. Each
// starts from what the element already has: a background, a border or an effect it has is a row; one it has not is not, and the
// section's + adds it. Set values are solid and marked with where they come from (a class or CSS), with a × to take them off;
// defaults are faint. Every edit goes through the same actions as the rest of the panel, so it is written where the value comes
// from: setProp · setProps · resetProp · setPropLive · setPropDone · setPropsLive · setPropsDone · applyValue · applyColor · addClasses
import { html, useState } from "../vendor/preact-htm.js";
import { rgbToHex } from "./css-props.js";
import { srcOf, shownOf, styled, val } from "./panel-model.js";
import { useUi } from "./panel-state.js";
import { TextInput, ColorInput } from "./controls.js";
import { GroupColor } from "./group-controls.js";
import { I, IconBtn, NumField, FSection, Sub, PropField, PropSelect, TwField, TwSelect, num, owns, has, comp, srcKind, srcNote } from "./figma-sections.js";
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
const firstSrc = (s, props) => props.map((p) => srcKind(s, p)).find(Boolean) || "";
/** A + that opens a short menu of what can be added (only what the element does not have yet). `items`: [value, label]. */
const AddMenu = ({ title, items, onPick }) => (items.length ? html`<label class="ib addsel" title=${title}>${I.plus}<select onChange=${(e) => { const v = e.target.value; e.target.value = ""; if (v) onPick(v); }}>
    <option value="" selected>${title}</option>${items.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select></label>` : null);
/** − takes a style off the element (its tooltip says which); a row that has no value yet gets × to cancel instead. */
const Remove = ({ title, onClick }) => html`<${IconBtn} icon=${I.minus} title=${title} onClick=${onClick} />`;
const Cancel = ({ onClick }) => html`<${IconBtn} icon=${I.close} title="Cancel" onClick=${onClick} />`;

/** A colour as a row: a swatch, its value (a Tailwind name where a class gives it, else hex), its opacity when not full. */
function ColorRow({ s, actions, p, all, group, onRemove, removeTitle, title, label }) {
    const src = srcOf(s, p), c = comp(s, p), hex = rgbToHex(c) || "#000000", a = alphaOf(c);
    const shown = src.source === "tailwind" ? shownOf(s, p, src) : hex.replace(/^#/, "").toUpperCase();
    const value = (v) => (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v.trim()) ? `#${v.trim()}` : v);
    // `all`: the colour goes on every one of these properties (a border's four sides), as one class where it can
    const commit = (v) => (all ? actions.setProps(all, value(v), group) : actions.setProp(p, value(v)));
    return html`<div class="frow">
        <div class=${`nf ${styled(src) ? "" : "unset"} ${srcKind(s, p) ? `src-${srcKind(s, p)}` : ""}`} title=${`${title || p} · ${srcNote(s, p)}`}>
            ${label && html`<span class="nfl">${label}</span>`}
            <${ColorInput} class="cin" value=${hex} title="Pick a colour" hook=${{ "data-propcolor": p }}
                onLive=${(h) => (all ? actions.setPropsLive(all, h, group) : actions.setPropLive(p, h))}
                onDone=${(h, input) => (all ? actions.setPropsDone(all, h, group, input) : actions.setPropDone(p, h, input))} />
            <${TextInput} class="nfi" list="dl-colors" value=${shown} onCommit=${commit} />
            ${a < 1 && html`<span class="nfu">${Math.round(a * 100)}%</span>`}</div>
        ${onRemove && html`<${Remove} title=${removeTitle || "Remove"} onClick=${onRemove} />`}</div>`;
}

// ── Typography ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const TYPE = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "color", "text-decoration-line", "text-transform", "font-style", "white-space"];
const WEIGHTS = [["100", "100 Thin"], ["200", "200 Extra light"], ["300", "300 Light"], ["400", "400 Regular"], ["500", "500 Medium"], ["600", "600 Semibold"], ["700", "700 Bold"], ["800", "800 Extra bold"], ["900", "900 Black"]];
// the three Tailwind families as words (font-sans...), with their stack as the CSS to write when the element is styled with CSS
const STACKS = { sans: "ui-sans-serif, system-ui, sans-serif", serif: "ui-serif, Georgia, serif", mono: "ui-monospace, SFMono-Regular, monospace" };
const MORE_TYPE = [
    { p: "text-decoration-line", l: "Decor", t: "select", o: ["none", "underline", "line-through", "overline"] },
    { p: "text-transform", l: "Case", t: "select", o: ["none", "uppercase", "lowercase", "capitalize"] },
    { p: "font-style", l: "Style", t: "select", o: ["normal", "italic"] },
    { p: "white-space", l: "Wrap", t: "select", o: ["normal", "nowrap", "pre", "pre-wrap", "pre-line"] },
];
export function TypographySection({ s, actions }) {
    const [open, setOpen] = useState(false);
    const [more, setMore] = useState(false);
    const ui = useUi();
    const shown = open || s.ownText || s.tag === "body" || anyHas(s, TYPE);
    if (!shown) return html`<${FSection} title="Typography" extra=${html`<${IconBtn} icon=${I.plus} title="Set this element's text style (its children inherit it)" onClick=${() => setOpen(true)} />`} />`;
    const fam = comp(s, "font-family"), src = srcOf(s, "font-family");
    const famShown = src.source === "tailwind" ? shownOf(s, "font-family", src) : (fam.split(",")[0] || "").replace(/["']/g, "").trim();
    const setFont = (t) => { const v = t.trim().toLowerCase(); return STACKS[v] ? actions.setProp("font-family", v, STACKS[v]) : actions.setProp("font-family", t.trim()); };
    const align = comp(s, "text-align");
    const al = (v, icon, title) => html`<${IconBtn} icon=${icon} title=${title} on=${align === v || (v === "left" && align === "start")} onClick=${() => actions.setProp("text-align", v)} />`;
    const extra = MORE_TYPE.filter((c) => more || has(s, c.p));
    const clamp = val(s, "lineClamp", ui), trunc = val(s, "textOverflow", ui);
    const own = TYPE.filter((p) => owns(s, p));
    const removeAll = () => {
        own.forEach((p) => actions.resetProp(p));
        if (clamp) actions.applyValue("lineClamp", "");
        if (trunc) actions.applyValue("textOverflow", "");
        setOpen(false); setMore(false);
    };
    return html`<${FSection} title="Typography" extra=${html`${(own.length > 0 || clamp || trunc || (open && !s.ownText)) && html`<${Remove} title=${own.length || clamp || trunc ? "Remove this element's text styles (it goes back to what it inherits)" : "Close"} onClick=${removeAll} />`}
        <${IconBtn} icon=${I.dots} on=${more} title=${more ? "Fewer text settings" : "Decoration, case, italic, wrapping, line clamp, truncate"} onClick=${() => setMore(!more)} />`}>
        <div class="frow"><${NumField} label="Font" title=${`font-family: ${fam} · ${srcNote(s, "font-family")} (type any font, or sans / serif / mono)`} value=${famShown} list="dl-fonts"
            set=${has(s, "font-family")} src=${srcKind(s, "font-family")} onReset=${owns(s, "font-family") ? () => actions.resetProp("font-family") : null} onCommit=${setFont} /></div>
        <div class="frow">
            <${PropSelect} s=${s} actions=${actions} p="font-weight" title="Weight" options=${WEIGHTS} />
            <${PropField} s=${s} actions=${actions} p="font-size" label="Size" title="Font size (px, or text-sm, 2xl...)" list="dl-fontSize" />
        </div>
        <div class="frow">
            <${PropField} s=${s} actions=${actions} p="line-height" label="Line" title="Line height" list="dl-leading" />
            <${PropField} s=${s} actions=${actions} p="letter-spacing" label="Letter" title="Letter spacing" list="dl-tracking" />
        </div>
        <div class="frow"><div class="ibg wide">${al("left", I.textL, "Align left")}${al("center", I.textC, "Align centre")}${al("right", I.textR, "Align right")}${al("justify", I.textJ, "Justify")}</div></div>
        <${ColorRow} s=${s} actions=${actions} p="color" title="Text colour" />
        ${extra.map((c) => html`<${PropRow} s=${s} actions=${actions} c=${c} />`)}
        ${(more || clamp || trunc) && html`<div class="frow"><${TwField} s=${s} k="lineClamp" label="Clamp" title="Show at most this many lines (line-clamp-*)" actions=${actions} />
            <${TwSelect} s=${s} k="textOverflow" label="Cut" title="Cut long text off with … (truncate)" actions=${actions} /></div>`}
    </${FSection}>`;
}

// ── Background: a colour, a gradient, an image ───────────────────────────────────────────────────────────────────────────
export function BackgroundSection({ s, actions }) {
    const ui = useUi();
    const [adding, setAdding] = useState("");
    const color = !clear(comp(s, "background-color")), img = comp(s, "background-image");
    const grad = Boolean(val(s, "bgImage", ui)) || adding === "gradient";
    const imgSet = Boolean(img) && img !== "none" && !/gradient/.test(img), image = imgSet || adding === "image";
    const cssGrad = /gradient/.test(img) && !val(s, "bgImage", ui); // a gradient from CSS: shown as its value
    // a value this element sets comes off; one from the design's CSS is covered (transparent / none)
    const remove = (p) => (owns(s, p) ? actions.resetProp(p) : actions.setProp(p, p === "background-color" ? "transparent" : "none"));
    const add = (kind) => {
        if (kind === "color") actions.setProp("background-color", "white");
        if (kind === "gradient") { setAdding("gradient"); actions.applyValue("bgImage", "bg-gradient-to-r"); }
        if (kind === "image") setAdding("image");
    };
    const items = [!color && ["color", "Colour"], !grad && !cssGrad && ["gradient", "Gradient"], !image && ["image", "Bg image"]].filter(Boolean);
    return html`<${FSection} title="Background" extra=${html`<${AddMenu} title="Add a background" items=${items} onPick=${add} />`}>
        ${color && html`<${ColorRow} s=${s} actions=${actions} p="background-color" title="Background colour" removeTitle="Remove the background colour" onRemove=${() => remove("background-color")} />`}
        ${grad && html`<div class="frow"><${TwSelect} s=${s} k="bgImage" label="Gradient" title="Gradient direction (bg-gradient-to-*)" actions=${actions} />
                <${Remove} title="Remove the gradient" onClick=${() => { setAdding(""); ["bgImage", "gradFrom", "gradVia", "gradTo"].forEach((k) => actions.applyValue(k, "")); }} /></div>
            <${GroupColor} s=${s} k="gradFrom" label="From" actions=${actions} /><${GroupColor} s=${s} k="gradVia" label="Via" actions=${actions} /><${GroupColor} s=${s} k="gradTo" label="To" actions=${actions} />`}
        ${(image || cssGrad) && html`<div class="frow">
                <${NumField} label=${cssGrad ? "Gradient" : "Bg image"} title=${`A picture behind the content (background-image) · ${srcNote(s, "background-image")}`} placeholder="Paste an image address…"
                    value=${imgSet || cssGrad ? shownOf(s, "background-image", srcOf(s, "background-image")) : ""}
                    set=${has(s, "background-image")} src=${srcKind(s, "background-image")} onCommit=${(t) => { setAdding(""); actions.setProp("background-image", /^(https?:|\/|data:)/.test(t.trim()) ? `url("${t.trim()}")` : t); }} />
                ${imgSet || cssGrad ? html`<${Remove} title="Remove the bg image" onClick=${() => remove("background-image")} />` : html`<${Cancel} onClick=${() => setAdding("")} />`}</div>
            ${imgSet && html`<div class="frow"><${PropSelect} s=${s} actions=${actions} p="background-size" label="Size" options=${[["auto", "Auto"], ["cover", "Cover"], ["contain", "Contain"]]} />
                <${PropSelect} s=${s} actions=${actions} p="background-repeat" label="Repeat" options=${[["repeat", "Repeat"], ["no-repeat", "No repeat"], ["repeat-x", "Across"], ["repeat-y", "Down"]]} /></div>
            <div class="frow"><${PropField} s=${s} actions=${actions} p="background-position" label="Position" title="background-position (center, top, 50% 20%...)" /></div>`}`}
    </${FSection}>`;
}

// ── Border: radius, the border itself, outline and ring ──────────────────────────────────────────────────────────────────
export function BorderSection({ s, actions }) {
    const ui = useUi();
    const widths = SIDES.map((d) => `border-${d}-width`), styles = SIDES.map((d) => `border-${d}-style`), corners = CORNERS.map(([c]) => `border-${c}-radius`);
    const on = SIDES.some((d) => parseFloat(comp(s, `border-${d}-width`)) > 0 && comp(s, `border-${d}-style`) !== "none");
    const outline = Boolean(comp(s, "outline-style")) && comp(s, "outline-style") !== "none", ring = Boolean(val(s, "ring", ui));
    const [sides, setSides] = useState(false);
    const [each, setEach] = useState(false);
    const mixedW = same(s, widths) === "Mixed", mixedR = same(s, corners) === "Mixed";
    const addBorder = () => {
        actions.setProps(widths, "1", "borderWidth", ["borderT", "borderR", "borderB", "borderL"]);
        if (comp(s, "border-top-style") === "none") actions.setProps(styles, "solid", "borderStyle"); // Tailwind's base styles already make it solid
    };
    // a border from classes loses them (its colour and style too); one from CSS (or the design's stylesheet) gets a width of 0
    const removeBorder = () => (widths.some((p) => srcOf(s, p).source === "tailwind")
        ? ["borderWidth", "borderT", "borderR", "borderB", "borderL", "borderColor", "borderStyle"].forEach((k) => actions.applyValue(k, ""))
        : actions.setProps(widths, "0", "borderWidth"));
    const removeRadius = () => (corners.some((p) => srcOf(s, p).source === "tailwind")
        ? ["radius", ...CORNERS.map(([, k]) => k)].forEach((k) => actions.applyValue(k, ""))
        : actions.setProps(corners, "0", "radius"));
    const add = (kind) => {
        if (kind === "border") addBorder();
        if (kind === "outline") actions.setProp("outline", "2px solid #3b82f6");
        if (kind === "ring") actions.applyValue("ring", "2");
    };
    const items = [!on && ["border", "Border (1px)"], !outline && ["outline", "Outline"], !ring && ["ring", "Ring"]].filter(Boolean);
    const style = comp(s, "border-top-style");
    return html`<${FSection} title="Border" extra=${html`<${AddMenu} title="Add a border, outline or ring" items=${items} onPick=${add} />`}>
        <div class="frow">
            <${NumField} label="Radius" title=${`border-radius · ${srcNote(s, "border-top-left-radius")}`} value=${same(s, corners)} set=${anyHas(s, corners)} src=${firstSrc(s, corners)} list="dl-radius"
                onReset=${corners.some((p) => owns(s, p)) ? removeRadius : null} onCommit=${(t) => actions.setProps(corners, t, "radius", CORNERS.map(([, k]) => k))} />
            <${IconBtn} icon=${I.corners} on=${each || mixedR} title="Each corner on its own" onClick=${() => setEach(!each)} />
        </div>
        ${(each || mixedR) && html`<div class="frow two2">${CORNERS.map(([c, k, l]) => html`<${NumField} label=${l} title=${`${c} radius`} value=${num(comp(s, `border-${c}-radius`))}
            set=${has(s, `border-${c}-radius`)} src=${srcKind(s, `border-${c}-radius`)} onCommit=${(t) => actions.setProps([`border-${c}-radius`], t, k)} />`)}</div>`}
        ${on && html`<${Sub}>Border</${Sub}>
            <${ColorRow} s=${s} actions=${actions} p="border-top-color" all=${SIDES.map((d) => `border-${d}-color`)} group="borderColor" title="Border colour (every side)" removeTitle="Remove the border" onRemove=${removeBorder} />
            <div class="frow">
                <${NumField} label="Width" title="Border width" value=${same(s, widths)} set=${anyHas(s, widths)} src=${firstSrc(s, widths)} list="dl-borderWidth"
                    onCommit=${(t) => actions.setProps(widths, t, "borderWidth", ["borderT", "borderR", "borderB", "borderL"])} />
                <label class=${`nf ${anyHas(s, styles) ? "" : "unset"}`} title="Line style"><select class="nfs wide" onChange=${(e) => actions.setProps(styles, e.target.value, "borderStyle")}>
                    ${["solid", "dashed", "dotted", "double"].map((v) => html`<option value=${v} selected=${style === v}>${v[0].toUpperCase() + v.slice(1)}</option>`)}</select></label>
                <${IconBtn} icon=${I.sides} on=${sides || mixedW} title="Each side on its own" onClick=${() => setSides(!sides)} />
            </div>
            ${(sides || mixedW) && html`<div class="frow two2">${SIDES.map((d, i) => html`<${NumField} label=${["T", "R", "B", "L"][i]} title=${`border-${d}-width`} value=${num(comp(s, `border-${d}-width`))}
                set=${has(s, `border-${d}-width`)} src=${srcKind(s, `border-${d}-width`)} onCommit=${(t) => actions.setProps([`border-${d}-width`], t, ["borderT", "borderR", "borderB", "borderL"][i])} />`)}</div>`}`}
        ${outline && html`<${Sub}>Outline</${Sub}><div class="frow"><${PropField} s=${s} actions=${actions} p="outline" label="Outline" title="outline (width style colour)" />
            <${Remove} title="Remove the outline" onClick=${() => (owns(s, "outline") ? actions.resetProp("outline") : actions.setProp("outline", "none"))} /></div>
            <div class="frow"><${PropField} s=${s} actions=${actions} p="outline-offset" label="Offset" title="Gap between the element and its outline" /></div>`}
        ${ring && html`<${Sub}>Ring</${Sub}><div class="frow"><${TwField} s=${s} k="ring" label="Ring" title="A ring around the element (ring-*)" actions=${actions} />
            <${Remove} title="Remove the ring" onClick=${() => { actions.applyValue("ring", ""); actions.applyValue("ringColor", ""); }} /></div>
            <${GroupColor} s=${s} k="ringColor" label="Colour" actions=${actions} />`}
    </${FSection}>`;
}

// ── Effects: opacity, blend, shadows and filters ─────────────────────────────────────────────────────────────────────────
// the CSS each Tailwind shadow stands for, written when the element is styled with CSS rather than classes
const SHADOWS = {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)", default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)", inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
};
const SHADOW_NAMES = [["sm", "Small"], ["default", "Default"], ["md", "Medium"], ["lg", "Large"], ["xl", "Extra large"], ["2xl", "2XL"], ["inner", "Inner"], ["custom", "Custom…"]];
const BLEND = [["normal", "Normal"], ["multiply", "Multiply"], ["screen", "Screen"], ["overlay", "Overlay"], ["darken", "Darken"], ["lighten", "Lighten"], ["difference", "Difference"]];
export function EffectsSection({ s, actions }) {
    const ui = useUi();
    const [custom, setCustom] = useState(false);
    const [adding, setAdding] = useState(/** @type {string[]} */ ([]));
    const sh = comp(s, "box-shadow"), shTok = (srcOf(s, "box-shadow").token || "").replace(/^(?:[\w-]+:)*/, "");
    // Tailwind draws a ring with box-shadow too: that is the Border section's ring, not a shadow
    const ringOnly = /^ring/.test(shTok) && !val(s, "shadow", ui);
    const shadow = Boolean(sh) && sh !== "none" && !ringOnly;
    const shName = shTok === "shadow" ? "default" : /^shadow-/.test(shTok) ? shTok.replace(/^shadow-/, "") : "";
    const preset = shadow && shName && !custom ? shName : "custom";
    const setShadow = (v) => { if (v === "custom") return setCustom(true); setCustom(false); return actions.setProp("box-shadow", v, SHADOWS[v] || v); };
    const tw = (k) => Boolean(val(s, k, ui)) || adding.includes(k);
    const drop = (k) => { setAdding(adding.filter((x) => x !== k)); actions.applyValue(k, ""); };
    const op = comp(s, "opacity");
    const add = (kind) => {
        if (kind === "shadow") setShadow("md");
        else if (kind === "blur" || kind === "backdropBlur") actions.applyValue(kind, "md");
        else setAdding([...adding, kind]);
    };
    const items = [!shadow && ["shadow", "Shadow"], !tw("blur") && ["blur", "Blur"], !tw("backdropBlur") && ["backdropBlur", "Background blur"],
        !tw("brightness") && ["brightness", "Brightness"], !tw("grayscale") && ["grayscale", "Grayscale"]].filter(Boolean);
    return html`<${FSection} title="Effects" extra=${html`<${AddMenu} title="Add an effect" items=${items} onPick=${add} />`}>
        <div class="frow">
            <${NumField} label="Opacity" title=${`opacity · ${srcNote(s, "opacity")}`} value=${op === "" ? "100" : String(Math.round(parseFloat(op) * 100))} set=${has(s, "opacity")} src=${srcKind(s, "opacity")}
                onReset=${owns(s, "opacity") ? () => actions.resetProp("opacity") : null}
                onCommit=${(t) => { const n = parseFloat(t); if (Number.isFinite(n)) actions.setProp("opacity", String(Math.max(0, Math.min(100, n)) / 100)); }}><span class="nfu">%</span></${NumField}>
            <${PropSelect} s=${s} actions=${actions} p="mix-blend-mode" title="Blend mode" options=${BLEND} />
        </div>
        ${shadow && html`<div class="frow"><label class=${`nf ${has(s, "box-shadow") ? "" : "unset"} ${srcKind(s, "box-shadow") ? `src-${srcKind(s, "box-shadow")}` : ""}`} title=${`box-shadow · ${srcNote(s, "box-shadow")}`}>
                <span class="nfl">Shadow</span><select class="nfs wide" onChange=${(e) => setShadow(e.target.value)}>${SHADOW_NAMES.map(([v, l]) => html`<option value=${v} selected=${v === preset}>${l}</option>`)}</select></label>
            <${Remove} title="Remove the shadow" onClick=${() => { setCustom(false); return owns(s, "box-shadow") ? actions.resetProp("box-shadow") : actions.setProp("box-shadow", "none"); }} /></div>
            ${preset === "custom" && html`<div class="frow"><${NumField} label="CSS" title="box-shadow: x y blur spread colour" value=${sh} set src=${srcKind(s, "box-shadow")} onCommit=${(t) => actions.setProp("box-shadow", t)} /></div>`}`}
        ${tw("blur") && html`<div class="frow"><${TwSelect} s=${s} k="blur" label="Blur" title="Blur the element (blur-*)" actions=${actions} /><${Remove} title="Remove the blur" onClick=${() => drop("blur")} /></div>`}
        ${tw("backdropBlur") && html`<div class="frow"><${TwSelect} s=${s} k="backdropBlur" label="Backdrop" title="Blur what is behind it (backdrop-blur-*)" actions=${actions} /><${Remove} title="Remove the background blur" onClick=${() => drop("backdropBlur")} /></div>`}
        ${tw("brightness") && html`<div class="frow"><${TwField} s=${s} k="brightness" label="Bright" title="Brightness % (brightness-*)" actions=${actions} /><${Remove} title="Remove the brightness" onClick=${() => drop("brightness")} /></div>`}
        ${tw("grayscale") && html`<div class="frow"><${TwSelect} s=${s} k="grayscale" label="Gray" title="Grayscale (grayscale)" actions=${actions} /><${Remove} title="Remove the grayscale" onClick=${() => drop("grayscale")} /></div>`}
    </${FSection}>`;
}

// ── Transform, Motion, Interaction: only what is set, + to add ───────────────────────────────────────────────────────────
/** A section of Tailwind groups that shows only the ones the element has (or that were just added), each with a ×. */
function GroupsSection({ s, actions, title, groups, addTitle }) {
    const ui = useUi();
    const [added, setAdded] = useState(/** @type {string[]} */ ([]));
    const shown = groups.filter(([k]) => val(s, k, ui) || added.includes(k));
    const items = groups.filter(([k]) => !shown.some(([x]) => x === k)).map(([k, l]) => [k, l]);
    return html`<${FSection} title=${title} extra=${html`<${AddMenu} title=${addTitle} items=${items} onPick=${(k) => setAdded([...added, k])} />`}>
        ${shown.length > 0 && html`<div class="frow two2">${shown.map(([k, l, kind]) => (kind === "select"
            ? html`<${TwSelect} s=${s} k=${k} label=${l} actions=${actions} />` : html`<${TwField} s=${s} k=${k} label=${l} actions=${actions} />`))}</div>`}
    </${FSection}>`;
}
export const TransformSection = ({ s, actions }) => html`<${GroupsSection} s=${s} actions=${actions} title="Transform" addTitle="Add a transform"
    groups=${[["scale", "Scale"], ["rotate", "Rotate"], ["translateX", "Move X"], ["translateY", "Move Y"]]} />`;
export const MotionSection = ({ s, actions }) => html`<${GroupsSection} s=${s} actions=${actions} title="Motion" addTitle="Add a transition"
    groups=${[["transition", "Transition", "select"], ["duration", "Time"], ["delay", "Delay"], ["ease", "Easing", "select"]]} />`;

const INTERACTION = [
    { p: "cursor", l: "Cursor", t: "select", o: ["auto", "default", "pointer", "text", "move", "not-allowed", "grab", "grabbing", "crosshair", "help", "wait"] },
    { p: "pointer-events", l: "Pointer", t: "select", o: ["auto", "none"] },
    { p: "user-select", l: "Select", t: "select", o: ["auto", "none", "text", "all"] },
    { p: "visibility", l: "Visible", t: "select", o: ["visible", "hidden"] },
    { p: "object-fit", l: "Object fit", t: "select", o: ["fill", "contain", "cover", "none", "scale-down"] },
    { p: "object-position", l: "Object pos", t: "text" },
];
export function InteractionSection({ s, actions }) {
    const [added, setAdded] = useState(/** @type {string[]} */ ([]));
    const media = ["img", "video", "picture", "iframe", "svg"].includes(s.tag);
    const rows = INTERACTION.filter((c) => has(s, c.p) || added.includes(c.p) || (c.p === "object-fit" && media));
    const left = INTERACTION.filter((c) => !rows.includes(c));
    return html`<${FSection} title="Interaction" extra=${html`<${AddMenu} title="Add a setting" items=${left.map((c) => [c.p, c.l])} onPick=${(p) => setAdded([...added, p])} />`}>
        ${rows.map((c) => html`<${PropRow} s=${s} actions=${actions} c=${c} />`)}
    </${FSection}>`;
}

// ── Margin ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function MarginSection({ s, actions }) {
    const f = (d, l) => html`<${PropField} s=${s} actions=${actions} p=${`margin-${d}`} label=${l} title=${`margin-${d} (auto works too)`} list="dl-m" />`;
    return html`<${FSection} title="Margin"><div class="frow two2">${f("top", "T")}${f("right", "R")}${f("bottom", "B")}${f("left", "L")}</div></${FSection}>`;
}

// ── Anything else: a class, or a CSS declaration ─────────────────────────────────────────────────────────────────────────
/** "color: red" (a CSS declaration the browser knows) is set as a property; anything else is added as classes (hover:bg-blue-500 md:flex). */
export function AddBox({ actions }) {
    const commit = (t) => {
        const text = t.trim();
        if (!text) return;
        const m = text.match(/^([a-z-]+)\s*:\s+([^;]+);?$/i); // a space after the colon: a declaration, not hover:bg-...
        if (m && CSS.supports(m[1], m[2].trim())) return actions.setProp(m[1].toLowerCase(), m[2].trim());
        actions.addClasses(text);
    };
    return html`<div class="fsec"><div class="fsech"><span>Add class or CSS</span></div>
        <${NumField} label="+" title="A class (hover:bg-blue-500, md:grid-cols-3) or a CSS declaration (color: red), then Enter" placeholder="hover:underline  or  color: red" value="" set onCommit=${commit} /></div>`;
}
