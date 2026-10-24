import { test } from "node:test";
import assert from "node:assert/strict";
import { toSpec, toHtml, readClasses, writeClasses } from "../src/public/js/shared/design-spec.js";
import { readHtml, applyOps, PatchError } from "../src/services/design-spec.service.js";

const CARD = `<style>.x{color:red}</style>
<div class="rounded-xl border p-6 md:p-8 bg-white foo-bar">
  <h3 class="text-xl font-bold">Pro plan</h3>
  <p>Only <b>$29</b> a month</p>
  <a href="/buy" class="bg-black px-4 py-2 text-white hover:bg-neutral-800">Buy now</a>
  <span>a</span> <span>b</span>
  <svg viewBox="0 0 24 24" class="h-4 w-4"><polyline points="1 2"/><use href="#i"/></svg>
  <img src="x.png" alt="x">
</div>
<script>let a = 1 < 2</script>`;

const spec = (html) => toSpec(readHtml(html));
const find = (tree, id) => {
    for (const n of tree) {
        if (n.id === id) return n;
        const hit = n.children && find(n.children, id);
        if (hit) return hit;
    }
    return null;
};

test("classes split into props by variant, and back, with nothing lost", () => {
    const { props, raw } = readClasses("p-6 md:p-8 hover:bg-neutral-800 md:hover:text-white foo-bar p-4");
    assert.deepEqual(props, { base: { p: "6" }, md: { p: "8" }, hover: { bgColor: "neutral-800" }, "md:hover": { textColor: "white" } });
    assert.deepEqual(raw, ["foo-bar", "p-4"]); // a second padding in the same variant stays raw rather than being dropped
    assert.deepEqual(new Set(writeClasses(props, raw).split(" ")), new Set("p-6 md:p-8 hover:bg-neutral-800 md:hover:text-white foo-bar p-4".split(" ")));
});

test("spec: ids in document order, roles, text, spaces between inline elements, svg kept whole, assets", () => {
    const s = spec(CARD);
    const card = s.tree[0];
    assert.equal(card.id, "n1");
    assert.equal(card.role, "card");
    assert.deepEqual(card.raw, ["foo-bar"]);
    assert.equal(find(s.tree, "n2").text, "Pro plan");
    assert.equal(find(s.tree, "n2").role, "title");
    assert.deepEqual(find(s.tree, "n3").children.map((c) => c.id ?? c.text), ["Only ", "n4", " a month"]);
    assert.equal(find(s.tree, "n5").role, "button");
    assert.ok(card.children.some((c) => c.text === " "), "the space between <span>a</span> and <span>b</span> is kept");
    const svg = find(s.tree, "n8");
    assert.equal(svg.role, "icon");
    assert.match(svg.svg, /<polyline/);
    assert.match(svg.svg, /<use/);
    assert.equal(find(s.tree, "n9").tag, "img"); // nothing inside the svg took an id
    assert.equal(s.assets.css, ".x{color:red}");
    assert.equal(s.assets.js, "let a = 1 < 2");
    assert.deepEqual(s.tokens.radius, ["xl"]);
});

test("spec -> HTML -> spec gives the same spec", () => {
    const s = spec(CARD);
    assert.deepEqual(spec(toHtml(s)), s);
});

test("set and unset write the class in place, at a breakpoint or state", () => {
    const html = `<div class="p-6 bg-white rounded"><a class="bg-black px-4">Go</a></div>`;
    let out = applyOps(html, [{ op: "set", id: "n2", prop: "bgColor", value: "blue-600" }]).html;
    assert.match(out, /class="bg-blue-600 px-4"/);
    out = applyOps(out, [{ op: "set", id: "n2", prop: "bgColor", value: "blue-700", at: "hover" }, { op: "set", id: "n1", prop: "p", value: "8", at: "md" }]).html;
    assert.match(out, /class="bg-blue-600 px-4 hover:bg-blue-700"/);
    assert.match(out, /class="p-6 bg-white rounded md:p-8"/);
    out = applyOps(out, [{ op: "unset", id: "n1", prop: "p", at: "md" }]).html;
    assert.match(out, /class="p-6 bg-white rounded"/);
});

