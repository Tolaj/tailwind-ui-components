// Layout lab: does rules-only layout inference (packages/core/layout-infer.js) recover how real designs were laid out?
// Steps (from the repo root, with the editor not needed):
//   1. node --env-file=.env scripts/layout-lab/export.mjs <dir>      read-only copy of the gallery components' HTML
//   2. node scripts/layout-lab/extract.mjs <dir> <out.json>          render at 1280 (needs playwright-core and Chrome, CHROME=...) and record each container
//   3. node scripts/layout-lab/run.mjs <out.json>                    clean geometry and noise on every child
//   4. node scripts/layout-lab/run2.mjs <out.json>                   one child dropped off its place: does the best layout put it back?
// Read-only: copies the gallery components' HTML to local files for the layout experiment.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url.replace("scripts/layout-lab/export.mjs","package.json"));
const mongoose = require("mongoose");
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
const col = mongoose.connection.collection("components");
const total = await col.countDocuments({});
const docs = await col.find({}, { projection: { title: 1, category: 1, htmlCode: 1 } }).toArray();
let n = 0;
for (const d of docs) { if (!d.htmlCode || d.htmlCode.length < 80) continue; fs.writeFileSync(`${process.argv[2]}/${d._id}.html`, d.htmlCode); fs.writeFileSync(`${process.argv[2]}/${d._id}.json`, JSON.stringify({ title: d.title, category: d.category })); n++; }
console.log("components in DB:", total, "| exported:", n);
await mongoose.disconnect();
