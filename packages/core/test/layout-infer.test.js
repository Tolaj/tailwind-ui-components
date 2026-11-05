import test from "node:test";
import assert from "node:assert/strict";
import { bestLayout, fitLayouts, inferLayouts, layoutRects } from "../layout-infer.js";

const box = { x: 0, y: 0, w: 600, h: 200 };
const sizes = (n, w = 100, h = 60) => Array.from({ length: n }, () => ({ w, h }));
const place = (c, b = box, s = sizes(3)) => layoutRects(c, b, s).map((p, i) => ({ ...p, w: s[i].w, h: s[i].h }));

test("a row with a gap is read back as a row with that gap", () => {
    const r = place({ kind: "row", justify: "start", items: "start", gap: 16 });
    const { best } = bestLayout(box, r);
    assert.equal(best.kind, "row"); assert.equal(best.gap, 16); assert.equal(best.items, "start"); assert.equal(best.justify, "start");
});

test("centred, spread out and pushed to the end are told apart", () => {
    assert.equal(bestLayout(box, place({ kind: "row", justify: "center", items: "start", gap: 8 })).best.justify, "center");
    assert.equal(bestLayout(box, place({ kind: "row", justify: "between", items: "start", gap: 0 })).best.justify, "between");
    const push = bestLayout(box, place({ kind: "row", justify: "start", items: "start", gap: 8, push: 2 })).best;
    assert.equal(push.push, 2); assert.equal(push.gap, 8);
});

test("a column is a column", () => {
    const b = { x: 0, y: 0, w: 300, h: 600 };
    const { best } = bestLayout(b, place({ kind: "col", justify: "start", items: "stretch", gap: 12 }, b, sizes(4, 300, 50)));
    assert.equal(best.kind, "col"); assert.equal(best.gap, 12);
});

test("four equal cells in two columns are a grid", () => {
    const b = { x: 0, y: 0, w: 424, h: 400 };
    const r = place({ kind: "grid", cols: 2, gapX: 24, gapY: 16 }, b, sizes(4, 200, 100));
    const g = inferLayouts(b, r).find((c) => c.kind === "grid");
    assert.ok(g); assert.equal(g.cols, 2); assert.equal(g.gapX, 24); assert.equal(g.gapY, 16);
});

test("children that overlap or are out of order have no clean layout", () => {
    const r = [{ x: 0, y: 0, w: 100, h: 50 }, { x: 40, y: 20, w: 100, h: 50 }, { x: 300, y: 5, w: 100, h: 50 }];
    assert.equal(inferLayouts(box, r).length, 0);
});

test("one child dropped off its place is sent back to it", () => {
    const orig = place({ kind: "row", justify: "start", items: "start", gap: 16 }, box, sizes(4));
    const moved = orig.map((r, i) => (i === 2 ? { ...r, x: r.x + 9, y: r.y + 14 } : r));
    const best = fitLayouts(box, moved, { tol: 1.5, drag: 40 })[0];
    assert.equal(best.outlier, 2);
    assert.ok(Math.abs(best.snap.x - orig[2].x) < 1 && Math.abs(best.snap.y - orig[2].y) < 1);
});

// ── property: any layout the engine can place is found again from where it put the children ─────────────────────
function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
test("property: layouts are recovered from their own placements (400 random)", () => {
    const rand = rng(3), pick = (a) => a[Math.floor(rand() * a.length)];
    for (let i = 0; i < 400; i++) {
        const n = 3 + Math.floor(rand() * 3), kind = pick(["row", "col"]);
        const s = Array.from({ length: n }, () => ({ w: pick([60, 80, 120]), h: pick([40, 50, 70]) }));
        const c = { kind, justify: pick(["start", "end", "center", "between"]), items: pick(["start", "center", "end"]), gap: pick([0, 8, 16, 24]) };
        if (c.justify === "between") c.gap = 0;
        const b = { x: 10, y: 10, w: 800, h: 500 };
        const r = layoutRects(c, b, s).map((p, k) => ({ ...p, w: s[k].w, h: s[k].h }));
        const found = fitLayouts(b, r, { tol: 1.5, drag: 0 });
        assert.ok(found.length, `nothing found for ${JSON.stringify(c)}`);
        const ok = found.some((f) => layoutRects(f, b, s).every((p, k) => Math.abs(p.x - r[k].x) <= 1.5 && Math.abs(p.y - r[k].y) <= 1.5));
        assert.ok(ok);
    }
});

test("fixed-width children dropped as A B / C are a content-sized 2-column grid, not a pixel offset", () => {
    const box = { x: 40, y: 40, w: 1200, h: 300 };
    const w = 144, h = 96;
    // A and B in the first row, C let go about where the second row would start, a few pixels off
    const rects = [{ x: 40, y: 40, w, h }, { x: 40 + w + 16, y: 40, w, h }, { x: 43, y: 40 + h + 12, w, h }];
    const fit = fitLayouts(box, rects, { tol: 1.5, drag: 40 }).filter((c) => c.kind === "grid" && c.fit && c.cols === 2 && c.gapX === 16 && c.gapY === 16);
    assert.ok(fit.length, "a fitted grid exists");
    assert.equal(fit[0].outlier, 2); // C settles into its cell
    assert.ok(Math.hypot(fit[0].snap.x - 43, fit[0].snap.y - 152) < 8);
});

test("judge: the drop's relations are kept; the reading that needs less width survives on more devices", async () => {
    const { judgeLayouts, relationsOf } = await import("../layout-infer.js");
    const box = { x: 0, y: 0, w: 1200, h: 300 }, w = 144, h = 96;
    const rects = [{ x: 0, y: 0, w, h }, { x: w + 16, y: 0, w, h }, { x: 0, y: h + 16, w, h }];
    assert.deepEqual(relationsOf(rects).map((r) => r.join()).sort(), ["0,1,right", "0,2,below", "1,2,below"].sort());
    const fits = fitLayouts(box, rects, { tol: 1.5, drag: 0 });
    const judged = judgeLayouts(fits, box, rects, { frameW: 1280 });
    assert.ok(judged.length && judged.every((c) => c.holds));
    assert.ok(judged.some((c) => c.kind === "grid" && c.fit && c.cols === 2 && c.need === 2 * w + 16));
    assert.ok(!judged.some((c) => c.kind === "row"), "a row cannot keep C below A");
    assert.equal(judged.find((c) => c.kind === "grid" && c.fit).survives, 2); // 768 and 1280 hold; at 375 the box is 295px, 304 are needed
});
