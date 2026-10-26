import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/public/js/design/store.js";

test("get, set and subscribe: a change tells the subscribers once, and no change tells nobody", () => {
    const store = createStore({ tab: "design", bp: "" });
    const seen = [];
    const stop = store.subscribe((state) => seen.push({ ...state }));
    store.set({ tab: "ai" });
    assert.equal(store.get().tab, "ai");
    assert.equal(store.get().bp, "");
    store.set({ tab: "ai" }); // the same value: nothing happened
    store.set({});
    assert.deepEqual(seen, [{ tab: "ai", bp: "" }]);
    store.set({ tab: "classes", bp: "md" }); // two keys, one notification
    assert.equal(seen.length, 2);
    stop();
    store.set({ bp: "lg" });
    assert.equal(seen.length, 2, "an unsubscribed function is not called");
});

test("state is replaced, never changed in place", () => {
    const store = createStore({ open: new Set(["a"]), tab: "design" });
    const before = store.get();
    store.set({ tab: "ai" });
    assert.notEqual(store.get(), before);
    assert.equal(before.tab, "design", "the state a subscriber was given does not change under it");
    assert.equal(store.get().open, before.open, "what was not changed is shared, not copied");
});

test("set takes a function of the current state", () => {
    const store = createStore({ palette: null, count: 0 });
    store.set(({ count }) => ({ count: count + 1 }));
    store.set(({ count }) => ({ count: count + 1 }));
    assert.equal(store.get().count, 2);
    let calls = 0;
    store.subscribe(() => calls++);
    store.set(({ palette }) => ({ palette })); // returns what is already there
    assert.equal(calls, 0);
});

test("a Set that is replaced counts as a change; the same Set does not", () => {
    const open = new Set(["a"]);
    const store = createStore({ open });
    let calls = 0;
    store.subscribe(() => calls++);
    store.set({ open });
    assert.equal(calls, 0);
    store.set({ open: new Set(["a"]) });
    assert.equal(calls, 1);
});

test("the panel's sections: a click flips what is shown, and remembers it", async () => {
    const { panelStore, toggleSection, togglePalette } = await import("../src/public/js/design/panel-state.js");
    assert.ok(panelStore.get().open.has("geom"), "position and size starts open");
    toggleSection("geom", true);
    assert.ok(!panelStore.get().open.has("geom"));
    assert.ok(panelStore.get().closed.has("geom"), "closed on purpose, so a section that can open by itself stays shut");
    toggleSection("geom", false);
    assert.ok(panelStore.get().open.has("geom"));
    assert.ok(!panelStore.get().closed.has("geom"));
    toggleSection("css-offsets", false); // a section that was open only by itself (shown, not in `open`): its click closes it
    assert.ok(panelStore.get().open.has("css-offsets"));
    toggleSection("css-offsets", true);
    assert.ok(panelStore.get().closed.has("css-offsets"));
    togglePalette("bgColor");
    assert.equal(panelStore.get().palette, "bgColor");
    togglePalette("textColor");
    assert.equal(panelStore.get().palette, "textColor");
    togglePalette("textColor");
    assert.equal(panelStore.get().palette, null);
});
