import test from "node:test";
import assert from "node:assert/strict";
import { RUNGS, compileItem, dropGroup, effective, rungFor, scopeFor, scopeText } from "../intent.js";

const item = (classes, values, extra = {}) => ({ path: [0], classes, made: false, pre: {}, values, ...extra });
const W = { "": 390, md: 768, lg: 1280 };

test("a frame width is a device", () => {
    assert.deepEqual([320, 390, 767, 768, 1023, 1024, 1920].map(rungFor), ["", "", "", "md", "md", "lg", "lg"]);
});

test("the panel's breakpoint chip wins over the device", () => {
    const s = scopeFor(1280, "device", "sm");
    assert.equal(s.variant, "sm:");
    assert.equal(scopeFor(1280, "only", "").pin, null);
    assert.equal(scopeFor(768, "only", "").pin, "lg");
});

test("a Tablet move is written at md: and nowhere else", () => {
    const r = compileItem(item("flex", { position: "relative", left: "24px", top: "60px" }, { pre: { position: { source: "default" }, left: { source: "default" }, top: { source: "default" } } }), { tw: true, width: W.md });
    assert.equal(r.classes, "flex relative md:left-6 md:top-[60px]");
    assert.equal(scopeText(r.scope), "Tablet and up");
});

test("Mobile writes the plain class", () => {
    const r = compileItem(item("", { left: "8px" }, { pre: { left: { source: "default" } } }), { tw: true, width: W[""] });
    assert.equal(r.classes, "left-2");
});

test("only this size puts the old value back on the device above", () => {
    const r = compileItem(item("left-4", { left: "24px" }, { pre: { left: { source: "tailwind", token: "left-4" } } }), { tw: true, width: W.md, mode: "only" });
    assert.equal(effective(r.classes, "left", "") , "4");
    assert.equal(effective(r.classes, "left", "md"), "6");
    assert.equal(effective(r.classes, "left", "lg"), "4");
});

test("only this size with nothing before restores the neutral value", () => {
    const r = compileItem(item("", { left: "24px" }, { pre: { left: { source: "default" } } }), { tw: true, width: W.md, mode: "only" });
    assert.equal(effective(r.classes, "left", "lg"), "0");
    assert.equal(effective(r.classes, "left", ""), null);
});

test("a class the next device already has is left alone", () => {
    const r = compileItem(item("lg:left-10", { left: "24px" }, { pre: { left: { source: "default" } } }), { tw: true, width: W.md, mode: "only" });
    assert.equal(effective(r.classes, "left", "lg"), "10");
});

test("all sizes writes the plain class", () => {
    const r = compileItem(item("", { left: "24px" }, { pre: { left: { source: "default" } } }), { tw: true, width: W.lg, mode: "all" });
    assert.equal(r.classes, "left-6");
});

test("a new shape exists at every size", () => {
    const r = compileItem(item("", { position: "absolute", left: "40px", top: "40px" }, { made: true }), { tw: true, width: W.lg });
    assert.equal(r.classes, "absolute left-10 top-10");
});

test("freeing an element is written for every size", () => {
    const r = compileItem(item("", { position: "absolute", left: "40px", top: "40px" }, { pre: { position: { source: "default" }, left: { source: "default" }, top: { source: "default" } } }), { tw: true, width: W.md });
    assert.equal(r.classes, "absolute left-10 top-10");
    assert.equal(r.structural, true);
});

test("a value that came from CSS stays CSS", () => {
    const r = compileItem(item("", { left: "24px" }, { pre: { left: { source: "design" } } }), { tw: true, width: W.md });
    assert.equal(r.classes, "");
});

// ── property test: the cascade at each device after an edit is what the scope promises ──────────────────────────
function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
test("property: every scope changes exactly the devices it says (1000 random edits)", () => {
    const rand = rng(7);
    const pick = (a) => a[Math.floor(rand() * a.length)];
    const props = [["left", "left", "left"], ["top", "top", "top"], ["margin-left", "ml", "ml"]];
    const zero = (v) => v ?? "0"; // nothing set is the neutral 0 for these groups
    for (let i = 0; i < 1000; i++) {
        const [css, group, pre] = pick(props);
        const own = {};
        let classes = "";
        for (const bp of RUNGS) if (rand() < 0.35) { const v = pick(["1", "2", "4", "8"]); classes += ` ${bp ? bp + ":" : ""}${pre}-${v}`; own[bp] = v; }
        classes = classes.trim();
        const was = Object.fromEntries(RUNGS.map((bp) => [bp, effective(classes, group, bp)]));
        const px = pick([8, 12, 24, 40, 60]);
        const mode = pick(["device", "only", "all"]);
        const rung = pick(RUNGS);
        const at = RUNGS.indexOf(rung);
        const r = compileItem(item(classes, { [css]: `${px}px` }, { pre: { [css]: { source: "tailwind", token: "" } } }), { tw: true, width: W[rung], mode });
        const want = px % 4 === 0 && px / 4 <= 16 && px / 4 !== 13 && px / 4 !== 15 ? String(px / 4) : `[${px}px]`;
        const now = Object.fromEntries(RUNGS.map((bp) => [bp, effective(r.classes, group, bp)]));
        const why = `${mode} @${rung || "Mobile"}: [${classes}] -> [${r.classes}]`;
        RUNGS.forEach((bp, k) => {
            if (mode === "all") {
                // the plain class: a device with a class of its own keeps it, the others show the edit
                const ownBelow = RUNGS.slice(1, k + 1).some((b) => own[b] !== undefined);
                assert.equal(zero(now[bp]), ownBelow ? zero(was[bp]) : want, `${why} (${bp || "Mobile"})`);
            } else if (k < at) assert.equal(now[bp], was[bp], `${why}: ${bp || "Mobile"} must not change`);
            else if (k === at) assert.equal(now[bp], want, `${why}: its own device shows the edit`);
            else if (mode === "only") assert.equal(zero(now[bp]), zero(was[bp]), `${why}: ${bp} keeps its old value`);
            else {
                const ownAbove = RUNGS.slice(at + 1, k + 1).some((b) => own[b] !== undefined);
                assert.equal(zero(now[bp]), ownAbove ? zero(was[bp]) : want, `${why}: ${bp} inherits the edit unless it has its own`);
            }
        });
    }
});

test("turning a box into a layout takes the absolute classes off at every size", () => {
    const r = compileItem(item("h-16 absolute left-4 lg:left-[247px] lg:top-4", {}, { structural: true, clear: ["position", "left", "top"] }), { tw: true, width: W.lg });
    assert.equal(r.classes, "h-16");
    assert.equal(dropGroup("a md:hover:left-2 left-4 top-1", "left"), "a top-1");
});

test("both halves of a gap, equal, are one gap class", () => {
    const pre = { "column-gap": { source: "tailwind", token: "gap-4" }, "row-gap": { source: "tailwind", token: "gap-4" } };
    const r = compileItem(item("flex gap-4", { "column-gap": "32px", "row-gap": "32px" }, { pre }), { tw: true, width: W.lg, mode: "all" });
    assert.equal(r.classes, "flex gap-8");
    assert.equal(r.tokens["column-gap"], "gap-8"); assert.equal(r.tokens["row-gap"], "gap-8");
    const g = compileItem(item("grid gap-x-4", { "column-gap": "24px" }, { pre: { "column-gap": { source: "tailwind", token: "gap-x-4" } } }), { tw: true, width: W.lg, mode: "all" });
    assert.equal(g.classes, "grid gap-x-6");
});
