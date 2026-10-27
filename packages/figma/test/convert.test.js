import { test } from "node:test";
import assert from "node:assert/strict";
import { readClasses } from "@windcraft/core/design-spec.js";
import { convertDesign } from "../src/convert.js";

const rgb = (r, g, b) => ({ r: r / 255, g: g / 255, b: b / 255 });
const solid = (r, g, b, opacity = 1) => ({ type: "SOLID", color: rgb(r, g, b), opacity });
const at = (x, y) => [[1, 0, x], [0, 1, y]];
const text = (name, characters, extra = {}) => ({ type: "TEXT", name, characters, width: 100, height: 24, fontName: { family: "Inter", style: "Regular" }, fontSize: 14, fills: [solid(17, 17, 17)], textAutoResize: "WIDTH_AND_HEIGHT", layoutSizingHorizontal: "HUG", layoutSizingVertical: "HUG", ...extra });
const classesOf = (html) => [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1]);

const card = {
    type: "FRAME", name: "Card", width: 360, height: 180, layoutMode: "VERTICAL", primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
    paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16, itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "HUG",
    fills: [solid(255, 255, 255)], strokes: [solid(229, 229, 229)], strokeWeight: 1, strokeAlign: "INSIDE", cornerRadius: 12,
    effects: [{ type: "DROP_SHADOW", color: { ...rgb(0, 0, 0), a: 0.1 }, offset: { x: 0, y: 4 }, radius: 12, spread: 0 }],
    children: [
        text("Title", "Pro plan", { fontSize: 20, fontName: { family: "Inter", style: "SemiBold" }, lineHeight: { unit: "PIXELS", value: 28 } }),
        text("Body", "Everything you need.", { width: 328, textAutoResize: "HEIGHT", layoutSizingHorizontal: "FILL", fills: [solid(82, 82, 82)] }),
        {
            type: "FRAME", name: "Button", width: 120, height: 40, layoutMode: "HORIZONTAL", primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
            paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16, itemSpacing: 8, layoutSizingHorizontal: "HUG", layoutSizingVertical: "HUG",
            fills: [solid(37, 99, 235)], cornerRadius: 8, children: [text("Label", "Buy now", { fills: [solid(255, 255, 255)] })],
        },
    ],
};

