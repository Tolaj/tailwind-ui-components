import test from "node:test";
import assert from "node:assert/strict";
import { groupOf, twValue } from "../prop-tailwind.js";

test("visibility and user-select are Tailwind classes, not inline styles", () => {
    assert.equal(groupOf("visibility"), "visibility");
    assert.equal(twValue("visibility", "hidden", false), "invisible");
    assert.equal(twValue("visibility", "visible", false), "visible");
    assert.equal(groupOf("user-select"), "userSelect");
    assert.equal(twValue("user-select", "none", false), "select-none");
});

test("opacity: the panel's fraction becomes the class number, with or without a scale class under it", () => {
    assert.equal(twValue("opacity", "0.9", false), "90");
    assert.equal(twValue("opacity", "0.9", true), "90"); // was "1": a fraction over an existing opacity-50
    assert.equal(twValue("opacity", "50", true), "50");
    assert.equal(twValue("opacity", "0", true), "0");
});