test("text, attr, style, classes and tag", () => {
    const html = `<div><h3>Old</h3><a href="/a" class="x">Link</a></div>`;
    const out = applyOps(html, [
        { op: "text", id: "n2", text: "New <b>&" },
        { op: "attr", id: "n3", name: "href", value: "/b" },
        { op: "attr", id: "n3", name: "target", value: "_blank" },
        { op: "style", id: "n1", value: "color: red" },
        { op: "classes", id: "n3", add: ["y"], remove: ["x"] },
        { op: "tag", id: "n2", tag: "h2" },
    ]).html;
    assert.equal(out, `<div style="color: red"><h2>New &lt;b&gt;&amp;</h2><a href="/b" class="y" target="_blank">Link</a></div>`);
});

test("insert, move and remove", () => {
    const html = `<ul><li>A</li><li>B</li></ul><p>End</p>`;
    let out = applyOps(html, [{ op: "insert", id: "n2", position: "before", html: "<li>Z</li>" }]).html;
    assert.equal(out, `<ul><li>Z</li><li>A</li><li>B</li></ul><p>End</p>`);
    out = applyOps(html, [{ op: "move", id: "n3", to: "n2", position: "before" }, { op: "remove", id: "n4" }]).html;
    assert.equal(out, `<ul><li>B</li><li>A</li></ul>`);
    out = applyOps(html, [{ op: "insert", html: "<footer>F</footer>" }]).html;
    assert.equal(out, `<ul><li>A</li><li>B</li></ul><p>End</p><footer>F</footer>`);
});

test("everything not named stays exactly as written", () => {
    const html = `<!doctype html><html><head><style>a{}</style></head><body>\n  <!-- keep -->\n  <div class="p-4" data-x='1'>  Hi  </div>\n  <p>x</p>\n</body></html>`;
    const out = applyOps(html, [{ op: "text", id: "n2", text: "y" }]).html;
    assert.equal(out, html.replace("<p>x</p>", "<p>y</p>").replace("data-x='1'", "data-x='1'"));
});

test("a bad op changes nothing and says which op and why", () => {
    const html = `<div class="p-4"><p>x</p></div>`;
    const bad = [
        [[{ op: "set", id: "n1", prop: "p", value: "6" }, { op: "set", id: "n9", prop: "p", value: "1" }], /op 2: no element "n9"/],
        [[{ op: "set", id: "n1", prop: "nope", value: "1" }], /unknown prop/],
        [[{ op: "set", id: "n1", prop: "bgColor", value: "not a colour" }], /not a valid bgColor/],
        [[{ op: "set", id: "n1", prop: "p", value: "6", at: "huge" }], /not a breakpoint or state/],
        [[{ op: "text", id: "n1", text: "x" }], /holds other elements/],
        [[{ op: "attr", id: "n1", name: "onclick", value: "x()" }], /not allowed/],
        [[{ op: "tag", id: "n1", tag: "p" }], /can only become/],
        [[{ op: "insert", id: "n1", html: "<script>x</script>" }], /<script>/],
        [[{ op: "move", id: "n1", to: "n2" }], /into itself/],
        [[{ op: "remove", id: "n2" }, { op: "text", id: "n2", text: "x" }], /removed by an earlier op/],
        [[], /non-empty/],
    ];
    for (const [ops, re] of bad) assert.throws(() => applyOps(html, ops), (e) => e instanceof PatchError && re.test(e.message), JSON.stringify(ops));
});

test("self-closing tags and SVG are left as written, even next to a change", () => {
    const html = `<div class="p-4"><img src="a.png" alt="" /><svg viewBox="0 0 2 2"><path d="M1 1"/><circle r="1"/></svg><input class="w-full" /></div>`;
    const out = applyOps(html, [{ op: "set", id: "n1", prop: "p", value: "6" }, { op: "set", id: "n4", prop: "w", value: "1/2" }]).html;
    assert.equal(out, `<div class="p-6"><img src="a.png" alt="" /><svg viewBox="0 0 2 2"><path d="M1 1"/><circle r="1"/></svg><input class="w-1/2" /></div>`);
});

test("malformed HTML is refused with where it breaks, not patched", () => {
    const html = `<section>\n<div class="p-4">\n<div>unclosed\n</section>`;
    assert.throws(() => applyOps(html, [{ op: "set", id: "n1", prop: "p", value: "2" }]), (e) => /malformed around line/.test(e.message));
});
