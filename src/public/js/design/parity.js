// A development check, not loaded by the editor: while the Design tab moves from HTML builders (inspector.js) to
// components, this draws both for the same input and compares what a person would see and be able to do: every label, every
// control with its value, options, classes and on/off state, in order. From the browser console on /design:
//   const p = await import("/public/js/design/parity.js"); p.checkGroupControls();
// Each step of the move extends it with the part it moves (checkGroupControls: step 1, checkDesignTop: step 2,
// checkPropSections: step 3; checkAll runs them all); it goes with the old builders in step 7.
import { html, render } from "../vendor/preact-htm.js";
import { ui } from "./inspector.js";
import { GROUPS } from "./class-groups.js";
import * as old from "./inspector.js";
import { GroupCombo, GroupSelect, GroupSeg, GroupColor } from "./group-controls.js";
import { DesignTop } from "./design-tab.js";
import { PropSections } from "./prop-sections.js";
import { CSS_SECTIONS } from "./css-props.js";

const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();
const CONTROLS = "input, select, textarea, button";
const TEXTS = ".lbl, .clbl, .t, .stag, .pct, .bml, .bc, .dot, .arrange > span, .sub, .car, .sl, .legend, .muted, p";
const classes = (el) => [...el.classList].sort().join(".");
// a style is compared as the browser reads it (background:#f00 and background: rgb(255, 0, 0); are the same)
const attr = (el, names) => names.map((n) => (!el.hasAttribute(n) ? "" : n === "style" ? `style=${el.style.cssText}` : `${n}=${norm(el.getAttribute(n))}`)).filter(Boolean).join(" ");

/** What one control shows and does, as a line of text. Attributes that only the old handlers used (data-*) are left out. */
function describeControl(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "select") return `select|value=${el.value}|options=${[...el.options].map((o) => `${o.value}:${norm(o.textContent)}`).join(",")}|${classes(el)}|${attr(el, ["title"])}`;
    if (tag === "button") return `button|${norm(el.textContent)}|${classes(el)}|${attr(el, ["title", "style"])}`;
    return `${tag}|type=${el.getAttribute("type") || "text"}|value=${el.value}|${classes(el)}|${attr(el, ["placeholder", "list", "title", "style"])}`;
}

/** The labels and controls inside `root`, in order, as lines of text. */
export function snapshot(root) {
    const out = [];
    const walk = (el) => {
        for (const c of el.children) {
            if (c.matches(CONTROLS)) out.push(describeControl(c));
            else if (c.matches(TEXTS) && !c.querySelector(CONTROLS)) out.push(`text|${classes(c)}|${norm(c.textContent)}`);
            else walk(c);
        }
    };
    walk(root);
    return out;
}

/** Draws an HTML string, and a component, each into its own detached box. */
export function draw(oldHtml, vnode) {
    const a = document.createElement("div"), b = document.createElement("div");
    a.innerHTML = oldHtml;
    render(vnode, b);
    return [a, b];
}

/** Compares two boxes: { same, diffs: [{ at, old, now }] }. */
export function compare(a, b) {
    const x = snapshot(a), y = snapshot(b), diffs = [];
    for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) diffs.push({ at: i, old: x[i], now: y[i] });
    return { same: !diffs.length, count: x.length, diffs };
}

