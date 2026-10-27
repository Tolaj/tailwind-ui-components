import { panelStore, togglePalette, toggleSection } from "../panel-state.js";
import { BREAKPOINT_WIDTH, setGroup, BREAKPOINTS, GROUPS, parseToken } from "@windcraft/core/class-groups.js";
import { renderPanel } from "../panel.js";
import { inspectorView, variant, val, srcOf, modeFor } from "../panel-model.js";
import { checkTags } from "../code-view.js";
import { groupOf, variantOf, twShown, hasScale, twValue, fromPx } from "@windcraft/core/prop-tailwind.js";
import { normalizeValue } from "../css-props.js";
import { host } from "../host.js";
import { $, S, data, model, send } from "./base.js";
import { clampSize, docs, queueBoardSave, rememberCustom, renameFrame, setFrameSize, setPageGroup } from "./designs.js";
import { curWidth, fitTo, heightOfDoc, layout, positions, widthOf } from "./plane.js";
import { draftPage } from "./add-menu.js";
import { cmd } from "./frame-messages.js";
import { setPanel } from "./color-ui.js";
import { elementRange } from "./code-panel.js";
import { loadFrame } from "./docs.js";

// ── Inspector (the panel is components: see panel.js; what it shows, panel-model.js; its state, panel-state.js) ──
export const insp = $("inspector");

