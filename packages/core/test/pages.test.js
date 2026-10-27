import { test } from "node:test";
import assert from "node:assert/strict";
import { withSharedHead, placeInOrder, normalizeGroup } from "../pages.js";
import { computeLayout, GAP_X, ROW_GAP } from "../board-layout.js";

const SHARED = `<script src="https://cdn.tailwindcss.com"></script>\n<style>body{margin:0}</style>`;

test("shared head: added at the top of an existing <head>", () => {
    const out = withSharedHead(`<!doctype html><html><head><title>Home</title></head><body><p>x</p></body></html>`, SHARED);
    assert.equal(out, `<!doctype html><html><head>\n${SHARED}<title>Home</title></head><body><p>x</p></body></html>`);
});

test("shared head: a head with attributes is found; <header> is not a head", () => {
    assert.match(withSharedHead(`<html><head data-x="1"><meta charset="utf-8"></head><body></body></html>`, SHARED), /<head data-x="1">\n<script src=/);
    // no head, but a <header> in the body: a head is made after <html>, not inside the header
    const out = withSharedHead(`<html><body><header class="p-4">Nav</header></body></html>`, SHARED);
    assert.equal(out, `<html>\n<head>\n${SHARED}\n</head><body><header class="p-4">Nav</header></body></html>`);
});

test("shared head: a page with no <html> gets it after its doctype, or in front", () => {
    assert.equal(withSharedHead(`<!DOCTYPE html>\n<div>x</div>`, SHARED), `<!DOCTYPE html>\n${SHARED}\n<div>x</div>`);
    assert.equal(withSharedHead(`<main class="p-6">x</main>`, SHARED), `${SHARED}\n<main class="p-6">x</main>`);
});

test("shared head: nothing to add, or already there, changes nothing", () => {
    const page = `<html><head>\n${SHARED}</head><body>x</body></html>`;
    assert.equal(withSharedHead(page, SHARED), page);
    assert.equal(withSharedHead(page, `  ${SHARED}\n`), page, "extra whitespace in what is shared doesn't matter");
    assert.equal(withSharedHead("<p>x</p>", ""), "<p>x</p>");
    assert.equal(withSharedHead("<p>x</p>", undefined), "<p>x</p>");
    const once = withSharedHead("<p>x</p>", SHARED);
    assert.equal(withSharedHead(once, SHARED), once, "saving a page again does not add it twice");
});

test("order: the named pages take their places in the given order, the others stay", () => {
    assert.deepEqual(placeInOrder(["a", "b", "c", "d"], ["d", "c", "b", "a"]), ["d", "c", "b", "a"], "all of them, reversed");
    assert.deepEqual(placeInOrder(["a", "x", "b"], ["b", "a"]), ["b", "x", "a"], "two of three: the one between stays");
    assert.deepEqual(placeInOrder(["a", "b", "c"], ["c"]), ["a", "b", "c"], "one page cannot move on its own");
    assert.deepEqual(placeInOrder(["a", "b", "c"], ["a", "b", "c"]), ["a", "b", "c"], "the order it already has");
    assert.deepEqual(placeInOrder(["a", "b", "new1", "new2"], ["new1", "a", "new2"]), ["new1", "b", "a", "new2"], "new pages are last before they are placed, then take the places given");
    assert.deepEqual(placeInOrder(["a", "b"], ["b", "b", "a", "zzz"]), ["b", "a"], "repeats and unknown ids are ignored");
});

test("group names are tidied and kept short", () => {
    assert.equal(normalizeGroup("  Public   site "), "Public site");
    assert.equal(normalizeGroup(undefined), "");
    assert.equal(normalizeGroup(null), "");
    assert.equal(normalizeGroup(42), "42");
    assert.equal(normalizeGroup("x".repeat(100)).length, 60);
});

const W = 1000, H = 500;
const layout = (items) => computeLayout(items, { frameW: W, heightOf: () => H });

test("layout: without groups it is one row, as before", () => {
    const pos = layout([{ id: "a", kind: "page" }, { id: "b", kind: "page" }, { id: "s", kind: "section", parent: "a" }]);
    assert.deepEqual(pos.a, { x: 0, y: 0 });
    assert.deepEqual(pos.b, { x: W + GAP_X, y: 0 });
    assert.deepEqual(pos.s, { x: 0, y: H + 260 }, "a section sits under its page");
});

test("layout: each group is its own row, in the order the groups first appear; saved positions win", () => {
    const pos = layout([
        { id: "home", kind: "page", group: "Public site" },
        { id: "pricing", kind: "page", group: "Public site" },
        { id: "keys", kind: "page", group: "Customer area" },
        { id: "docs", kind: "page", group: "Public site" },
        { id: "dragged", kind: "page", group: "Customer area", board: { x: -50, y: 7 } },
        { id: "bill", kind: "page", group: "Customer area" },
        { id: "loose", kind: "page" },
    ]);
    assert.deepEqual(pos.home, { x: 0, y: 0 });
    assert.deepEqual(pos.pricing, { x: W + GAP_X, y: 0 });
    assert.deepEqual(pos.docs, { x: 2 * (W + GAP_X), y: 0 }, "the third page of the group is in the same row, though another group's page came between");
    const second = H + ROW_GAP;
    assert.deepEqual(pos.keys, { x: 0, y: second });
    assert.deepEqual(pos.dragged, { x: -50, y: 7 }, "a saved position wins");
    assert.deepEqual(pos.bill, { x: 2 * (W + GAP_X), y: second }, "it still takes its place in the row, which keeps the others where they were");
    assert.deepEqual(pos.loose, { x: 0, y: 2 * second }, "pages with no group get a row of their own");
});

test("layout: a row starts below the sections of the row above", () => {
    const pos = layout([
        { id: "a", kind: "page", group: "One" },
        { id: "s1", kind: "section", parent: "a" },
        { id: "s2", kind: "section", parent: "a" },
        { id: "b", kind: "page", group: "Two" },
    ]);
    const lastSectionBottom = pos.s2.y + H;
    assert.equal(pos.b.y, lastSectionBottom + ROW_GAP);
});