/** A selection like the editor's, made from a class list (all the controls read is `classes`). */
const sample = (classes) => ({ classes, tag: "div", crumbs: [], attrs: {} });
const SAMPLES = [
    "",
    "p-4 px-8 mt-2 -mb-4 w-1/2 h-[30px] max-w-xl gap-x-6 z-10 top-0 inset-auto flex flex-col justify-between items-center flex-wrap",
    "md:p-8 hover:bg-red-500 md:hover:text-white/80 sm:grid-cols-3 lg:flex-row dark:bg-gray-900 rounded-[12px] rounded-tl-lg border-2 border-dashed border-blue-500",
    "bg-blue-500/50 text-[#ff0000] from-indigo-500 via-white to-transparent ring-2 ring-offset-2 ring-green-600/25 bg-gradient-to-br shadow-lg opacity-75 blur-sm",
    "font-bold text-xl leading-6 tracking-wide uppercase truncate text-center underline cursor-pointer select-none rotate-45 scale-95 -translate-x-1/2 transition duration-300 ease-in-out grow",
    "bg-current text-inherit border-white bg-[rgb(1,2,3)] text-[var(--brand)] ring-black/5",
];
const VARIANTS = [["", ""], ["md", ""], ["", "hover"], ["lg", "focus"]];
const SEG_ITEMS = { grow: [["grow", "Grow"], ["grow-0", "No grow"]] };
const COLOR_KEYS = ["textColor", "bgColor", "borderColor", "ringColor", "gradFrom", "gradVia", "gradTo"];
const noop = () => {};
const actions = { applyValue: noop, applyColor: noop, togglePalette: noop, customColor: noop, redraw: noop };

/**
 * Every Tailwind-group control, old builder against component, for several class lists, breakpoints and states, and with a
 * colour palette open. Returns { checked, failures } (and logs the failures).
 */
export function checkGroupControls() {
    const saved = { bp: ui.bp, st: ui.st, palette: ui.palette };
    const failures = [];
    let checked = 0;
    const check = (what, oldHtml, vnode) => {
        const [a, b] = draw(oldHtml, vnode);
        const r = compare(a, b);
        checked++;
        if (!r.same) failures.push({ what, diffs: r.diffs.slice(0, 3) });
    };
    try {
        for (const [bp, st] of VARIANTS) {
            ui.bp = bp; ui.st = st;
            for (const classesText of SAMPLES) {
                const s = sample(classesText);
                const where = `${classesText.slice(0, 24)}… @${bp || "base"}${st ? ":" + st : ""}`;
                for (const k of Object.keys(old.OPTS)) check(`select ${k} ${where}`, old.select(s, k, k), html`<${GroupSelect} s=${s} k=${k} label=${k} actions=${actions} />`);
                for (const k of Object.keys(old.PRESETS).filter((k) => GROUPS[k])) for (const cell of [false, true]) check(`combo ${k}${cell ? " (cell)" : ""} ${where}`, old.combo(s, k, k, cell), html`<${GroupCombo} s=${s} k=${k} label=${k} cell=${cell} actions=${actions} />`);
                for (const [k, items] of Object.entries(SEG_ITEMS)) check(`seg ${k} ${where}`, old.seg(s, k, k, items), html`<${GroupSeg} s=${s} k=${k} label=${k} items=${items} actions=${actions} />`);
                for (const k of COLOR_KEYS) for (const open of [false, true]) {
                    ui.palette = open ? k : null;
                    check(`color ${k}${open ? " (palette)" : ""} ${where}`, old.colorRow(s, k, k), html`<${GroupColor} s=${s} k=${k} label=${k} actions=${actions} />`);
                }
                ui.palette = null;
            }
        }
    } finally {
        Object.assign(ui, saved);
    }
    if (failures.length) console.warn(`${failures.length} of ${checked} differ`, failures.slice(0, 5));
    return { checked, failures };
}

