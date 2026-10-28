import { test } from "node:test";
import assert from "node:assert/strict";
import { kindOfCategory } from "../src/routes/home.routes.js";

test("the category decides whether a design is a page or a component", () => {
    assert.equal(kindOfCategory("pages-pricing"), "page");
    assert.equal(kindOfCategory("marketing-hero"), "component");
    assert.equal(kindOfCategory("apps-general"), "component");
    assert.equal(kindOfCategory("something-unknown"), "component");
});
