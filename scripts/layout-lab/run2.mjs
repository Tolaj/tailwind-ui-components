// Layout lab: does rules-only layout inference (packages/core/layout-infer.js) recover how real designs were laid out?
// Steps (from the repo root, with the editor not needed):
//   1. node --env-file=.env scripts/layout-lab/export.mjs <dir>      read-only copy of the gallery components' HTML
//   2. node scripts/layout-lab/extract.mjs <dir> <out.json>          render at 1280 (needs playwright-core and Chrome, CHROME=...) and record each container
//   3. node scripts/layout-lab/run.mjs <out.json>                    clean geometry and noise on every child
//   4. node scripts/layout-lab/run2.mjs <out.json>                   one child dropped off its place: does the best layout put it back?
import fs from "node:fs";
import { fitLayouts, layoutRects } from "../../packages/core/layout-infer.js";
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
let s = 7; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const strip = (r) => ({ x: r.x, y: r.y, w: r.w, h: r.h });
const pct = (a, n) => (n ? (100 * a / n).toFixed(1) + "%" : "-");
const reproduces = (c, box, rects, tol = 1.5) => layoutRects(c, box, rects.map((r) => ({ w: r.w, h: r.h }))).every((p, i) => Math.abs(p.x - rects[i].x) <= tol && Math.abs(p.y - rects[i].y) <= tol);
// 1. the candidate family on clean data: does it contain a layout that reproduces what is there?
const t0 = Date.now();
const clean = data.map((c) => { const rects = c.rects.map(strip), list = fitLayouts(c.box, rects, { tol: 1.5, drag: 0 }); return { c, rects, ok: list.length > 0, list }; });
console.log(`family covers clean containers: ${pct(clean.filter((x) => x.ok).length, data.length)}   (${Date.now() - t0} ms for ${data.length})`);
const base = clean.filter((x) => x.ok && x.c.rects.length >= 3);
console.log(`containers with 3+ children that are cleanly explained: ${base.length}\n`);
// 2. one child dropped a little off its place: does the best layout put it back?
const rows = [];
for (const sg of [2, 4, 8, 16, 32]) {
  let n = 0, found = 0, back = 0, top3 = 0, tie = 0, wrongChild = 0;
  for (const { c, rects } of base) {
    const i = Math.floor(rand() * rects.length);
    const moved = rects.map((r, k) => (k === i ? { ...r, x: r.x + (rand() * 2 - 1) * sg, y: r.y + (rand() * 2 - 1) * sg } : r));
    const dx = Math.hypot(moved[i].x - rects[i].x, moved[i].y - rects[i].y);
    if (dx < 1.6) continue; // it did not really move
    n++;
    const list = fitLayouts(c.box, moved, { tol: 1.5, drag: 60 });
    if (list.length) found++;
    const bk = (x) => { const pred = layoutRects(x, c.box, rects.map((r) => ({ w: r.w, h: r.h }))); return pred.every((p, k) => Math.abs(p.x - rects[k].x) <= 1.5 && Math.abs(p.y - rects[k].y) <= 1.5); };
    if (list[0] && bk(list[0])) back++;
    if (list.slice(0, 3).some(bk)) top3++;
    if (list[0]) { const same = list.filter((x) => x.outlier === list[0].outlier && x.cost === list[0].cost); const sig = new Set(same.map((x) => JSON.stringify(layoutRects(x, c.box, rects.map((r) => ({ w: r.w, h: r.h })))))); if (sig.size > 1) tie++; if (list[0].outlier !== null && list[0].outlier !== i) wrongChild++; }
  }
  rows.push({ "drop within px": sg, drops: n, "explained": pct(found, n), "top1 snaps back": pct(back, n), "in top3": pct(top3, n), "tie between layouts": pct(tie, n), "wrong child blamed": pct(wrongChild, n) });
}
console.table(rows);
console.log(`total ${(Date.now() - t0) / 1000}s`);