test("an Auto Layout frame becomes a flex box with the same direction, padding, gap and alignment", () => {
    const { body } = convertDesign(card);
    const root = classesOf(body)[0];
    for (const c of ["flex", "flex-col", "items-start", "p-4", "gap-3", "w-[360px]", "rounded-xl", "border", "bg-[#ffffff]", "border-[#e5e5e5]"]) assert.ok(root.split(" ").includes(c), `root should have ${c}: ${root}`);
    assert.ok(!/\bh-\[/.test(root), "a frame that hugs its content has no height");
    assert.ok(!root.includes("absolute"), "the top frame is not positioned");
    assert.match(root, /shadow-\[0px_4px_12px_0px_rgba\(0,0,0,0\.1\)\]/);
});

test("children: text styles, fill width, and a hugging button", () => {
    const { body, stats } = convertDesign(card);
    const [, title, para, button, label] = classesOf(body);
    for (const c of ["text-xl", "font-semibold", "leading-7", "text-[#111111]", "whitespace-nowrap", "font-['Inter',sans-serif]"]) assert.ok(title.split(" ").includes(c), `title should have ${c}: ${title}`);
    assert.ok(para.split(" ").includes("self-stretch"), `fill width on the cross axis of a column: ${para}`);
    assert.ok(!para.includes("whitespace-nowrap"));
    for (const c of ["flex", "flex-row", "justify-center", "items-center", "px-4", "py-2", "gap-2", "rounded-lg", "bg-[#2563eb]"]) assert.ok(button.split(" ").includes(c), `button should have ${c}: ${button}`);
    assert.ok(label.includes("text-[#ffffff]"));
    assert.equal(stats.flex, 2);
    assert.equal(stats.text, 3);
    assert.match(body, />Buy now<\/p>/);
});

test("a frame without Auto Layout places its children at their exact positions", () => {
    const frame = {
        type: "FRAME", name: "Free", width: 400, height: 300, fills: [solid(240, 240, 240)], clipsContent: true,
        children: [
            { type: "RECTANGLE", name: "Box", width: 100, height: 50, transform: at(20, 30), fills: [solid(255, 0, 0)], cornerRadius: 4 },
            { type: "ELLIPSE", name: "Dot", width: 40, height: 40, transform: at(200, 100.5), fills: [solid(0, 0, 255)] },
        ],
    };
    const [root, box, dot] = classesOf(convertDesign(frame).body);
    for (const c of ["relative", "w-[400px]", "h-[300px]", "overflow-hidden", "bg-[#f0f0f0]"]) assert.ok(root.split(" ").includes(c), `root: ${c} in ${root}`);
    for (const c of ["absolute", "left-5", "top-[30px]", "w-[100px]", "h-[50px]", "bg-[#ff0000]"]) assert.ok(box.split(" ").includes(c) || c === "top-[30px]" && box.includes("top-"), `box: ${c} in ${box}`);
    assert.ok(dot.includes("rounded-full") && dot.includes("top-[100.5px]"), dot);
});

test("a rotated node keeps its centre and turns about it", () => {
    const frame = { type: "FRAME", name: "R", width: 200, height: 200, children: [{ type: "RECTANGLE", name: "Turned", width: 40, height: 20, transform: [[0, -1, 100], [1, 0, 0]], fills: [solid(0, 0, 0)] }] };
    const turned = classesOf(convertDesign(frame).body)[1];
    assert.ok(turned.includes("rotate-[90deg]"), turned);
    assert.ok(turned.includes("left-[70px]") && turned.includes("top-2.5"), turned);
});

test("a left to right gradient is 90deg with its stops in place", () => {
    const frame = { type: "FRAME", name: "G", width: 100, height: 50, fills: [{ type: "GRADIENT_LINEAR", gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: { ...rgb(255, 0, 0), a: 1 } }, { position: 1, color: { ...rgb(0, 0, 255), a: 1 } }] }] };
    assert.ok(convertDesign(frame).body.includes("bg-[linear-gradient(90deg,#ff0000_0%,#0000ff_100%)]"));
});

test("hidden nodes, and a mask with nothing after it, are left out", () => {
    const frame = { type: "FRAME", name: "H", width: 10, height: 10, children: [{ type: "RECTANGLE", name: "Hidden", visible: false, width: 1, height: 1 }, { type: "RECTANGLE", name: "Mask", isMask: true, width: 1, height: 1 }] };
    const r = convertDesign(frame);
    assert.equal(classesOf(r.body).length, 1);
});

