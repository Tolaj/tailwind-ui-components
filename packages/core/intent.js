// The layer between the canvas and the HTML: what a drag, a resize or a move MEANS, as Tailwind classes.
//
// The classes stay the only source of truth. A gesture arrives as the pixels it produced (agent.js); this turns them into classes
// scoped to the device being edited, as Tailwind is mobile-first: an edit made on the Tablet frame is `md:`, on Desktop `lg:`,
// on Mobile it is the plain class. Pure functions, no DOM, so every rule here is tested (test/intent.test.js).
//
// Three scopes for one edit (the person picks, the choice sticks):
//   device  "this size and up": the class at the device's own breakpoint. Smaller devices stay as they are.
//   only    "only this size": the same class, and the next device up gets its old value back, so nothing but this device changes.
//   all     "all sizes": the plain class, as before.
import { BREAKPOINTS, GROUPS, getGroup, parseToken, setGroup } from "./class-groups.js";
import { fromPx, groupOf, twValue, variantOf } from "./prop-tailwind.js";

/** The devices an edit can belong to, smallest first: Mobile is the plain class, Tablet md:, Desktop lg:. */
export const RUNGS = ["", "md", "lg"];
export const RUNG_NAMES = { "": "Mobile", md: "Tablet", lg: "Desktop" };
export const SCOPES = ["device", "only", "all"];

/** The device a frame of this width is: under 768 Mobile, under 1024 Tablet, from 1024 Desktop. */
export const rungFor = (width) => (width >= 1024 ? "lg" : width >= 768 ? "md" : "");

/**
 * Where an edit goes. `picked` is the breakpoint chip chosen in the panel (it wins over the device: the person said where).
 * Returns { mode, rung, name, variant, pin, picked }: `variant` is the breakpoint part of the class ("md:"), `pin` the device above
 * whose old value is put back when the scope is "only".
 */
export function scopeFor(width, mode = "device", picked = "") {
    const m = SCOPES.includes(mode) ? mode : "device";
    if (picked) return { mode: "all", rung: picked, name: picked, variant: picked + ":", pin: null, picked: true };
    const rung = rungFor(width);
    if (m === "all") return { mode: m, rung, name: RUNG_NAMES[rung], variant: "", pin: null, picked: false };
    const up = RUNGS[RUNGS.indexOf(rung) + 1] ?? null;
    return { mode: m, rung, name: RUNG_NAMES[rung], variant: rung ? rung + ":" : "", pin: m === "only" ? up : null, picked: false };
}

/** The class string without any class of a group, whatever its breakpoint or state. */
export function dropGroup(classes, key) {
    const re = GROUPS[key].re;
    return String(classes || "").split(/\s+/).filter(Boolean).filter((t) => !re.test(parseToken(t).base)).join(" ");
}

/** What a scope says in words: "Tablet and up", "Only Tablet", "All sizes". */
export function scopeText(scope) {
    if (scope.picked) return `${scope.name} chip`;
    if (scope.mode === "all") return "All sizes";
    if (scope.mode === "only") return `Only ${scope.name}`;
    return scope.rung ? `${scope.name} and up` : "All sizes"; // Mobile and up is every size
}

/** The value a group has at a breakpoint once the cascade is applied (the last class at or below it), or null if nothing sets it. */
export function effective(classes, key, bp, state = "") {
    let found = null;
    for (const b of BREAKPOINTS) {
        const g = getGroup(classes, key, (b ? b + ":" : "") + state);
        if (g) found = g.value;
        if (b === bp) break;
    }
    return found;
}

// What a group is when no class sets it: the value that puts a device back to "as if the class were not there".
const NEUTRAL = { left: "0", top: "0", right: "0", bottom: "0", ml: "0", mr: "0", mt: "0", mb: "0", w: "auto", h: "auto", self: "auto" };

/**
 * One gesture item (see agent.js gestureItem) as classes: { classes, tokens, cleared, pins }.
 *  - it.values: the pixels (or words) the gesture wrote, by CSS property; it.pre: where each came from before; it.made: a new shape.
 *  - tw: the element is Tailwind's (otherwise only values that came from a class become classes).
 *  - state: the panel's state chip ("hover"), "" for none. picked: its breakpoint chip.
 */
