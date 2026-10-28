import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, normalizeTheme, brandScale, grayScale, radiusScale, tailwindConfig, themeHead, fontUrl } from "../theme.js";

test("normalizeTheme keeps valid choices and replaces anything else with the default", () => {
    assert.deepEqual(normalizeTheme({ brand: "#E11D48", gray: "zinc", font: "Poppins", radius: "xl" }), { brand: "#e11d48", gray: "zinc", font: "Poppins", radius: "xl" });
    assert.deepEqual(normalizeTheme(null), DEFAULT_THEME);
    assert.deepEqual(normalizeTheme({ brand: "red", gray: "hot", font: "a;b<script>", radius: "huge" }), DEFAULT_THEME);
    assert.equal(normalizeTheme({ brand: "ff0000" }).brand, "#ff0000");
    assert.equal(normalizeTheme({ font: "System" }).font, "System");
});

test("brandScale: the colour is 600, lighter steps get lighter, darker steps darker", () => {
    const s = brandScale("#4f46e5");
    assert.equal(s["600"], "#4f46e5");
    assert.deepEqual(Object.keys(s), ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]);
    const lum = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    const order = Object.values(s).map(lum);
    assert.deepEqual([...order].sort((a, b) => b - a), order); // 50 is the lightest, 950 the darkest
});

test("gray palettes and radius scales", () => {
    assert.equal(grayScale("slate")["900"], "#0f172a");
    assert.equal(grayScale("nope")["500"], grayScale("slate")["500"]);
    assert.equal(radiusScale("none").md, "0px");
    assert.equal(radiusScale("md").md, "6px");
    assert.equal(radiusScale("xl").lg, "24px");
});

test("tailwindConfig and themeHead", () => {
    const c = tailwindConfig({ brand: "#0ea5e9", font: "System" });
    assert.equal(c.darkMode, "class");
    assert.equal(c.theme.extend.colors.brand["600"], "#0ea5e9");
    assert.ok(c.theme.extend.fontFamily.sans.includes("system-ui"));
    assert.equal(fontUrl({ font: "System" }), null);
    assert.equal(fontUrl({ font: "Open Sans" }), "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap");
    const head = themeHead({ font: "Inter" });
    assert.match(head, /fonts\.googleapis\.com/);
    assert.match(head, /tailwind\.config = \{/);
    assert.ok(!themeHead({ font: "System" }).includes("<link"));
});
