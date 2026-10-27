// Renders a converted page in headless Chrome and compares it with a picture of the Figma frame.
//   node packages/figma/bench/compare.mjs page.html reference.png --size 1920x4600 [--crop x,y,w,h] [--out dir]
// --crop is the part of the reference that is the frame (when the picture has a margin or shadow around it).
// Prints one similarity score (100 = identical) and the score of each horizontal band, so you see where the page differs.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const [pagePath, refPath] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!pagePath || !refPath || !flag("size")) { console.error("usage: compare.mjs page.html reference.png --size WxH [--crop x,y,w,h] [--out dir]"); process.exit(1); }
const [W, H] = flag("size").split("x").map(Number);
const crop = flag("crop")?.split(",").map(Number) || null;
const out = path.resolve(flag("out") || fs.mkdtempSync(path.join(os.tmpdir(), "figma-bench-")));
fs.mkdirSync(out, { recursive: true });
const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"].find(fs.existsSync);
if (!chrome) { console.error("Chrome not found"); process.exit(1); }
const run = (extra) => spawnSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", "--virtual-time-budget=20000", `--user-data-dir=${path.join(out, "profile")}`, ...extra], { encoding: "utf8", maxBuffer: 1 << 28 });

const shot = path.join(out, "render.png");
run([`--window-size=${W},${H}`, `--screenshot=${shot}`, pathToFileURL(path.resolve(pagePath)).href]);
if (!fs.existsSync(shot)) { console.error("Chrome made no screenshot"); process.exit(1); }

// both pictures are drawn at the same small size in a page, and compared pixel by pixel there
const CW = 400, CH = Math.round((CW * H) / W), BANDS = 12;
const c = crop || [0, 0, 0, 0];
fs.writeFileSync(path.join(out, "diff.html"), `<!doctype html><body><pre id="r">pending</pre><script>
const load = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
const px = (img, crop) => { const cv = document.createElement("canvas"); cv.width = ${CW}; cv.height = ${CH}; const g = cv.getContext("2d");
  const [x, y, w, h] = crop && crop[2] ? crop : [0, 0, img.naturalWidth, img.naturalHeight]; g.drawImage(img, x, y, w, h, 0, 0, ${CW}, ${CH}); return g.getImageData(0, 0, ${CW}, ${CH}).data; };
Promise.all([load(${JSON.stringify(pathToFileURL(shot).href)}), load(${JSON.stringify(pathToFileURL(path.resolve(refPath)).href)})]).then(([a, b]) => {
  const A = px(a, null), B = px(b, ${JSON.stringify(c)}), bands = new Array(${BANDS}).fill(0); let total = 0;
  for (let y = 0; y < ${CH}; y++) for (let x = 0; x < ${CW}; x++) { const i = (y * ${CW} + x) * 4; const d = (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 765; total += d; bands[Math.min(${BANDS} - 1, Math.floor(y * ${BANDS} / ${CH}))] += d; }
  const per = ${CW} * ${CH} / ${BANDS};
  document.getElementById("r").textContent = JSON.stringify({ score: +(100 * (1 - total / (${CW} * ${CH}))).toFixed(1), bands: bands.map((v) => +(100 * (1 - v / per)).toFixed(1)) });
}).catch((e) => { document.getElementById("r").textContent = JSON.stringify({ error: String(e) }); });
</script>`);
const dom = run(["--dump-dom", pathToFileURL(path.join(out, "diff.html")).href]).stdout || "";
const m = dom.match(/<pre id="r">(.*?)<\/pre>/s);
const res = m && JSON.parse(m[1].replace(/&quot;/g, '"'));
if (!res || res.error || res.score === undefined) { console.error("Comparison failed:", res?.error || m?.[1] || "no result"); process.exit(1); }
console.log(`similarity ${res.score}/100  (render: ${shot})`);
console.log("by band, top to bottom:", res.bands.join("  "));
