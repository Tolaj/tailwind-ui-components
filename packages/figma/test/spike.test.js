import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { layoutMatches, analyze, verdict, buildReport } = createRequire(import.meta.url)("../spike/code.js");

const box = (name, x, y, width, height, extra = {}) => ({ name, type: "FRAME", x, y, width, height, children: [], ...extra });
const row = { layoutMode: "HORIZONTAL", itemSpacing: 8, paddingLeft: 16, paddingTop: 10, paddingRight: 16, paddingBottom: 10, counterAxisAlignItems: "MIN" };

test("a row laid out the way the inferred layout says matches", () => {
    const frame = box("Row", 0, 0, 200, 40, { children: [box("a", 16, 10, 50, 20), box("b", 74, 10, 50, 20), box("c", 132, 10, 50, 20)] });
    assert.deepEqual(layoutMatches(frame, row), { ok: true, why: "" });
});

test("a wrong gap, start or cross position is named", () => {
    const gap = box("Row", 0, 0, 200, 40, { children: [box("a", 16, 10, 50, 20), box("b", 80, 10, 50, 20)] });
    assert.match(layoutMatches(gap, row).why, /gap 14/);
    const start = box("Row", 0, 0, 200, 40, { children: [box("a", 30, 10, 50, 20), box("b", 88, 10, 50, 20)] });
    assert.match(layoutMatches(start, row).why, /first child starts at 30/);
    const cross = box("Row", 0, 0, 200, 40, { children: [box("a", 16, 10, 50, 20), box("b", 74, 14, 50, 20)] });
    assert.match(layoutMatches(cross, row).why, /cross position 14/);
});

test("a column centred across", () => {
    const col = { layoutMode: "VERTICAL", itemSpacing: 4, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, counterAxisAlignItems: "CENTER" };
    const frame = box("Col", 0, 0, 100, 100, { children: [box("a", 25, 0, 50, 20), box("b", 10, 24, 80, 20)] });
    assert.equal(layoutMatches(frame, col).ok, true);
});

test("grids, nothing inferred and no spacing are not row or column matches", () => {
    assert.match(layoutMatches(box("g", 0, 0, 1, 1, { children: [box("a", 0, 0, 1, 1), box("b", 1, 0, 1, 1)] }), { layoutMode: "GRID" }).why, /not a row or column/);
    assert.match(layoutMatches(box("n", 0, 0, 1, 1), null).why, /none/);
    assert.match(layoutMatches(box("s", 0, 0, 9, 9, { children: [box("a", 0, 0, 1, 1), box("b", 4, 0, 1, 1)] }), { layoutMode: "HORIZONTAL" }).why, /no itemSpacing/);
});

test("analyze counts native Auto Layout, missing, null, throwing and matching containers", () => {
    const inferredRow = box("Inferred", 0, 0, 200, 40, { children: [box("a", 16, 10, 50, 20), box("b", 74, 10, 50, 20)], inferredAutoLayout: row });
    const nulled = box("Null", 0, 0, 100, 40, { children: [box("a", 0, 0, 10, 10), box("b", 5, 5, 10, 10)], inferredAutoLayout: null });
    const throwing = box("Throws", 0, 0, 100, 40, { children: [box("a", 0, 0, 10, 10), box("b", 20, 0, 10, 10)] });
    Object.defineProperty(throwing, "inferredAutoLayout", { get() { throw new Error("not available in this mode"); } });
    const native = box("Native", 0, 0, 100, 40, { layoutMode: "VERTICAL", children: [box("a", 0, 0, 10, 10)] });
    const page = box("Page", 0, 0, 800, 600, { children: [inferredRow, nulled, throwing, native, { name: "t", type: "TEXT", children: undefined }] });
    const r = analyze(page);
    assert.equal(r.containers, 12); // the page, four frames and their seven small frames
    assert.equal(r.nativeAutoLayout, 1);
    assert.equal(r.noAutoLayout, 4);
    assert.equal(r.inferredAvailable, 1);
    assert.equal(r.inferredNull, 1);
    assert.equal(r.inferredMissing, 1); // the page frame has no such property
    assert.equal(r.inferredThrew, 1);
    assert.equal(r.inferredMatchesReality, 1);
    assert.deepEqual(r.inferredModes, { HORIZONTAL: 1 });
    assert.equal(r.byType.TEXT, 1);
});

test("the verdict says what happened in plain words", () => {
    assert.match(verdict([{ noAutoLayout: 0 }]), /nothing to infer/);
    assert.match(verdict([{ noAutoLayout: 3, inferredAvailable: 0, inferredNull: 3, inferredMissing: 0, inferredThrew: 0, inferredMatchesReality: 0 }]), /cannot rely/);
    assert.match(verdict([{ noAutoLayout: 4, inferredAvailable: 2, inferredNull: 2, inferredThrew: 0, inferredMatchesReality: 1 }]), /2 of 4 .* 1 of those match .* \(50%\)/);
    assert.equal(buildReport([box("x", 0, 0, 1, 1)], { editorType: "figma" }).selected, 1);
});
