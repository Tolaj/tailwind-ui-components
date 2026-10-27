// Writes the designs people shared from the Figma plugin to a folder, ready for packages/figma/bench/score.mjs:
//   node scripts/export-samples.mjs [outDir] [--kind report|share] [--since 2026-10-01]
// Each sample becomes <id>.snapshot.json (the layer data), <id>.html (what the converter made) and <id>.meta.json (title, size, note...).
// Pictures are not part of a sample, so a reference picture from Figma is needed to score one: see the README in packages/figma/bench.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import mongoose from "mongoose";
import ConversionSample from "../src/models/conversionSample.model.js";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const out = path.resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) || "samples");
fs.mkdirSync(out, { recursive: true });
await mongoose.connect(process.env.MONGO_URI);
const query = { ...(flag("kind") ? { kind: flag("kind") } : {}), ...(flag("since") ? { createdAt: { $gte: new Date(flag("since")) } } : {}) };
let n = 0;
for await (const s of ConversionSample.find(query).sort("createdAt").cursor()) {
    const base = path.join(out, String(s._id));
    fs.writeFileSync(`${base}.snapshot.json`, zlib.gunzipSync(s.snapshotGz));
    fs.writeFileSync(`${base}.html`, zlib.gunzipSync(s.htmlGz));
    fs.writeFileSync(`${base}.meta.json`, JSON.stringify({ title: s.title, kind: s.kind, converter: s.converter, width: s.width, height: s.height, note: s.note, anonymized: s.anonymized, createdAt: s.createdAt }, null, 2));
    n++;
}
console.log(`${n} sample${n === 1 ? "" : "s"} written to ${out}`);
await mongoose.disconnect();
