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

test("hidden nodes and masks are left out, with a warning for the mask", () => {
    const frame = { type: "FRAME", name: "H", width: 10, height: 10, children: [{ type: "RECTANGLE", name: "Hidden", visible: false, width: 1, height: 1 }, { type: "RECTANGLE", name: "Mask", isMask: true, width: 1, height: 1 }] };
    const r = convertDesign(frame);
    assert.equal(classesOf(r.body).length, 1);
    assert.ok(r.warnings.some((w) => /Mask: a mask/.test(w)));
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
    const { body, html } = convertDesign(frame);
    assert.ok(body.includes("font-['Chronicle_Display',serif]"), body);
    assert.ok(body.includes("font-['Gilroy',sans-serif]"));
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