export function compileItem(it0, { tw, width, mode = "device", picked = "", state = "" }) {
    // both halves of a gap or of the padding on an axis, equal, are one class (gap-4, px-4), not two
    let it = it0;
    const pairs = [];
    for (const [a, b, one] of [["column-gap", "row-gap", "gap"], ["padding-left", "padding-right", "padding-inline"], ["padding-top", "padding-bottom", "padding-block"]]) {
        if (it.values[a] !== undefined && it.values[a] === it.values[b]) {
            const { [a]: va, [b]: vb, ...rest } = it.values;
            it = { ...it, values: { ...rest, [one]: va }, pre: { ...it.pre, [one]: it.pre[a] || it.pre[b] } };
            pairs.push([a, b, one]);
        }
    }
    // taking an element out of the flow (absolute, fixed), or turning a box into a row or grid, is not a per-device edit: on the other devices it would leave the flow with
    // no place to stand. Its position and size are written for every size, as for a new shape.
    const structural = Boolean(it.structural) || it.values.position === "absolute" || it.values.position === "fixed";
    const scope = scopeFor(width, structural ? "all" : mode, picked);
    const st = state ? state + ":" : "";
    let classes = it.classes;
    const tokens = {};
    const pins = [];
    for (const [prop, value] of Object.entries(it.values)) {
        const pre = it.pre[prop] || { source: "default" };
        if (!it.made && (pre.source === "inline" || pre.source === "design")) continue; // it was CSS: it stays CSS
        if (!tw && pre.source !== "tailwind") continue;
        const group = groupOf(prop);
        if (!group) continue;
        const auto = prop === "grid-template-columns" && /^repeat\((\d+),\s*auto\)$/.exec(value);
        const cols = !auto && prop === "grid-template-columns" && /^repeat\((\d+)/.exec(value);
        const tv = auto ? `[repeat(${auto[1]},auto)]` : cols ? cols[1] : /^-?[\d.]+px$/.test(value) ? fromPx(group, Math.round(parseFloat(value))) : twValue(prop, value, false);
        if (tv === null) continue;
        const built = GROUPS[group].build(tv);
        if (!GROUPS[group].re.test(built)) continue;
        // a new shape exists at every size; `position` is not a per-size thing (relative with no offset changes nothing)
        const device = !it.made && !structural && group !== "position";
        let vp;
        if (scope.picked) vp = scope.variant + st;
        else if (scope.mode === "all" || !device || st) vp = (pre.source === "tailwind" && variantOf(pre.token)) || st;
        else vp = scope.variant + st;
        const next = setGroup(classes, group, tv, vp);
        if (next === null) continue;
        classes = next;
        tokens[prop] = vp + built;
        // "only this size": the device above gets its old value back
        if (scope.pin && device && !st && (pre.source === "tailwind" || pre.source === "default")) {
            const pv = scope.pin + ":";
            if (getGroup(it.classes, group, pv)) continue; // that device has its own class already
            const old = effective(it.classes, group, scope.pin) ?? NEUTRAL[group];
            if (old === undefined || old === null) { pins.push({ group, ok: false }); continue; }
            const pinned = setGroup(classes, group, old, pv);
            if (pinned !== null) { classes = pinned; pins.push({ group, ok: true, token: pv + GROUPS[group].build(old) }); }
        }
    }
    let cleared = false;
    if (tw || it.made) (it.clear || []).forEach((g) => {
        // a structural change takes the group off at every size and state (md:left-4 as well as left-4), anything else only the plain class
        const next = structural ? dropGroup(classes, g) : setGroup(classes, g, "", "");
        if (next !== null && next !== classes) { classes = next; cleared = true; }
    });
    pairs.forEach(([a, b, one]) => { if (tokens[one]) { tokens[a] = tokens[b] = tokens[one]; delete tokens[one]; } });
    return { path: it.path, classes, tokens, cleared, pins, scope, structural };
}

/** The same gesture compiled for every element in it. */
export const compileItems = (items, opts) => items.map((it) => compileItem(it, { ...opts, tw: it.made || opts.tw(it) }));