// ── The top of the Design tab ────────────────────────────────────────────────
const trail = (tags) => tags.map((tag, i) => ({ tag, path: Array(i).fill(0) }));
const TAGS_TEXT = ["div", "section", "article", "p", "h1", "h2", "h3", "span", "a", "button", "ul"];
/** Selections like the editor's describe(): one of each kind the top of the tab treats differently. */
const ELEMENTS = [
    { tag: "h2", leaf: true, text: "Hello  there <b>", classes: "text-xl font-bold", attrs: {}, crumbs: trail(["body", "main", "h2"]), tagOptions: TAGS_TEXT, count: 1 },
    { tag: "img", leaf: false, text: null, classes: "w-full", attrs: { src: "a.png", alt: "A \"photo\"" }, crumbs: trail(["body", "div", "img"]), tagOptions: [], count: 1 },
    { tag: "a", leaf: true, text: "Buy", classes: "px-4 bg-black", attrs: { href: "/buy", target: "_blank" }, crumbs: trail(["body", "main", "section", "a"]), tagOptions: ["a", "button", "div", "span"], count: 1 },
    { tag: "input", leaf: true, text: "", classes: "border", attrs: { placeholder: "Your email", type: "email", value: "" }, crumbs: trail(["body", "form", "input"]), tagOptions: [], count: 1 },
    { tag: "textarea", leaf: true, text: "", classes: "", attrs: { placeholder: "Message", type: "", value: "hi" }, crumbs: trail(["body", "textarea"]), tagOptions: [], count: 1 },
    { tag: "div", leaf: false, text: null, classes: "flex gap-4", attrs: { id: "x" }, crumbs: trail(["body", "div"]), tagOptions: ["div", "section", "ul"], count: 1 },
    { tag: "body", leaf: false, text: null, classes: "", attrs: {}, crumbs: trail(["body"]), tagOptions: [], count: 1 },
    { tag: "p", leaf: true, text: "two selected", classes: "mt-2", attrs: {}, crumbs: trail(["body", "p"]), tagOptions: TAGS_TEXT, count: 2 },
    { tag: "span", leaf: true, text: "new", classes: "", added: true, attrs: {}, crumbs: trail(["body", "span"]), tagOptions: ["span", "strong"], count: 1 },
    { tag: "div", leaf: false, text: null, classes: "my-card other-class", attrs: {}, crumbs: trail(["body", "div"]), tagOptions: ["div", "section"], count: 1 },
];
const STATE_SETS = [["", "", ""], ["md", "", ""], ["", "hover", ""], ["lg", "focus", "md"], ["", "", "lg"]];
const topActions = { select: noop, move: noop, duplicate: noop, remove: noop, setTag: noop, setBreakpoint: noop, setState: noop, setText: noop, setAttr: noop };

/** The top of the Design tab: the old builders against DesignTop, for every kind of element and breakpoint/state. */
export function checkDesignTop() {
    const saved = { bp: ui.bp, st: ui.st, frameBp: ui.frameBp };
    const failures = [];
    let checked = 0;
    try {
        for (const [bp, st, frameBp] of STATE_SETS) {
            Object.assign(ui, { bp, st, frameBp });
            for (const s of ELEMENTS) {
                const oldHtml = `<div class="crumbs">${old.crumbs(s)}</div>` + old.tagRow(s) + old.actions(s) + old.legend(s) + old.variantBar() + old.contentFields(s);
                const [a, b] = draw(oldHtml, html`<${DesignTop} s=${s} ctx=${old.designCtx(s)} actions=${topActions} />`);
                const r = compare(a, b);
                checked++;
                if (!r.same) failures.push({ what: `${s.tag}${s.count > 1 ? " x2" : ""} @${bp || "base"}${st ? ":" + st : ""}${frameBp ? " frame " + frameBp : ""}`, diffs: r.diffs.slice(0, 3) });
            }
        }
    } finally {
        Object.assign(ui, saved);
    }
    if (failures.length) console.warn(`${failures.length} of ${checked} differ`, failures.slice(0, 5));
    return { checked, failures };
}