test("a vector the plugin exported is inlined at its box, without its fixed size", () => {
    const frame = { type: "FRAME", name: "V", width: 100, height: 100, children: [{ type: "VECTOR", name: "Icon", width: 24, height: 24, box: { x: 10, y: 12, width: 24, height: 24 }, svg: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0"/></svg>' }] };
    const { body, stats } = convertDesign(frame);
    assert.equal(stats.assets, 1);
    assert.match(body, /<svg viewBox="0 0 24 24" class="block h-full w-full">/);
    assert.ok(classesOf(body)[1].includes("left-2.5"), "10px is the 2.5 step");
});

test("text with different runs becomes spans; line breaks become <br>; text is escaped", () => {
    const t = text("Mixed", "Hi <b>\nthere", { segments: [{ characters: "Hi <b>\n", fontSize: 14, fontName: { family: "Inter", style: "Regular" }, fills: [solid(0, 0, 0)] }, { characters: "there", fontSize: 14, fontName: { family: "Inter", style: "Bold" }, fills: [solid(200, 0, 0)] }] });
    const { body } = convertDesign({ type: "FRAME", name: "T", width: 100, height: 40, children: [t] });
    assert.match(body, /<span[^>]*>Hi &lt;b&gt;<br><\/span>/);
    assert.match(body, /<span class="[^"]*font-bold[^"]*text-\[#c80000\][^"]*">there<\/span>/);
});

test("the page links the fonts it uses, and loads Tailwind", () => {
    const { html, fonts } = convertDesign(card, { title: "Pricing" });
    assert.deepEqual(fonts, ["Inter"]);
    assert.match(html, /family=Inter:wght@400;600&display=swap/);
    assert.match(html, /<title>Pricing<\/title>/);
    assert.match(html, /cdn\.tailwindcss\.com/);
});

test("what we write stays editable: every class is a property Windcraft knows, except these arbitrary ones", () => {
    const frame = { ...card, children: [...card.children, { type: "RECTANGLE", name: "Grad", width: 50, height: 50, transform: at(0, 0), layoutPositioning: "ABSOLUTE", fills: [{ type: "GRADIENT_LINEAR", gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: { ...rgb(0, 0, 0), a: 1 } }, { position: 1, color: { ...rgb(255, 255, 255), a: 1 } }] }] }] };
    const { body } = convertDesign(frame);
    const allowed = /^(font-\['|tracking-\[|shadow-\[|bg-\[(linear|radial)-gradient|blur-\[|backdrop-blur-\[)/;
    for (const cls of classesOf(body)) {
        const { raw } = readClasses(cls);
        for (const tok of raw) assert.match(tok, allowed, `"${tok}" is not a property the panel understands (in: ${cls})`);
    }
});

test("a font gets a fallback family and its own link, so a font Google lacks cannot stop the rest", () => {
    const frame = { type: "FRAME", name: "F", width: 100, height: 100, children: [text("A", "Hi", { fontName: { family: "Chronicle Display", style: "Bold" } }), text("B", "Yo", { fontName: { family: "Gilroy", style: "Regular" } }), text("C", "x", { fontName: { family: "Fira Code", style: "Regular" } })] };
    const { body, html, warnings } = convertDesign(frame);
    assert.ok(body.includes("font-['Chronicle_Display','Playfair_Display',serif]"), body);
    assert.ok(body.includes("font-['Gilroy','Montserrat',sans-serif]"));
    assert.ok(warnings.some((w) => w.includes("Gilroy → Montserrat")), "names the replacement");
    assert.ok(body.includes("font-['Fira_Code',monospace]"));
    assert.equal((html.match(/fonts\.googleapis\.com\/css2/g) || []).length, 3, "one link per family");
});

test("a rotation of a hair is left out", () => {
    const tiny = 1e-9;
    const frame = { type: "FRAME", name: "R", width: 50, height: 50, children: [{ type: "RECTANGLE", name: "Level", width: 10, height: 10, transform: [[1, -tiny, 5], [tiny, 1, 5]], fills: [solid(0, 0, 0)] }] };
    assert.ok(!convertDesign(frame).body.includes("rotate-"));
});

test("a picture fill is a background in the style attribute, sized to cover, with the colour kept as a class", () => {
    const frame = {
        type: "FRAME", name: "Hero", width: 200, height: 100, children: [],
        fills: [solid(11, 29, 38), { type: "IMAGE", imageHash: "abc", scaleMode: "FILL", dataUri: "data:image/webp;base64,AAAA" }],
    };
    const { body, warnings } = convertDesign(frame);
    assert.match(body, /style="background-image:url\(data:image\/webp;base64,AAAA\)"/);
    for (const c of ["bg-cover", "bg-center", "bg-[#0b1d26]"]) assert.ok(classesOf(body)[0].split(" ").includes(c), `${c} in ${classesOf(body)[0]}`);
    assert.ok(!classesOf(body)[0].includes("data:"), "the picture is not in the class list");
    assert.deepEqual(warnings, []);
});

test("a picture fill with no data is a warning, not an empty box without notice", () => {
    const { warnings } = convertDesign({ type: "FRAME", name: "Hero", width: 20, height: 20, fills: [{ type: "IMAGE", imageHash: "abc", scaleMode: "FILL" }] });
    assert.ok(warnings.some((w) => /Hero: a picture fill could not be included/.test(w)));
});

test("children sitting evenly in a row become a flex row; overlapping ones stay placed", () => {
    const box = (name, x, y, w, h) => ({ type: "RECTANGLE", name, width: w, height: h, transform: at(x, y), fills: [solid(1, 2, 3)] });
    const row = { type: "FRAME", name: "Row", width: 300, height: 60, fills: [], children: [box("a", 10, 5, 50, 30), box("b", 80, 5, 50, 30), box("c", 150, 5, 50, 30)] };
    const r = convertDesign(row);
    const [root, a] = classesOf(r.body);
    for (const c of ["flex", "flex-row", "items-start", "gap-5", "pl-2.5", "pt-[5px]"]) assert.ok(root.split(" ").includes(c), `row: ${c} in ${root}`);
    assert.ok(!a.includes("absolute"), a);
    assert.equal(r.stats.detected, 1);
    const stacked = { ...row, children: [box("a", 10, 5, 50, 30), box("b", 30, 10, 50, 30)] };
    assert.equal(convertDesign(stacked).stats.detected, 0);
});

test("layers wholly outside a frame that clips are left out; a frame that does not clip keeps them", () => {
    const box = (name, x, y) => ({ type: "RECTANGLE", name, width: 40, height: 40, transform: at(x, y), fills: [solid(1, 2, 3)] });
    const kids = [box("inside", 10, 10), box("right", 500, 10), box("left", -200, 10), box("below", 10, 400), box("edge", 90, 90)];
    const clipped = convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, clipsContent: true, fills: [], children: kids });
    assert.equal((clipped.body.match(/<div/g) || []).length, 3, clipped.body); // the frame, "inside" and "edge" (it crosses the border)
    assert.equal(clipped.stats.skipped, 3);
    assert.ok(clipped.warnings.some((w) => w.includes("3 layers lying outside")), clipped.warnings.join("|"));
    const open = convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, clipsContent: false, fills: [], children: kids });
    assert.equal(open.stats.skipped, 0);
    assert.equal((open.body.match(/<div/g) || []).length, 6);
});

