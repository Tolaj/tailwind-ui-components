import test from "node:test";
import assert from "node:assert/strict";
import Font from "../src/models/font.model.js";
import { formatOf, withFonts } from "../src/services/fonts.service.js";

const bytes = (tag) => Buffer.concat([Buffer.from(tag, "latin1"), Buffer.alloc(16)]);

test("a font is recognised by its first bytes, not its name", () => {
    assert.equal(formatOf(bytes("wOF2")), "woff2");
    assert.equal(formatOf(bytes("wOFF")), "woff");
    assert.equal(formatOf(bytes("OTTO")), "opentype");
    assert.equal(formatOf(bytes("\u0000\u0001\u0000\u0000")), "truetype");
    assert.equal(formatOf(Buffer.from("<html>not a font at all</html>")), null);
});

test("a design gets an @font-face for the uploaded fonts it uses, once", async () => {
    const rows = [{ _id: "a1", family: "Gilroy", weight: 400, style: "normal", format: "woff2" }];
    Font.find = (q) => ({ select: () => ({ lean: async () => rows.filter((r) => q.family.$in.includes(r.family)) }) });
    const html = `<html><head></head><body><p class="font-['Gilroy','Montserrat',sans-serif]">Hi</p></body></html>`;
    const once = await withFonts(html, "https://w.example");
    assert.match(once, /@font-face\{font-family:'Gilroy';font-weight:400;font-style:normal;font-display:swap;src:url\(https:\/\/w\.example\/fonts\/a1\) format\('woff2'\)\}/);
    assert.ok(!(await withFonts("<head></head><p class=\"font-['Nope',serif]\">", "https://w.example")).includes("@font-face"), "a family the library lacks adds nothing");
    const twice = await withFonts(once, "https://w.example");
    assert.equal(twice.match(/windcraft-fonts/g).length, 1, "sending again replaces the style");
});
