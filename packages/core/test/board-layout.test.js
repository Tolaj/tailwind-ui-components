import test from "node:test";
import assert from "node:assert/strict";
import { computeLayout } from "../board-layout.js";

const size = { frameW: 1280, heightOf: () => 900, widthOf: () => 1280 };
const overlap = (pos, items) => {
    const r = items.map((i) => ({ id: i.id, x: pos[i.id].x, y: pos[i.id].y, r: pos[i.id].x + 1280, b: pos[i.id].y + 900 }));
    return r.some((a, i) => r.slice(i + 1).some((b) => a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y));
};

test("pages without positions sit in a row, nothing on another", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const pos = computeLayout(items, size);
    assert.equal(pos.a.x, 0);
    assert.ok(pos.b.x > pos.a.x + 1280 && pos.c.x > pos.b.x + 1280);
    assert.equal(overlap(pos, items), false);
});

test("a page with a saved position keeps it, and one without goes round it", () => {
    const items = [{ id: "a", board: { x: 1600, y: 0 } }, { id: "b" }, { id: "c" }];
    const pos = computeLayout(items, size);
    assert.deepEqual(pos.a, { x: 1600, y: 0 });
    assert.equal(overlap(pos, items), false);
});

test("a page without a position isn't put on a saved page in the row below", () => {
    const items = [{ id: "a", group: "One" }, { id: "b", group: "Two", board: { x: 0, y: 3000 } }, { id: "c", group: "Two" }, { id: "d", group: "One", board: { x: 1600, y: 1200 } }, { id: "e", group: "One" }];
    const pos = computeLayout(items, size);
    assert.deepEqual(pos.b, { x: 0, y: 3000 });
    assert.deepEqual(pos.d, { x: 1600, y: 1200 });
    assert.equal(overlap(pos, items), false);
});

test("sections stack under their page and never touch another frame", () => {
    const items = [{ id: "p", kind: "page" }, { id: "s1", kind: "section", parent: "p" }, { id: "s2", kind: "section", parent: "p" }, { id: "q", kind: "page", board: { x: 0, y: 1300 } }];
    const pos = computeLayout(items, size);
    assert.equal(pos.s1.x, pos.p.x);
    assert.ok(pos.s1.y > pos.p.y + 900);
    assert.equal(overlap(pos, items), false);
});

test("moving a page by hand doesn't move another one", () => {
    const base = [{ id: "a" }, { id: "b" }, { id: "c", group: "Two" }];
    const before = computeLayout(base, size);
    const moved = computeLayout([{ id: "a", board: { x: 0, y: 5000 } }, { id: "b" }, { id: "c", group: "Two" }], size);
    assert.deepEqual(moved.b, before.b);
    assert.deepEqual(moved.c, before.c);
});

test("same input, same output", () => {
    const items = [{ id: "a", board: { x: 0, y: 0 } }, { id: "b" }, { id: "c", board: { x: 1000, y: 100 } }, { id: "d" }];
    assert.deepEqual(computeLayout(items, size), computeLayout(items, size));
});