const rect = (name, x, y, w, h, extra = {}) => ({ type: "RECTANGLE", name, width: w, height: h, transform: at(x, y), fills: [solid(1, 2, 3)], ...extra });

test("a mask shapes the layers after it, not the ones before it", () => {
    const frame = { type: "FRAME", name: "F", width: 200, height: 100, fills: [], children: [
        rect("before", 0, 0, 10, 10),
        rect("Mask", 20, 10, 100, 60, { isMask: true, cornerRadius: 12 }),
        rect("photo", 0, 0, 200, 100), rect("badge", 150, 5, 20, 20),
    ] };
    const r = convertDesign(frame);
    assert.equal(r.stats.masked, 1);
    const [wrapper] = r.body.match(/<div class="absolute inset-0" style="[^"]*">/);
    assert.match(wrapper, /mask-image:url\(&quot;data:image\/svg\+xml,/);
    const encoded = /data:image\/svg\+xml,([^&]*)&quot;/.exec(wrapper)[1];
    assert.match(decodeURIComponent(encoded), /<rect x="20" y="10" width="100" height="60" rx="12"/);
    const inside = r.body.slice(r.body.indexOf(wrapper));
    assert.ok(inside.includes("w-[200px]") && inside.includes("w-5"), "the layers after the mask are inside the masked box");
    assert.ok(r.body.indexOf("w-2.5") < r.body.indexOf(wrapper), "the layer before it is not masked");
});

test("a mask in an Auto Layout frame is left out, as is one hidden", () => {
    const auto = { type: "FRAME", name: "A", width: 100, height: 100, layoutMode: "VERTICAL", fills: [], children: [rect("Mask", 0, 0, 10, 10, { isMask: true }), rect("x", 0, 0, 10, 10)] };
    assert.equal(convertDesign(auto).stats.masked, 0);
    const hidden = { type: "FRAME", name: "H", width: 100, height: 100, fills: [], children: [rect("Mask", 0, 0, 10, 10, { isMask: true, visible: false }), rect("x", 0, 0, 10, 10)] };
    assert.equal(convertDesign(hidden).stats.masked, 0);
});

test("strokes: outside and centred ones are rings, joined with the shadows in one class", () => {
    const stroke = { type: "SOLID", color: { r: 1, g: 0, b: 0 }, opacity: 1 };
    const shadow = { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0 };
    const one = (extra) => convertDesign({ type: "FRAME", name: "F", width: 50, height: 50, fills: [], children: [rect("r", 0, 0, 20, 20, { strokes: [stroke], strokeWeight: 4, effects: [shadow], ...extra })] }).body;
    const outside = one({ strokeAlign: "OUTSIDE" });
    assert.equal((outside.match(/shadow-\[/g) || []).length, 1, outside);
    assert.match(outside, /shadow-\[0_0_0_4px_#ff0000,0px_4px_8px_0px_/);
    const centred = one({ strokeAlign: "CENTER" });
    assert.match(centred, /shadow-\[0_0_0_2px_#ff0000,inset_0_0_0_2px_#ff0000,0px_4px/);
    assert.ok(!/\bborder\b/.test(classesOf(centred)[1]), "a centred stroke is not an inside border");
    assert.ok(/\bborder-4\b|border-\[4px\]/.test(classesOf(one({ strokeAlign: "INSIDE" }))[1]), "an inside stroke stays a border");
});

test("blend modes: a layer's own, and between a shape's fills", () => {
    const r = convertDesign({ type: "FRAME", name: "F", width: 50, height: 50, fills: [], children: [
        rect("m", 0, 0, 20, 20, { blendMode: "MULTIPLY" }),
        rect("two", 0, 0, 20, 20, { fills: [solid(255, 0, 0, 0.2), solid(0, 0, 255)].map((p, i) => (i === 0 ? { ...p, blendMode: "OVERLAY" } : p)) }),
    ] });
    assert.match(r.body, /mix-blend-multiply/);
    assert.match(r.body, /\[background-blend-mode:normal,overlay\]/);
});

test("an angular gradient is a conic gradient, a diamond one the first colour", () => {
    const stops = [{ position: 0, color: { r: 1, g: 0, b: 0, a: 1 } }, { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }];
    const paint = (type) => ({ type, gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: stops, opacity: 1 });
    const body = (type) => convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, fills: [], children: [rect("g", 0, 0, 100, 100, { fills: [paint(type)] })] });
    assert.match(body("GRADIENT_ANGULAR").body, /bg-\[conic-gradient\(from_\d+(\.\d+)?deg_at_50px_50px,/);
    assert.ok(body("GRADIENT_DIAMOND").warnings.some((w) => /diamond/.test(w)));
});

test("text: a link, vertical centring in a fixed box, and cut-off lines", () => {
    const text = (extra) => ({ type: "TEXT", name: "t", width: 100, height: 60, transform: at(0, 0), characters: "Hello world", fontSize: 14, fontName: { family: "Inter", style: "Regular" }, fills: [solid(0, 0, 0)], textAutoResize: "NONE", ...extra });
    const page = (t) => convertDesign({ type: "FRAME", name: "F", width: 200, height: 200, fills: [], children: [t] });
    const centred = page(text({ textAlignVertical: "CENTER" })).body;
    assert.match(classesOf(centred)[1], /\bflex\b.*\bflex-col\b.*\bjustify-center\b|\bjustify-center\b/);
    assert.match(centred, /<span>Hello world<\/span>/);
    assert.ok(!/justify-center/.test(page(text({ textAlignVertical: "TOP" })).body));
    assert.ok(!/justify-center/.test(page(text({ textAlignVertical: "CENTER", textAutoResize: "HEIGHT" })).body), "a box that fits its text needs no centring");
    assert.match(page(text({ textTruncation: "ENDING", maxLines: 2 })).body, /line-clamp-2/);
    assert.match(page(text({ textTruncation: "ENDING", height: 40 })).body, /line-clamp-2/); // 40px of 14px (16.8px lines) = 2 lines
    const link = page(text({ segments: [{ characters: "Hello ", fontName: { family: "Inter", style: "Regular" }, fontSize: 14, fills: [solid(0, 0, 0)] }, { characters: "world", fontName: { family: "Inter", style: "Regular" }, fontSize: 14, fills: [solid(0, 0, 0)], hyperlink: { type: "URL", value: "https://example.com/a?b=1&c=2" } }] })).body;
    assert.match(link, /<a href="https:\/\/example.com\/a\?b=1&amp;c=2" target="_blank" rel="noopener"><span[^>]*>world<\/span><\/a>/);
    const unsafe = page(text({ segments: [{ characters: "x", fontName: { family: "Inter", style: "Regular" }, fontSize: 14, fills: [solid(0, 0, 0)], hyperlink: { type: "URL", value: "javascript:alert(1)" } }] })).body;
    assert.ok(!unsafe.includes("<a "), unsafe);
});

test("a mirrored layer is mirrored, not turned upside down; a mirrored and turned one is both", () => {
    const flipX = convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, fills: [], children: [rect("m", 0, 0, 20, 10, { transform: [[-1, 0, 50], [0, 1, 30]] })] }).body;
    assert.match(flipX, /scale-x-\[-1\]/);
    assert.ok(!/rotate-/.test(flipX), flipX); // x = 50 - 20 = 30 is its left edge: it sits at left 30, not turned
    assert.match(flipX, /left-\[30px\]|left-7\.5/);
    const flipY = convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, fills: [], children: [rect("m", 0, 0, 20, 10, { transform: [[1, 0, 10], [0, -1, 40]] })] }).body;
    assert.match(flipY, /rotate-\[180deg\]/); // a vertical mirror is a half turn and a horizontal mirror
    assert.match(flipY, /scale-x-\[-1\]/);
    assert.match(flipY, /top-\[30px\]|top-7\.5/);
});

test("min and max sizes become classes", () => {
    const r = convertDesign({ type: "FRAME", name: "F", width: 300, height: 100, fills: [], children: [{ type: "FRAME", name: "Card", width: 100, height: 50, transform: at(0, 0), fills: [], minWidth: 80, maxWidth: 240, minHeight: null, maxHeight: 400 }] });
    assert.match(r.body, /min-w-20\b/); // 80px is the 20 step, which the Properties panel reads as a size
    assert.match(r.body, /max-w-60\b/);
    assert.match(r.body, /max-h-\[400px\]/);
    assert.ok(!/min-h-/.test(r.body));
});

test("layers named like buttons, links, nav bars and footers become those elements", () => {
    const text = (s) => ({ type: "TEXT", name: "t", characters: s, width: 40, height: 16, transform: at(0, 0), fontSize: 14, fontName: { family: "Inter", style: "Regular" }, fills: [solid(0, 0, 0)], textAutoResize: "WIDTH_AND_HEIGHT" });
    const box = (name, w, kids = [text("Go")]) => ({ type: "FRAME", name, width: w, height: 40, transform: at(0, 0), fills: [], children: kids });
    const r = convertDesign({ type: "FRAME", name: "Page", width: 1000, height: 600, fills: [], children: [box("Button / Primary", 120), box("nav link", 80), box("Navbar", 900), box("Footer", 900), box("Header label", 100), box("Top Header", 900), box("Card", 100)] }).body;
    assert.match(r, /<button type="button" class=/);
    assert.match(r, /<a href="#" class=/);
    assert.match(r, /<nav class=/);
    assert.match(r, /<footer class=/);
    assert.match(r, /<header class=/); // "Top Header" spans the page...
    assert.equal((r.match(/<header /g) || []).length, 1); // ...but the small "Header label" stays a div
    assert.match(r, /<\/button>/);
    assert.match(r, /^<div /); // the page itself is a div
});

test("the biggest type of real words is the h1, the next sizes h2 and h3; numbers and body text stay paragraphs", () => {
    const text = (s, size, y) => ({ type: "TEXT", name: "t", characters: s, width: 300, height: size, transform: at(0, y), fontSize: size, fontName: { family: "Inter", style: "Regular" }, fills: [solid(0, 0, 0)], textAutoResize: "WIDTH_AND_HEIGHT" });
    const body = "Some body text that goes on for a while so that it is the most common size on the page.";
    const r = convertDesign({ type: "FRAME", name: "P", width: 800, height: 600, fills: [], children: [
        text("Be prepared for the mountains", 64, 0), text("01", 120, 80), text("Pick the right gear", 40, 200), text("Another section title", 40, 260),
        text("Small print", 12, 320), text(body, 16, 340), text(body, 16, 380), text(body, 16, 420),
    ] }).body;
    assert.match(r, /<h1 [^>]*>Be prepared for the mountains<\/h1>/);
    assert.match(r, /<h2 [^>]*>Pick the right gear<\/h2>/);
    assert.match(r, /<h2 [^>]*>Another section title<\/h2>/);
    assert.match(r, /<p [^>]*>01<\/p>/); // a number is not a heading, however big
    assert.match(r, /<p [^>]*>Small print<\/p>/);
    assert.equal((r.match(/<h1 /g) || []).length, 1);
});

test("a picture's alt text is its layer name, unless that says nothing", () => {
    const pic = (name) => ({ type: "RECTANGLE", name, width: 20, height: 20, png: "data:image/png;base64,AA", box: { x: 0, y: 0, width: 20, height: 20 } });
    const alts = convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, fills: [], children: ["Hero mountain photo", "Rectangle 12", "HG", "Image"].map(pic) }).body.match(/alt="[^"]*"/g);
    assert.deepEqual(alts, ['alt="Hero mountain photo"', 'alt=""', 'alt=""', 'alt=""']);
});

