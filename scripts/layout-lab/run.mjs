// Layout lab: does rules-only layout inference (packages/core/layout-infer.js) recover how real designs were laid out?
// Steps (from the repo root, with the editor not needed):
//   1. node --env-file=.env scripts/layout-lab/export.mjs <dir>      read-only copy of the gallery components' HTML
//   2. node scripts/layout-lab/extract.mjs <dir> <out.json>          render at 1280 (needs playwright-core and Chrome, CHROME=...) and record each container
//   3. node scripts/layout-lab/run.mjs <out.json>                    clean geometry and noise on every child
//   4. node scripts/layout-lab/run2.mjs <out.json>                   one child dropped off its place: does the best layout put it back?
import fs from "node:fs";
import { inferLayouts, bestLayout } from "../../packages/core/layout-infer.js";
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
let s = 42; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const truthKind = (c) => (c.truth.display === "flex" ? (c.truth.dir.startsWith("row") ? "row" : "col") : c.truth.display === "grid" ? (c.truth.cols > 1 ? "grid" : "col") : "col");
const tg = (c) => (truthKind(c) === "row" ? c.truth.gapX : truthKind(c) === "col" ? c.truth.gapY : c.truth.gapX);
const J = { normal: "start", "flex-start": "start", start: "start", center: "center", "flex-end": "end", end: "end", "space-between": "between", "space-around": "around", "space-evenly": "evenly" };
const strip = (r) => ({ x: r.x, y: r.y, w: r.w, h: r.h });
const noisy = (rects, sg) => rects.map((r) => ({ ...strip(r), x: r.x + (rand() * 2 - 1) * sg, y: r.y + (rand() * 2 - 1) * sg }));
const sig = (b) => b && `${b.kind}|${b.justify}|${b.items}|${Math.round(b.gap ?? 0)}|${b.cols ?? ""}|${b.push ?? ""}`;
const pct = (a, n) => (n ? (100 * a / n).toFixed(1) + "%" : "-");
console.log(`containers: ${data.length}  (flex-row ${data.filter((c) => truthKind(c) === "row").length}, flex-col/stack ${data.filter((c) => truthKind(c) === "col").length}, grid ${data.filter((c) => truthKind(c) === "grid").length})\n`);
const rows = [];
for (const tol of [1.5, 6]) for (const sg of [0, 2, 4, 6, 10]) {
  let cov = 0, top1 = 0, recall = 0, amb = 0, gapOk = 0, gapN = 0, stable = 0, stableN = 0;
  for (const c of data) {
    const cleanBest = bestLayout(c.box, c.rects.map(strip), tol);
    const rects = sg ? noisy(c.rects, sg) : c.rects.map(strip);
    const list = inferLayouts(c.box, rects, tol), r = bestLayout(c.box, rects, tol);
    if (list.length) cov++;
    if (r && r.best.kind === truthKind(c)) top1++;
    if (list.some((x) => x.kind === truthKind(c))) recall++;
    if (r && r.ambiguous.length) amb++;
    if (r && r.best.kind === truthKind(c) && c.truth.display !== "block" && truthKind(c) !== "grid") { gapN++; const t = tg(c); if (r.best.gap !== undefined && Math.abs(r.best.gap - t) <= 1.5 || (J[c.truth.justify] && ["between", "around", "evenly"].includes(r.best.justify))) gapOk++; }
    if (cleanBest) { stableN++; if (sig(cleanBest.best) === sig(r && r.best)) stable++; }
  }
  rows.push({ tol, sg, cov: pct(cov, data.length), top1: pct(top1, data.length), recall: pct(recall, data.length), amb: pct(amb, cov), gap: pct(gapOk, gapN), stable: pct(stable, stableN) });
}
console.table(rows);
// who is NOT explained at tol 1.5 with no noise: why
const miss = data.filter((c) => !inferLayouts(c.box, c.rects.map(strip), 1.5).length);
const why = {};
miss.forEach((c) => {
  const R = c.rects, k = truthKind(c);
  const m = R.some((r) => r.ml || r.mr || r.mt || r.mb) ? "has margins" : "no margins";
  const w = c.truth.wrap !== "nowrap" && c.truth.display === "flex" ? "wraps" : "";
  const tag = [c.truth.display + (c.truth.display === "flex" ? "-" + (c.truth.dir.startsWith("row") ? "row" : "col") : ""), m, w, `justify:${c.truth.justify}`].filter(Boolean).join(" · ");
  why[tag] = (why[tag] || 0) + 1;
});
console.log(`not explained by any clean layout (clean data, tol 1.5): ${miss.length} of ${data.length}`);
Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(String(v).padStart(4), k));
