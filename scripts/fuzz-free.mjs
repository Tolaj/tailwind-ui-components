// Needs `npm i --no-save playwright-core`, Chrome (CHROME=/path/to/chrome) and the editor demo running (`npm run demo`, port 4000).
// Usage: node scripts/fuzz-free.mjs [iterations] [seed] [exact]
// Fuzz: random flex layouts, a free drag (empty space in the box) on a random device with a random scope. Invariants:
//  1. nothing but the dragged element moves, at any width (siblings and parent rects identical before/after)
//  2. at the edited device the element is where the pointer put it (within the 4px token step)
//  3. every other device shows the edit exactly as the scope promises (device: itself and wider; only: itself; all: every one)
import { chromium } from "playwright-core";
const N = +(process.argv[2] || 8), SEED = +(process.argv[3] || 1), EXACT = process.argv[4] === "exact"; // exact: Cmd held, no smart guides, so the element lands where the pointer put it
const TOL = EXACT ? 2.6 : 10.6; // with the guides on, a line catches within 6px and holds until the pointer is 10px away
let s = SEED; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); const pick = (a) => a[Math.floor(rand() * a.length)];
const DEV = { Mobile: 390, Tablet: 768, Desktop: 1280 }, ORDER = ["Mobile", "Tablet", "Desktop"];
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:4000/editor/demo/?theme"); await p.waitForTimeout(2500);
await p.click("#panelBtn"); await p.waitForTimeout(500);
const fr = () => p.frames().find((f) => f !== p.mainFrame());
const setCode = async (html) => { await p.click("#codeBtn"); await p.waitForTimeout(300); await p.click("#codeMount .cm-content"); await p.keyboard.press("Meta+a"); await p.evaluate((h) => navigator.clipboard.writeText(h), html); await p.keyboard.press("Meta+v"); await p.waitForTimeout(700); await p.click("#codeClose"); await p.waitForTimeout(300); };
const device = async (name) => { await p.mouse.click(1000, 960).catch(() => {}); await p.waitForTimeout(150); await p.locator("#inspector button", { hasText: new RegExp("^" + name + "$") }).first().click(); await p.waitForTimeout(800); };
const snap = () => fr().evaluate(() => { const r = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10); }; const par = document.querySelector("[data-p]"); const kids = [...par.children]; return { ids: kids.map((k) => k.dataset.k).join(","), par: r(par), kids: kids.map(r), css: kids.map((k) => { const c = getComputedStyle(k); return { pos: c.position, l: c.left, t: c.top }; }), cls: kids.map((k) => k.className), w: innerWidth }; });
const same = (a, c, tol = 1) => a.every((v, i) => Math.abs(v - c[i]) <= tol);
const fails = []; let ran = 0, skipped = 0;
for (let it = 0; it < N; it++) {
  const dir = pick(["flex-row", "flex-col"]), nk = 2 + Math.floor(rand() * 3), gap = pick(["gap-2", "gap-4", "gap-6"]);
  const kids = Array.from({ length: nk }, (_, i) => `<div data-k="${i}" class="h-${pick([16, 20, 24])} w-${pick([24, 32, 40])} bg-${pick(["rose", "sky", "amber", "emerald"])}-200">${"ABCD"[i]}</div>`).join("");
  const html = `<div class="p-6"><div data-p class="flex ${dir} ${gap} h-[420px] p-4 bg-gray-50">${kids}</div></div>`;
  const dragDev = pick(ORDER), mode = pick(["device", "only", "all"]), target = Math.floor(rand() * nk);
  await setCode(html);
  const before = {}; for (const d of ORDER) { await device(d); before[d] = await snap(); }
  await device(dragDev);
  await fr().evaluate(() => 0);
  await p.evaluate((m) => localStorage.setItem("wc:scope", m), mode);
  const f = await p.locator("#frame").boundingBox(), W = before[dragDev].w, sc = f.width / W;
  const rect = before[dragDev].kids[target], par = before[dragDev].par;
  const cx = f.x + (rect[0] + rect[2] / 2) * sc, cy = f.y + (rect[1] + rect[3] / 2) * sc;
  await p.mouse.click(cx, cy); await p.waitForTimeout(1300);
  // a drag that keeps the pointer inside the parent (leaving it means "move somewhere else"), at least 12px
  const room = (lo, hi) => { const a = Math.max(-40, lo + 14), c = Math.min(40, hi - 14); return a >= c ? 0 : Math.round(a + rand() * (c - a)); };
  const dx = room(par[0] - (rect[0] + rect[2] / 2), par[0] + par[2] - (rect[0] + rect[2] / 2)), dy = room(par[1] - (rect[1] + rect[3] / 2), par[1] + par[3] - (rect[1] + rect[3] / 2));
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) { skipped++; continue; }
  await p.mouse.move(cx, cy); if (EXACT) await p.keyboard.down("Meta"); await p.mouse.down();
  for (let i = 1; i <= 16; i++) { await p.mouse.move(cx + dx * sc * i / 16, cy + dy * sc * i / 16); await p.waitForTimeout(35); }
  await p.mouse.up(); if (EXACT) await p.keyboard.up("Meta"); await p.waitForTimeout(1100);
  const after = {}; after[dragDev] = await snap();
  for (const d of ORDER) if (d !== dragDev) { await device(d); after[d] = await snap(); }
  const tag = `#${it} ${dir} ${nk}kids ${dragDev}/${mode} k${target} d=(${dx},${dy})`;
  if (after[dragDev].ids !== before[dragDev].ids) { skipped++; console.log("skip (became a reorder):", tag); continue; }
  const cls = after[dragDev].cls[target];
  const aligned = /\bself-|(^|\s)(md:|lg:)?m[lt]-auto\b/.test(cls);
  if (!aligned && !/\brelative\b/.test(cls) && !/(^|\s)(md:|lg:)?(left|top)-/.test(cls)) { skipped++; console.log("skip (block drag):", tag, "|", cls); continue; }
  ran++;
  const bad = [];
  for (const d of ORDER) {
    const B = before[d], A = after[d];
    if (!same(B.par, A.par)) bad.push(`${d}: parent moved ${B.par} -> ${A.par}`);
    B.kids.forEach((r, k) => { if (k !== target && !same(r, A.kids[k])) bad.push(`${d}: sibling ${k} moved ${r} -> ${A.kids[k]}`); });
    const moved = !same(B.kids[target], A.kids[target], 0.5);
    const want = d === dragDev ? true : mode === "all" ? true : mode === "device" ? ORDER.indexOf(d) > ORDER.indexOf(dragDev) : false;
    if (moved !== want) bad.push(`${d}: element ${moved ? "moved" : "did not move"} but scope ${mode}@${dragDev} says it ${want ? "should" : "must not"}`);
  }
  const A = after[dragDev], B = before[dragDev], got = [A.kids[target][0] - B.kids[target][0], A.kids[target][1] - B.kids[target][1]];
  if (!aligned && (Math.abs(got[0] - dx) > TOL || Math.abs(got[1] - dy) > TOL)) bad.push(`${dragDev}: moved (${got.map((v) => Math.round(v * 10) / 10)}) but the pointer moved (${dx},${dy})`);
  console.log(bad.length ? "FAIL" : "ok  ", tag, "|", cls);
  if (bad.length) { bad.forEach((m) => console.log("      ", m)); fails.push(tag); }
}
console.log(`\nran ${ran}, skipped ${skipped}, failed ${fails.length}; page errors: ${errs.length ? errs.join("; ") : "none"}`);
await b.close();
process.exit(fails.length ? 1 : 0);