test("text: a drop shadow follows the letters, and underlines keep their style", () => {
    const shadow = { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 1, y: 2 }, radius: 4 };
    const text = (extra) => ({ type: "TEXT", name: "t", characters: "Hello", width: 60, height: 20, transform: at(0, 0), fontSize: 14, fontName: { family: "Inter", style: "Regular" }, fills: [solid(0, 0, 0)], textAutoResize: "WIDTH_AND_HEIGHT", ...extra });
    const page = (t) => convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, fills: [], children: [t] });
    const shadowed = page(text({ effects: [shadow] }));
    assert.match(shadowed.body, /\[text-shadow:1px_2px_4px_/);
    assert.ok(!/shadow-\[/.test(shadowed.body.replace(/\[text-shadow:[^\]]*\]/, "")), shadowed.body); // no box shadow around the text's box
    const wavy = page(text({ textDecoration: "UNDERLINE", textDecorationStyle: "WAVY", textDecorationOffset: { value: 3, unit: "PIXELS" }, textDecorationThickness: { value: 10, unit: "PERCENT" }, textDecorationSkipInk: false })).body;
    for (const c of ["underline", "decoration-wavy", "underline-offset-[3px]", "decoration-[0.1em]", "[text-decoration-skip-ink:none]"]) assert.ok(wavy.includes(c), `${c} in ${wavy}`);
});