// ── The property sections ────────────────────────────────────────────────────
const PROP_LIST = CSS_SECTIONS.flatMap(([, , c]) => (c === "box" ? ["margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left"].map((p) => ({ p })) : c));
// a Tailwind class for some properties, so the rows show a class's own value (64, 1/2, red-500) and a TW tag
const TOKENS = { width: "w-1/2", height: "h-[30px]", "min-width": "min-w-0", "padding-top": "pt-4", "padding-left": "md:pl-8", "margin-left": "-ml-2", "margin-bottom": "mb-6", "font-size": "text-xl", "font-weight": "font-bold", color: "text-red-500", "background-color": "bg-blue-500/50", display: "flex", position: "relative", gap: "gap-x-4", "border-top-color": "border-gray-300", "border-radius": "rounded-lg", "z-index": "z-10", opacity: "opacity-75", top: "top-0", "text-align": "text-center", "flex-direction": "flex-col", "box-shadow": "shadow-lg" };
const SOURCE_KINDS = ["tailwind", "inline", "design", "parent", "tie", "default"];
/** A value the row can show for this kind of control: the first option, one the list doesn't have, nothing, a colour, a length. */
const computedFor = (c, n) => {
    const pick = n % 4;
    if (c.t === "select") return pick === 0 ? c.o[0] : pick === 1 ? c.o[c.o.length - 1] : pick === 2 ? "unusual-value" : "";
    if (c.t === "seg") return ["left", "start", "center", ""][pick];
    if (c.t === "color") return ["rgb(10, 20, 30)", "rgba(0, 0, 0, 0)", "", "rgba(255, 0, 0, 0.5)"][pick];
    return ["12px", "auto", "", "50%"][pick];
};
/** A selection like the editor's describe(), with a source and a computed value for every property, rotated by `seed`. */
const propSample = (seed, extra = {}) => {
    const sources = {}, computed = {};
    PROP_LIST.forEach((c, n) => {
        const kind = SOURCE_KINDS[(n + seed) % SOURCE_KINDS.length];
        computed[c.p] = computedFor(c, n + seed);
        sources[c.p] = kind === "tailwind" || kind === "tie" ? (TOKENS[c.p] ? { source: kind, token: TOKENS[c.p] } : { source: "inline" })
            : kind === "design" ? { source: "design", selector: ".card > h2" } : kind === "parent" ? { source: "parent", token: "text-center" } : { source: kind };
    });
    return { tag: "div", classes: "", attrs: {}, crumbs: [], sources, computed, geom: { abs: false }, arrange: null, ...extra };
};
const OPEN_SETS = [
    ["default", null],
    ["all closed", new Set()],
    ["all open", new Set(CSS_SECTIONS.map(([id]) => id))],
];
const propActions = { setProp: noop, setPropLive: noop, setPropDone: noop, resetProp: noop, arrange: noop, toggleSection: noop };

/** The property sections: the old builder against PropSections, for sources of every kind, assorted values, open and closed. */
export function checkPropSections() {
    const saved = { open: ui.open, closed: ui.closed };
    const failures = [];
    let checked = 0;
    try {
        for (const [name, open] of OPEN_SETS) {
            for (const closedOffsets of [false, true]) {
                if (open) ui.open = open; else ui.open = saved.open;
                ui.closed = new Set(closedOffsets ? ["css-offsets"] : []);
                for (let seed = 0; seed < SOURCE_KINDS.length; seed++) for (const extra of [{}, { geom: { abs: true } }, { arrange: { count: 3 }, tag: "section" }]) {
                    const s = propSample(seed, extra);
                    const [a, b] = draw(old.propSections(s), html`<${PropSections} s=${s} actions=${propActions} />`);
                    const r = compare(a, b);
                    checked++;
                    if (!r.same) failures.push({ what: `${name}${closedOffsets ? ", offsets closed" : ""} seed ${seed} ${Object.keys(extra).join("+") || "plain"}`, diffs: r.diffs.slice(0, 3) });
                }
            }
        }
    } finally {
        Object.assign(ui, saved);
    }
    if (failures.length) console.warn(`${failures.length} of ${checked} differ`, failures.slice(0, 5));
    return { checked, failures };
}

/** Everything moved so far. */
export function checkAll() {
    const parts = [checkGroupControls(), checkDesignTop(), checkPropSections()];
    return { checked: parts.reduce((n, p) => n + p.checked, 0), failures: parts.flatMap((p) => p.failures) };
}
