// Layout lab: does rules-only layout inference (packages/core/layout-infer.js) recover how real designs were laid out?
// Steps (from the repo root, with the editor not needed):
//   1. node --env-file=.env scripts/layout-lab/export.mjs <dir>      read-only copy of the gallery components' HTML
//   2. node scripts/layout-lab/extract.mjs <dir> <out.json>          render at 1280 (needs playwright-core and Chrome, CHROME=...) and record each container
//   3. node scripts/layout-lab/run.mjs <out.json>                    clean geometry and noise on every child
//   4. node scripts/layout-lab/run2.mjs <out.json>                   one child dropped off its place: does the best layout put it back?
import { chromium } from "playwright-core";
import fs from "node:fs";
const dir = process.argv[2], files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
const b = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const out = [];
for (const f of files) {
  const id = f.replace(".html", ""), meta = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, "utf8")), html = fs.readFileSync(`${dir}/${f}`, "utf8");
  const p = await ctx.newPage();
  try {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script></head><body>${html}</body></html>`, { waitUntil: "networkidle", timeout: 20000 });
    await p.waitForTimeout(900);
    const found = await p.evaluate(() => {
      const res = [], num = (v) => parseFloat(v) || 0;
      for (const el of document.body.querySelectorAll("*")) {
        if (["SCRIPT", "STYLE", "SVG", "PATH", "svg"].includes(el.tagName) || el.closest("svg")) continue;
        const cs = getComputedStyle(el);
        if (!/^(flex|grid|block)$/.test(cs.display) || cs.display === "none") continue;
        const kids = [...el.children].filter((k) => { const c = getComputedStyle(k); return !/^(none|contents)$/.test(c.display) && !/^(absolute|fixed)$/.test(c.position) && k.getBoundingClientRect().width > 0 && k.getBoundingClientRect().height > 0 && !["SCRIPT", "STYLE"].includes(k.tagName); });
        if (kids.length < 2 || kids.length > 14) continue;
        // block containers: only when every child is a block-level box (a stack); inline text flows are not layouts
        if (cs.display === "block" && !kids.every((k) => /^(block|flex|grid|list-item|table)$/.test(getComputedStyle(k).display))) continue;
        const r = el.getBoundingClientRect(), bx = num(cs.borderLeftWidth) + num(cs.paddingLeft), by = num(cs.borderTopWidth) + num(cs.paddingTop);
        const box = { x: r.x + bx, y: r.y + by, w: r.width - bx - num(cs.borderRightWidth) - num(cs.paddingRight), h: r.height - by - num(cs.borderBottomWidth) - num(cs.paddingBottom) };
        res.push({
          tag: el.tagName.toLowerCase(), cls: (el.getAttribute("class") || "").slice(0, 120), box,
          rects: kids.map((k) => { const q = k.getBoundingClientRect(), c = getComputedStyle(k); return { x: q.x, y: q.y, w: q.width, h: q.height, ml: num(c.marginLeft), mr: num(c.marginRight), mt: num(c.marginTop), mb: num(c.marginBottom) }; }),
          truth: { display: cs.display, dir: cs.flexDirection, wrap: cs.flexWrap, gapX: num(cs.columnGap), gapY: num(cs.rowGap), justify: cs.justifyContent, items: cs.alignItems, cols: cs.display === "grid" ? cs.gridTemplateColumns.split(" ").length : 0 },
        });
      }
      return res;
    });
    found.forEach((c) => out.push({ comp: id, title: meta.title, category: meta.category, ...c }));
  } catch (e) { console.log("skip", id, e.message.slice(0, 60)); }
  await p.close();
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
const kinds = {}; out.forEach((c) => { const k = c.truth.display === "flex" ? "flex-" + (c.truth.dir.startsWith("row") ? "row" : "col") : c.truth.display; kinds[k] = (kinds[k] || 0) + 1; });
console.log("components:", files.length, "| containers:", out.length, "| by kind:", JSON.stringify(kinds));
await b.close();
