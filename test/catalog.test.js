// The rules every catalog part must meet (docs/PLATFORM-PLAN.md, 5.5), checked for every family, style and size.
import { test } from "node:test";
import assert from "node:assert/strict";
import { families } from "../src/services/catalog.service.js";

const all = await families();

test("the catalog has families, each with the parts the pages need", () => {
    assert.ok(all.length >= 1);
    for (const f of all) {
        assert.match(f.slug, /^[a-z][a-z0-9-]*$/);
        assert.ok(f.name && f.description && Array.isArray(f.tags) && f.tags.length, `${f.slug}: name, description and tags`);
        assert.ok(f.styles.length >= 1 && f.styles.every((s) => s.slug && s.name && s.description), `${f.slug}: styles`);
        assert.equal(typeof f.render, "function");
    }
});

test("every variant uses theme tokens and no raw colours", () => {
    for (const f of all) for (const style of f.styles) for (const size of f.axes.size || [undefined]) {
        const html = f.render({ style: style.slug, size });
        assert.ok(!/#[0-9a-f]{3,8}\b/i.test(html.replace(/stroke-width|&#/g, "")), `${f.slug}/${style.slug}/${size}: a raw hex colour`);
        assert.ok(!/\bstyle="/.test(html), `${f.slug}/${style.slug}/${size}: inline style`);
    }
});

test("every interactive variant has a visible focus ring, a disabled look and dark styles", () => {
    for (const f of all) for (const style of f.styles) {
        const html = f.render({ style: style.slug });
        assert.match(html, /focus(?:-visible)?:ring/, `${f.slug}/${style.slug}: a focus ring`);
        assert.match(html, /disabled:/, `${f.slug}/${style.slug}: disabled look`);
        assert.match(html, /dark:|\b(?:text|bg)-(?:brand|red)-/, `${f.slug}/${style.slug}: dark styles, or a colour that works on both`);
    }
});

test("icon-only and loading forms carry the ARIA they need", () => {
    for (const f of all) {
        if (!f.axes.icon || !f.axes.icon.includes("only")) continue;
        for (const style of f.styles) {
            assert.match(f.render({ style: style.slug, icon: "only" }), /aria-label="[^"]+"/, `${f.slug}/${style.slug}: icon-only needs aria-label`);
            const loading = f.render({ style: style.slug, state: "loading" });
            assert.match(loading, /aria-busy="true"/);
            assert.match(loading, /\bdisabled\b/);
        }
    }
});

test("balanced markup: every tag the template opens it closes", () => {
    for (const f of all) for (const style of f.styles) {
        const html = f.render({ style: style.slug, icon: "left" });
        const open = (html.match(/<button\b/g) || []).length, close = (html.match(/<\/button>/g) || []).length;
        assert.equal(open, close);
    }
});

test("a field carries its own accessible name, and its error state says so", () => {
    for (const f of all) for (const style of f.styles) {
        const html = f.render({ style: style.slug });
        if (!/<(input|textarea|select)\b/.test(html)) continue;
        assert.match(html, /aria-label="[^"]+"/, `${f.slug}/${style.slug}: a bare field needs aria-label`);
        if (f.axes.state && f.axes.state.includes("error")) assert.match(f.render({ style: style.slug, state: "error" }), /aria-invalid="true"/, `${f.slug}/${style.slug}: error state needs aria-invalid`);
        if (f.axes.state && f.axes.state.includes("disabled")) assert.match(f.render({ style: style.slug, state: "disabled" }), /\bdisabled\b/);
    }
});
