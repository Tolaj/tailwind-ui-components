// Scores the converter on a folder of frames: for each X.snapshot.json with an X.reference.png (Figma's own 1x picture of the frame),
// converts it with the current rules, renders it in headless Chrome and compares the two pictures.
//   node packages/figma/bench/score.mjs <dir> [--baseline baseline.json] [--update] [--min 90]
// Files come from the dev plugin build's "Download debug data" (both files), or from scripts/export-samples.mjs (then add references).
// With --baseline, a frame whose score dropped by more than 0.5 since the baseline fails the run (exit 1): run it before publishing.
// --update writes the current scores as the new baseline.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertDesign } from "../src/convert.js";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const dir = path.resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) || ".");
const baselinePath = flag("baseline") ? path.resolve(flag("baseline")) : null;
const min = Number(flag("min") || 0);
const baseline = baselinePath && fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, "utf8")) : {};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "figma-score-"));
const compare = path.join(import.meta.dirname, "compare.mjs");

const rows = [], skipped = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".snapshot.json")).sort()) {
    const name = file.replace(/\.snapshot\.json$/, "");
    const ref = [`${name}.reference.png`, `${name}.png`].map((f) => path.join(dir, f)).find(fs.existsSync);
    if (!ref) { skipped.push(name); continue; }
    const tree = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const { html, warnings, size } = convertDesign(tree, { title: name });
    const page = path.join(tmp, `${name}.html`);
    fs.writeFileSync(page, html);
    const r = spawnSync("node", [compare, page, ref, "--size", `${Math.round(tree.width)}x${Math.round(tree.height)}`, "--out", path.join(tmp, name)], { encoding: "utf8" });
    const score = Number((/similarity ([\d.]+)/.exec(r.stdout) || [])[1]);
    const bands = ((/by band[^:]*:\s*(.*)/.exec(r.stdout) || [])[1] || "").trim().split(/\s+/).map(Number);
    rows.push({ name, score, worst: bands.length ? Math.min(...bands) : NaN, kb: Math.round(size / 1024), warnings: warnings.length, error: Number.isNaN(score) ? (r.stderr || r.stdout).trim().split("\n").pop() : "" });
}

rows.sort((a, b) => (a.score || 0) - (b.score || 0));
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad("frame", 34)}${pad("score", 8)}${pad("worst band", 12)}${pad("KB", 8)}${pad("notes", 7)}vs baseline`);
let failed = false;
for (const r of rows) {
    const before = baseline[r.name];
    const drop = before !== undefined && r.score < before - 0.5;
    const low = r.score < min;
    if (drop || low || r.error) failed = true;
    console.log(`${pad(r.name.slice(0, 32), 34)}${pad(r.error ? "error" : r.score, 8)}${pad(r.worst, 12)}${pad(r.kb, 8)}${pad(r.warnings, 7)}${r.error || (before === undefined ? "new" : `${(r.score - before).toFixed(1)}${drop ? "  WORSE" : ""}`)}${low ? "  BELOW MIN" : ""}`);
}
const ok = rows.filter((r) => !r.error);
if (ok.length) console.log(`\n${ok.length} frame${ok.length === 1 ? "" : "s"}, average ${(ok.reduce((n, r) => n + r.score, 0) / ok.length).toFixed(1)}, lowest ${ok[0].score} (${ok[0].name})`);
if (skipped.length) console.log(`skipped (no reference picture): ${skipped.join(", ")}`);
if (flag("update") !== null || args.includes("--update")) {
    if (!baselinePath) console.error("--update needs --baseline <file>");
    else { fs.writeFileSync(baselinePath, JSON.stringify({ ...baseline, ...Object.fromEntries(ok.map((r) => [r.name, r.score])) }, null, 2) + "\n"); console.log(`baseline written to ${baselinePath}`); }
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