/** The selected page's own properties, for the panel. */
function pageInfo() {
    const d = docs.get(S.curKey), p = positions()[S.curKey] || { x: 0, y: 0 };
    return { name: data.title || "", group: data.group || "", w: widthOf(d), h: heightOfDoc(d), auto: !(d.board && d.board.h), empty: model.markup.trim() === "", x: Math.round(p.x), y: Math.round(p.y), version: data.version, isNew: S.isNew, project: data.project && data.project.name };
}
/** A page panel field (name, size, position) typed by the user: applied if it makes sense, otherwise the panel shows the old value again. */
function setPageField(key, text) {
    const v = text.trim();
    if (key === "group") return setPageGroup(S.curKey, v);
    if (key === "name") {
        const prev = data.title;
        if (v && v !== prev) renameFrame(S.curKey, v, prev); else renderInspector();
        return;
    }
    if (key === "h" && v === "") {
        const d = docs.get(S.curKey), b = { ...(d.board || {}) };
        delete b.h;
        d.board = { x: positions()[S.curKey].x, y: positions()[S.curKey].y, ...b };
        queueBoardSave(S.curKey);
        layout();
        return renderInspector();
    }
    const n = Number(v);
    if (v === "" || !Number.isFinite(n)) return renderInspector();
    setPageBox({ [key]: key === "w" ? clampSize(n, 8000) : key === "h" ? clampSize(n, 20000) : Math.round(n) });
    renderInspector();
}
function setPageBox(patch) {
    const d = docs.get(S.curKey), p = positions()[S.curKey];
    d.board = { x: p.x, y: p.y, ...(d.board || {}), ...patch };
    rememberCustom(d);
    queueBoardSave(S.curKey);
    layout();
}
/** What the panel's components ask of the editor (panel.js). */
const panelActions = {
    applyElement: applyElementCode,
    askAI: (path, outer, prompt) => askAI(path, outer, prompt),
    draftPage: (prompt) => draftPage(prompt),
    setPageField,
    setDevice: (w) => setDevice(w),
    fit: () => { S.viewTouched = true; fitTo([S.curKey]); },
    details: () => $("detailsBtn").click(),
    // the top of the Design tab (design-tab.js)
    select: (path) => send({ cmd: "select", path }),
    move: (dir) => { if (S.selected) cmd({ cmd: "move", path: S.selected.path, dir }); },
    duplicate: () => { if (S.selected) cmd({ cmd: "duplicate", path: S.selected.path }); },
    remove: () => { if (S.selected) cmd({ cmd: "remove", path: S.selected.path }); },
    setTag: (tag) => { if (S.selected) cmd({ cmd: "setTag", path: S.selected.path, tag }); },
    setTab: (tab) => panelStore.set({ tab }),
    closePanel: () => setPanel(false),
    setBreakpoint: (bp) => { panelStore.set({ bp }); setDevice(BREAKPOINT_WIDTH[bp]); },
    setState: (st) => panelStore.set({ st }),
    setText: (text) => { if (S.selected) cmd({ cmd: "setText", path: S.selected.path, text }, "text"); },
    // position and size (geom-section.js)
    setGeom: (key, text) => {
        if (!S.selected) return;
        const n = Number(text);
        if (text.trim() === "" || !Number.isFinite(n)) return renderInspector(); // not a number: show the old value again
        const prop = { w: "width", h: "height", x: "left", y: "top" }[key];
        if (prop) setProp(prop, `${Math.round(prop === "width" || prop === "height" ? Math.max(1, n) : n)}px`);
        else cmd({ cmd: "setGeom", path: S.selected.path, [key]: n });
    },
    freePosition: (on) => { if (S.selected) cmd({ cmd: "freePosition", path: S.selected.path, on }); },
    align: (mode) => send({ cmd: "align", mode }),
    group: () => { if (S.selected) send({ cmd: "group" }); },
    ungroup: () => { if (S.selected) send({ cmd: "ungroup" }); },
    autoLayout: () => { if (S.selected) send({ cmd: "autoLayout" }); },
    sizeItMyself: () => { if (S.selected) sizeItMyself(); },
    // the class-group controls (group-controls.js): the Tailwind extras
    applyValue: (key, value) => { if (S.selected) applyValue(key, value); },
    applyColor: (key, name, op, undoKey) => { if (S.selected) applyColor(key, name, op, undoKey); },
    togglePalette,
    customColor: (key, hex, done, input) => {
        if (!S.selected) return;
        applyColor(key, hex, undefined, liveKey(`c-${key}`));
        if (done) pickerClosed(input);
    },
    redraw: () => renderInspector(),
    // the property sections (prop-sections.js)
    setProp: (prop, value) => { if (S.selected) setProp(prop, value); },
    setPropLive: (prop, hex) => { if (S.selected) setProp(prop, hex, undefined, liveKey(`p-${prop}`)); },
    setPropDone: (prop, hex, input) => { if (S.selected) setProp(prop, hex, undefined, liveKey(`p-${prop}`)); pickerClosed(input); },
    resetProp: (prop) => { if (S.selected) setProp(prop, ""); },
    arrange: (kind) => { if (S.selected) arrange(kind); },
    toggleSection,
    setAttr: (name, value) => { if (S.selected) cmd({ cmd: "setAttr", path: S.selected.path, name, value: value === "" ? null : value }, `attr-${name}`); },
    // the classes, inline CSS and attributes below the element's code (classes-section.js)
    removeClass: (index) => { if (S.selected) setClassString(S.selected.classes.split(/\s+/).filter(Boolean).filter((_, i) => i !== index).join(" ")); },
    addClasses: (text) => {
        if (!S.selected) return;
        const add = text.split(/\s+/).filter(Boolean);
        if (!add.length) return;
        const cur = S.selected.classes.split(/\s+/).filter(Boolean);
        setClassString([...cur, ...add.filter((c) => !cur.includes(c))].join(" "));
    },
    setClassesText: (text) => { if (S.selected) { S.selected.classes = text.trim(); cmd({ cmd: "setClasses", path: S.selected.path, value: S.selected.classes }, "classes"); } },
    setStyle: (css) => { if (S.selected) cmd({ cmd: "setAttr", path: S.selected.path, name: "style", value: css }); },
    setAttribute: (name, value) => { if (S.selected) cmd({ cmd: "setAttr", path: S.selected.path, name, value }); },
};
/** Draws the panel. Every part is a component that keeps its own typed text, so it can be redrawn at any time, whatever has focus. */
export function renderInspector() {
    const ui = { ...panelStore.get(), frameBp: frameBp() }; // the panel's state, and the frame's breakpoint (worked out now)
    const elementCode = S.selected && ui.tab === "classes" ? sourceOf(S.selected.path) : null;
    const top = insp.scrollTop;
    renderPanel(insp, inspectorView(S.selected, S.selected ? null : pageInfo(), elementCode), panelActions, ui);
    insp.scrollTop = top;
}
// a change to the panel's own state (its tab, the breakpoint, an open section...) redraws it, once however many changed
let panelDrawQueued = false;