test("text: indent and space between paragraphs", () => {
    const text = (extra) => ({ type: "TEXT", name: "t", characters: "One\nTwo\n\nFour", width: 100, height: 100, transform: at(0, 0), fontSize: 14, fontName: { family: "Inter", style: "Regular" }, fills: [solid(0, 0, 0)], textAutoResize: "HEIGHT", ...extra });
    const page = (t) => convertDesign({ type: "FRAME", name: "F", width: 200, height: 200, fills: [], children: [t] }).body;
    assert.match(page(text({ paragraphIndent: 12 })), /indent-\[12px\]/);
    assert.match(page(text({})), /One<br>Two<br><br>Four/); // no spacing set: a new paragraph is a line break, as before
    const spaced = page(text({ paragraphSpacing: 8 }));
    assert.equal((spaced.match(/<span class="block mb-2 last:mb-0">/g) || []).length, 4, spaced); // One, Two, (empty), Four
    assert.match(spaced, /<span class="block mb-2 last:mb-0"><br><\/span>/); // an empty paragraph keeps its height
});

test("a one-colour icon uses currentColor and takes its colour from a text-colour class; others are left alone", () => {
    const icon = (svg) => convertDesign({ type: "FRAME", name: "F", width: 100, height: 100, fills: [], children: [{ type: "VECTOR", name: "Icon", width: 24, height: 24, box: { x: 10, y: 10, width: 24, height: 24 }, svg }] }).body;
    const one = icon('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1h10" stroke="#1A2B3C" stroke-width="2"/><path d="M2 2l5 5" fill="#1a2b3c"/></svg>');
    assert.match(one, /stroke="currentColor"/);
    assert.match(one, /fill="currentColor"/);
    assert.match(one, /fill="none"/); // none stays none
    assert.ok(!one.includes("#1A2B3C") && !one.includes("#1a2b3c") || /text-\[#1a2b3c\]/.test(one));
    assert.match(one, /class="[^"]*text-\[#1a2b3c\]/);
    const white = icon('<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="white"/></svg>');
    assert.match(white, /fill="currentColor"/);
    assert.match(white, /text-\[#ffffff\]/);
    for (const svg of [
        '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0" fill="#ff0000"/><path d="M1 1" fill="#00ff00"/></svg>', // two colours
        '<svg width="24" height="24" viewBox="0 0 24 24"><defs><linearGradient id="g"><stop stop-color="#f00"/></linearGradient></defs><path d="M0 0" fill="url(#g)"/></svg>', // a gradient
        '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0" fill="#ff0000" style="fill:#00ff00"/></svg>', // inline style
    ]) { const out = icon(svg); assert.ok(!out.includes("currentColor") && !/text-\[#/.test(out), out); }
});

test("the data rules: bundled ones give the usual result; sent ones change it; bad ones are ignored", async () => {
    const { compileRules, DEFAULT_RULES } = await import("../src/rules.js");
    const text = (family) => ({ type: "TEXT", name: "t", characters: "Hi", width: 20, height: 16, transform: at(0, 0), fontSize: 14, fontName: { family, style: "Regular" }, fills: [solid(0, 0, 0)], textAutoResize: "WIDTH_AND_HEIGHT" });
    const page = (children, rules) => convertDesign({ type: "FRAME", name: "F", width: 1000, height: 300, fills: [], children }, { rules });
    assert.match(page([text("Gilroy")]).body, /font-\['Gilroy','Montserrat',sans-serif\]/);
    assert.equal(page([text("Gilroy")]).rulesVersion, DEFAULT_RULES.version);
    // a new font entry and a new word, sent as data
    const sent = { version: "x.1", fontSubstitutes: [["^acme", "Lora"]], words: { button: "knopf" } };
    const r = page([text("Acme Sans"), { type: "FRAME", name: "Knopf 1", width: 80, height: 30, transform: at(0, 40), fills: [], children: [text("Go")] }], sent);
    assert.match(r.body, /font-\['Acme_Sans','Lora',/);
    assert.match(r.body, /<button type="button"/);
    assert.equal(r.rulesVersion, "x.1");
    assert.ok(!/Montserrat/.test(page([text("Gilroy")], sent).body), "a list that was sent replaces the bundled one");
    // bad data: a broken pattern, a too-long one, the wrong shape: the bundled values are used
    const bad = compileRules({ fontSubstitutes: [["(", "X"], ["a".repeat(500), "Y"], "no"], words: { button: "(", nav: 5 } });
    assert.ok(bad.words.button.test("Button 1") && bad.words.nav.test("Navbar"));
    assert.equal(bad.fontSubstitutes.length, DEFAULT_RULES.fontSubstitutes.length);
    assert.equal(compileRules(null).fontSubstitutes.length, DEFAULT_RULES.fontSubstitutes.length);
});

test("an instance of a button component is a button even when it was renamed", () => {
    const text = { type: "TEXT", name: "t", characters: "Go", width: 20, height: 16, transform: at(0, 0), fontSize: 14, fontName: { family: "Inter", style: "Regular" }, fills: [solid(0, 0, 0)], textAutoResize: "WIDTH_AND_HEIGHT" };
    const inst = (name, component) => ({ type: "INSTANCE", name, width: 80, height: 30, transform: at(0, 0), fills: [], children: [text], ...(component ? { meta: { names: { component } } } : {}) });
    const r = convertDesign({ type: "FRAME", name: "F", width: 400, height: 100, fills: [], children: [inst("Frame 12", { name: "Primary", set: "Button" }), inst("Frame 13", { name: "Card" }), inst("Frame 14")] }).body;
    assert.equal((r.match(/<button /g) || []).length, 1);
    assert.match(r, /<button type="button"[^>]*>/);
});
