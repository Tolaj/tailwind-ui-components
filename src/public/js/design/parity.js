// A development check, not loaded by the editor: while the Design tab moves from HTML builders (inspector.js) to
// components, this draws both for the same input and compares what a person would see and be able to do: every label, every
// control with its value, options, classes and on/off state, in order. From the browser console on /design:
//   const p = await import("/public/js/design/parity.js"); p.checkGroupControls();
// Each step of the move extends it with the part it moves; it goes with the old builders in step 7.
import { html, render } from "../vendor/preact-htm.js";
import { ui } from "./inspector.js";
import { GROUPS } from "./class-groups.js";
import * as old from "./inspector.js";
import { GroupCombo, GroupSelect, GroupSeg, GroupColor } from "./group-controls.js";

const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();
const CONTROLS = "input, select, textarea, button";
const TEXTS = ".lbl, .clbl, .t, .stag, .pct, .bml, .sub, .car, .legend, .muted, p";
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