// ── The Code tab's element code (panel.js): the element's source, editable in place ──
/** The element at `path` as written in the design: its code with its lines' common indentation taken off, and that indentation. */
function sourceOf(path) {
    if (!path || !path.length) return null;
    const r = elementRange(model.markup, path);
    if (!r) return null;
    const lines = model.markup.slice(r.start, r.end).split("\n");
    const indents = lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0]);
    const indent = indents.length ? indents.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); }) : "";
    return { source: [lines[0], ...lines.slice(1).map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))].join("\n"), indent };
}
/**
 * Puts the code typed for the element at `path` in its place (one undo step), if it is exactly one element with matching
 * tags, and that element is still the one the code came from (`original`). Returns { ok, message }.
 */
function applyElementCode(path, code, indent, original) {
    const v = code.trim();
    if (v === original.trim()) return { ok: true };
    const now = sourceOf(path);
    if (!now || now.source !== original) return { ok: false, message: "That element changed since, so what you typed was not applied." };
    const bad = checkTags(v);
    if (bad) return { ok: false, message: `Not applied. Line ${bad.line}: ${bad.message}` };
    const tpl = document.createElement("template");
    tpl.innerHTML = v;
    const nodes = [...tpl.content.childNodes].filter((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
    if (nodes.length !== 1 || nodes[0].nodeType !== 1) return { ok: false, message: "Not applied: the code must be exactly one element (wrap several in one)." };
    cmd({ cmd: "replaceOuter", path, html: v.split("\n").map((l, i) => (i && l ? indent + l : l)).join("\n") });
    return { ok: true };
}

function applyValue(key, value, undoKey = "") {
    if (!S.selected) return;
    const next = setGroup(S.selected.classes, key, value, variant());
    if (next === null) return renderInspector();
    S.selected.classes = next;
    cmd({ cmd: "setClasses", path: S.selected.path, value: next }, undoKey);
}

function applyColor(key, name, op, undoKey = "") {
    const o = op === undefined ? (val(S.selected, key).match(/\/(\d+)$/) || [])[1] || "" : op;
    const base = /^(#|rgb|hsl)/.test(name) ? `[${name.replace(/\s+/g, "_")}]` : name;
    applyValue(key, base ? base + (o && o !== "100" ? `/${o}` : "") : "", undoKey);
}

// ── Colour pickers apply as they are dragged ─────────────────────────────────
// Every pick, from opening a picker to closing it, is one undo step: a "live:" key (merged by commit without the time limit)
// that moves on once the picker closes. The picker field is blurred then, so the bar and panel show the final value.
let liveSession = 0;
export const liveKey = (field) => `live:${field}:${liveSession}`;
export const pickerClosed = (t) => { liveSession++; t.blur(); };

// ── Which breakpoint a new class gets ────────────────────────────────────────
// Sizes, position and spacing follow the frame's width, mobile-first: Desktop (1280) writes xl:, Tablet (768) md:, Mobile the
// base class, so each screen size is designed by switching the frame. Colours, type and borders stay plain classes.
const RESPONSIVE = new Set(["w", "h", "minW", "maxW", "minH", "maxH", "gap", "gapX", "gapY", "inset", "top", "right", "bottom", "left", "p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml"]);
const familyOf = (g) => (/^p[xytrbl]?$/.test(g) ? ["p", "px", "py", "pt", "pr", "pb", "pl"] : /^m[xytrbl]?$/.test(g) ? ["m", "mx", "my", "mt", "mr", "mb", "ml"] : ["inset", "top", "right", "bottom", "left"].includes(g) ? ["inset", "top", "right", "bottom", "left"] : [g]);
/** "xl:" for a 1280 frame, "md:" for 768, "" for a phone-sized one: the largest breakpoint the frame's width reaches. */
function frameBp() {
    const w = curWidth();
    let bp = "";
    BREAKPOINTS.forEach((b) => { if (b && BREAKPOINT_WIDTH[b] <= w) bp = b; });
    return bp ? `${bp}:` : "";
}
/**
 * The variant for a new class of `group`: the one picked by hand in the panel, if any; else, for sizes and spacing, the frame's
 * breakpoint, unless the element has no class of that kind yet: then the base class, so smaller screens keep the value too.
 */
function newVariant(classes, group) {
    if (panelStore.get().bp || panelStore.get().st) return variant();
    if (!RESPONSIVE.has(group)) return "";
    const fam = familyOf(group).map((k) => GROUPS[k]);
    const has = String(classes || "").split(/\s+/).filter(Boolean).some((t) => fam.some((g) => g.re.test(parseToken(t).base)));
    return has ? frameBp() : "";
}

/**
 * A property edited in the panel is written where its value comes from: a Tailwind class is replaced (at the same md: / hover:
 * variant), an inline style or the design's own CSS gets an inline style. A property nothing sets yet becomes a Tailwind class,
 * unless the element is styled only by its design's CSS. The frame checks the result and falls back to CSS when a class can't win.
 */
export function setProp(prop, raw, cssOverride, key) {
    if (!S.selected) return;
    const s = S.selected, src = srcOf(s, prop), v = String(raw ?? "").trim();
    const group = groupOf(prop);
    const onTw = src.source === "tailwind";
    const winning = onTw ? variantOf(src.token) : "";
    const vp = winning || newVariant(s.classes, group); // a md:/xl: class that gives the value is edited where it is
    const send = (m) => cmd({ cmd: "setProp", path: s.path, prop, key, ...m }, key);
    if (v === "") {
        if (onTw && group) { const next = setGroup(s.classes, group, "", winning); if (next !== null) { s.classes = next; return send({ route: "tw", classes: next }); } }
        if (src.source === "inline") return send({ route: "css", css: null });
        return renderInspector();
    }
    // "500" means 500px, except on a row showing a Tailwind value (64 from w-64), where a bare number is Tailwind's scale
    const scale = onTw && twShown(prop, src.token) !== null && hasScale(group);
    const candidate = scale && /^-?\d*\.?\d+$/.test(v) ? v : normalizeValue(prop, v);
    const css = cssOverride !== undefined ? cssOverride : CSS.supports(prop, candidate) ? candidate : null;
    const tv = group ? twValue(prop, v, scale) : null;
    let token = null;
    if (tv !== null) { const built = GROUPS[group].build(tv); if (GROUPS[group].re.test(built)) token = built; }
    const toTw = onTw || src.source === "tie" || (src.source !== "inline" && src.source !== "design" && modeFor(s) === "tailwind");
    if (toTw && token) {
        const next = setGroup(s.classes, group, tv, vp);
        // kept here at once, so an edit sent right after this one (a line style, then a width) builds on it
        if (next !== null) { s.classes = next; return send({ route: "tw", classes: next, token: vp + token, css }); }
    }
    if (css === null && !token) return renderInspector(); // neither valid CSS nor a Tailwind value: put the old value back
    send({ route: "css", css, token }); // a Tailwind value on a CSS row (red-500): the frame measures what it means
}

/**
 * One value for several properties at once (all four paddings, the two sides of padding-h, every border width or corner), written
 * like setProp: as the `group` class when they are Tailwind's or unset on a Tailwind element (clearing the per-side classes in
 * `clear`, which would otherwise win), and as inline CSS on every one of them when any comes from CSS.
 */
export function setProps(props, raw, group, clear = [], cssOverride, key) {
    if (!S.selected) return;
    const s = S.selected, srcs = props.map((p) => srcOf(s, p));
    const v = String(raw ?? "").trim();
    const px = /^-?\d*\.?\d+(px)?$/.test(v);
    const n = parseFloat(v);
    const css = cssOverride !== undefined ? cssOverride : px ? `${n}px` : CSS.supports(props[0], v) ? v : null;
    const own = srcs.find((x) => x.source === "tailwind");
    const vp = (own && variantOf(own.token)) || newVariant(s.classes, group);
    const fromCss = srcs.some((x) => x.source === "inline" || x.source === "design");
    const tv = group ? (px ? fromPx(group, n) : twValue(props[0], v, false) ?? v) : null;
    let token = null;
    if (tv !== null) { const built = GROUPS[group].build(tv); if (GROUPS[group].re.test(built)) token = built; }
    if (!fromCss && token && (own || modeFor(s) === "tailwind")) {
        let classes = s.classes;
        for (const k of clear) { const next = setGroup(classes, k, "", vp); if (next !== null) classes = next; }
        const next = setGroup(classes, group, tv, vp);
        if (next !== null) { s.classes = next; return cmd({ cmd: "setProp", path: s.path, props, route: "tw", classes: next, token: vp + token, css, key }, key); }
    }
    cmd({ cmd: "setProp", path: s.path, props, route: "css", css, token, key }, key);
}

/**
 * A drag, resize or new shape has ended and its pixels are inline. Each value becomes a Tailwind class (at its own md: / hover:
 * variant if a class set it before) when the element is Tailwind's: made here, or the value came from a class, or nothing set it
 * on an element that uses Tailwind. A value that came from CSS stays CSS, and so does everything on an element styled only by its
 * design's CSS. The frame puts the classes on, checks them and saves the result as one undo step (agent.js applyGesture).
 */
export function convertGesture(items) {
    const blocked = items.find((it) => it.blocked);
    if (blocked) flashHint(`This element's ${blocked.blocked} is set by its flex layout. Use "Size it myself" in the panel to size it by hand.`);
    send({ cmd: "applyGesture", items: items.map((it) => {
        const tw = it.made || modeFor({ classes: it.classes }) === "tailwind";
        let classes = it.classes;
        const tokens = {};
        Object.entries(it.values).forEach(([prop, value]) => {
            const pre = it.pre[prop] || { source: "default" };
            if (!it.made && (pre.source === "inline" || pre.source === "design")) return; // it was CSS: it stays CSS
            if (!tw && pre.source !== "tailwind") return;
            const group = groupOf(prop);
            if (!group) return;
            const tv = /^-?[\d.]+px$/.test(value) ? fromPx(group, Math.round(parseFloat(value))) : twValue(prop, value, false); // a size, or a word (flex, column, absolute)
            if (tv === null) return;
            const built = GROUPS[group].build(tv);
            if (!GROUPS[group].re.test(built)) return;
            // judged on the classes from before this gesture: a left-[..] written a moment ago must not make top an xl: class
            const vp = (pre.source === "tailwind" && variantOf(pre.token)) || newVariant(it.classes, group);
            const next = setGroup(classes, group, tv, vp);
            if (next === null) return;
            classes = next;
            tokens[prop] = vp + built;
        });
        return { path: it.path, classes, tokens };
    }) });
}

/** A flex child that grows to fill its row: stop flex from sizing it (flex-none, or flex: none in CSS), so a width or height set on it applies. */
function sizeItMyself() {
    if (!S.selected) return;
    if (modeFor(S.selected) !== "tailwind") return cmd({ cmd: "setStyleProps", path: S.selected.path, props: { flex: "none" } });
    let classes = setGroup(S.selected.classes, "grow", "", variant()) ?? S.selected.classes;
    classes = setGroup(classes, "flexNum", "flex-none", variant()) ?? classes;
    setClassString(classes);
}
/** A short note in the hint under the canvas, back to the usual text after a few seconds. */
let hintTimer = 0;
function flashHint(text) {
    const h = $("canvasHint");
    clearTimeout(hintTimer);
    h.textContent = text;
    hintTimer = setTimeout(() => { h.textContent = S.mode === "edit" ? "Click to select. Double-click text to edit it. Alt-drag to place freely. Scroll to pan, Ctrl/Cmd + scroll to zoom." : h.textContent; }, 4000);
}

/**
 * Row / Column / Grid for a box whose children are stacked in the flow, in one undo step: Tailwind classes (flex, flex-col,
 * grid grid-cols-N, gap-*) unless its display comes from CSS or it is a CSS-only element, then the same as inline CSS. The gap
 * keeps the children's current spacing (agent.js arrangeOf).
 */
function arrange(kind) {
    const a = S.selected && S.selected.arrange;
    if (!a) return;
    const gap = kind === "row" ? a.rowGap : a.colGap;
    const cols = Math.min(a.count, 3);
    const src = srcOf(S.selected, "display").source;
    if (src === "inline" || src === "design" || modeFor(S.selected) !== "tailwind") {
        return cmd({ cmd: "setStyleProps", path: S.selected.path, props: {
            display: kind === "grid" ? "grid" : "flex",
            "flex-direction": kind === "col" ? "column" : null,
            "grid-template-columns": kind === "grid" ? `repeat(${cols}, minmax(0, 1fr))` : null,
            gap: kind === "grid" ? `${a.colGap}px ${a.rowGap}px` : `${gap}px`, // row-gap column-gap
        } });
    }
    let c = S.selected.classes;
    const set = (k, v) => { const next = setGroup(c, k, v, ""); if (next !== null) c = next; };
    set("display", kind === "grid" ? "grid" : "flex");
    set("flexDir", kind === "col" ? "flex-col" : "");
    set("gridCols", kind === "grid" ? String(cols) : "");
    // a grid's columns get the spacing as gap-x; down the columns the children's own margins still space them (gap-y)
    if (kind === "grid") { set("gap", ""); set("gapX", a.rowGap ? fromPx("gapX", a.rowGap) : ""); set("gapY", a.colGap ? fromPx("gapY", a.colGap) : ""); } else set("gap", gap ? fromPx("gap", gap) : "");
    setClassString(c);
}

export function setDevice(w) {
    // a preset is a whole size: its width, with the height following the content (a hand-set height belongs to Custom)
    setFrameSize({ w, h: null });
    if (S.mode === "preview") loadFrame();
}

const setClassString = (next) => { S.selected.classes = next; cmd({ cmd: "setClasses", path: S.selected.path, value: next }); };

// ── Ask AI about the selected element (the AI tab) ───────────────────────────
/** Changes the element at `path` (whose code is `outer`) as asked. Returns { ok, message? } for the AI tab to show. */
async function askAI(path, outer, prompt) {
    try {
        const html = await host.generate({
            prompt: `${prompt}\n\nReturn ONLY the full modified HTML of this single element, keeping the same root tag. No explanation and no code fences.`,
            currentHtml: outer,
            useLibrary: false,
        });
        if (!html.startsWith("<")) throw new Error("The AI didn't return HTML. Try rephrasing.");
        cmd({ cmd: "replaceOuter", path, html });
        return { ok: true };
    } catch (err) {
        return { ok: false, message: err.message };
    }
}

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {
    panelStore.subscribe(() => {
        if (panelDrawQueued) return;
        panelDrawQueued = true;
        queueMicrotask(() => { panelDrawQueued = false; renderInspector(); });
    });
}
