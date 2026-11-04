// Needs `npm i --no-save playwright-core`, Chrome (CHROME=/path/to/chrome) and the editor demo running (`npm run demo`, port 4000).
// Usage: node scripts/fuzz-drag.mjs [iterations] [seed]
// Random flex rows and columns; one element is dragged onto the before/after half of another on a random device. Invariants:
//  1. the order is what was asked for, on every device
//  2. nothing was written but the move: no margins, offsets or sizes on any element (an alignment, self-*, only when a guide said so)
//  3. every element keeps its size, on every device
import { chromium } from "playwright-core";
const N = +(process.argv[2] || 8), SEED = +(process.argv[3] || 1);
let s = SEED; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); const pick = (a) => a[Math.floor(rand() * a.length)];
const ORDER = ["Mobile", "Tablet", "Desktop"];
const b = await chromium.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:4000/editor/demo/?theme"); await p.waitForTimeout(2500);
await p.click("#panelBtn"); await p.waitForTimeout(500);
const fr = () => p.frames().find((f) => f !== p.mainFrame());
const setCode = async (html) => { await p.click("#codeBtn"); await p.waitForTimeout(300); await p.click("#codeMount .cm-content"); await p.keyboard.press("Meta+a"); await p.evaluate((h) => navigator.clipboard.writeText(h), html); await p.keyboard.press("Meta+v"); await p.waitForTimeout(700); await p.click("#codeClose"); await p.waitForTimeout(300); };
const device = async (name) => { await p.mouse.click(1000, 960).catch(() => {}); await p.waitForTimeout(150); await p.locator("#inspector button", { hasText: new RegExp("^" + name + "$") }).first().click(); await p.waitForTimeout(800); };
const snap = () => fr().evaluate(() => { const par = document.querySelector("[data-p]"); const kids = [...par.children]; return { w: innerWidth, rects: kids.map((k) => { const b = k.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }), ids: kids.map((k) => k.dataset.k), cls: kids.map((k) => k.className), style: kids.map((k) => k.getAttribute("style")) }; });
const fails = []; let ran = 0, skipped = 0;
for (let it = 0; it < N; it++) {
  const dir = pick(["flex-row", "flex-col"]), nk = 3 + Math.floor(rand() * 3), gap = pick(["gap-2", "gap-4", "gap-6"]);
  const kids = Array.from({ length: nk }, (_, i) => `<div data-k="${i}" class="h-${pick([16, 20, 24])} w-${pick([24, 32, 40])} bg-${pick(["rose", "sky", "amber", "emerald"])}-200">${"ABCDE"[i]}</div>`).join("");
  await setCode(`<div class="p-6"><div data-p class="flex ${dir} ${gap} h-[420px] p-4 bg-gray-50">${kids}</div></div>`);
  const dragDev = pick(ORDER);
  const before = {}; for (const d of ORDER) { await device(d); before[d] = await snap(); }
  await device(dragDev);
  const f = await p.locator("#frame").boundingBox(), W = before[dragDev].w, sc = f.width / W, R = before[dragDev].rects;
  const d = Math.floor(rand() * nk); let t = Math.floor(rand() * nk); if (t === d) t = (t + 1) % nk;
  const half = pick(["before", "after"]);
  const order = before[dragDev].ids.filter((x, i) => i !== d); const ti = order.indexOf(String(t)); order.splice(half === "before" ? ti : ti + 1, 0, String(d));
  const want = order.join(",");
  if (want === before[dragDev].ids.join(",")) { skipped++; continue; }
  const row = dir === "flex-row";
  const sx = f.x + (R[d][0] + R[d][2] / 2) * sc, sy = f.y + (R[d][1] + R[d][3] / 2) * sc;
  const tx = f.x + (R[t][0] + R[t][2] * (row ? (half === "before" ? 0.25 : 0.75) : 0.5)) * sc, ty = f.y + (R[t][1] + R[t][3] * (row ? 0.5 : (half === "before" ? 0.25 : 0.75))) * sc;
  await p.mouse.click(sx, sy); await p.waitForTimeout(1300);
  await p.mouse.move(sx, sy); await p.mouse.down();
  for (let i = 1; i <= 24; i++) { await p.mouse.move(sx + (tx - sx) * i / 24, sy + (ty - sy) * i / 24); await p.waitForTimeout(35); }
  await p.waitForTimeout(250); await p.mouse.up(); await p.waitForTimeout(1100);
  const after = {}; after[dragDev] = await snap();
  for (const dv of ORDER) if (dv !== dragDev) { await device(dv); after[dv] = await snap(); }
  const tag = `#${it} ${dir} ${nk}kids ${dragDev} move ${"ABCDE"[d]} ${half} ${"ABCDE"[t]}`;
  ran++;
  const bad = [];
  for (const dv of ORDER) {
    const B = before[dv], A = after[dv];
    if (A.ids.join(",") !== want) bad.push(`${dv}: order ${A.ids.join(",")} but wanted ${want}`);
    B.ids.forEach((id, i) => { const j = A.ids.indexOf(id); if (Math.abs(B.rects[i][2] - A.rects[j][2]) > 0.6 || Math.abs(B.rects[i][3] - A.rects[j][3]) > 0.6) bad.push(`${dv}: ${"ABCDE"[id]} changed size`); });
    A.cls.forEach((c, j) => { const old = B.cls[B.ids.indexOf(A.ids[j])]; if (c !== old && !(c.startsWith(old) && /^\s(md:|lg:)?self-\S+$/.test(c.slice(old.length)))) bad.push(`${dv}: ${"ABCDE"[A.ids[j]]} classes changed: "${old}" -> "${c}"`); if (A.style[j]) bad.push(`${dv}: ${"ABCDE"[A.ids[j]]} has inline style "${A.style[j]}"`); });
  }
  console.log(bad.length ? "FAIL" : "ok  ", tag);
  if (bad.length) { [...new Set(bad)].forEach((m) => console.log("      ", m)); fails.push(tag); }
}
console.log(`\nran ${ran}, skipped ${skipped}, failed ${fails.length}; page errors: ${errs.length ? errs.join("; ") : "none"}`);
await b.close();
process.exit(fails.length ? 1 : 0);
