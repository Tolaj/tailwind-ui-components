// Deletes every component that belongs to no project (the platform plan: everything belongs to a project). DESTRUCTIVE, so it is guarded:
//
//   npm run components:projectless                       dry run: counts and lists what would go, writes nothing
//   npm run components:projectless -- --delete           writes a JSON backup first, then asks you to type  delete <count>
//
// The backup (backups/projectless-<time>.json) holds every field of every component it removes, so they can be put back with
// mongoimport or a small script. Nothing is deleted without the backup file written and the exact phrase typed.
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import Component from "../src/models/component.model.js";
import User from "../src/models/user.model.js";

const doDelete = process.argv.includes("--delete");
if (!process.env.MONGO_URI) { console.error("Missing MONGO_URI (run through npm so --env-file=.env applies)."); process.exit(1); }
await mongoose.connect(process.env.MONGO_URI);

const filter = { $or: [{ project: null }, { project: { $exists: false } }] };
const items = await Component.find(filter).lean();
const owners = new Map((await User.find({ _id: { $in: [...new Set(items.map((c) => String(c.createdBy)))] } }, { email: 1 }).lean()).map((u) => [String(u._id), u.email]));

console.log(`\n${items.length} component(s) belong to no project.\n`);
const byOwner = {};
for (const c of items) (byOwner[owners.get(String(c.createdBy)) || String(c.createdBy)] ||= []).push(c);
for (const [owner, list] of Object.entries(byOwner)) {
    console.log(`${owner}  (${list.length})`);
    list.forEach((c) => console.log(`   ${String(c._id)}  v${c.version || 1}  ${c.kind || "component"}  ${c.title}`));
}

if (!items.length) { await mongoose.disconnect(); process.exit(0); }
if (!doDelete) {
    console.log("\nDry run: nothing was changed. Add --delete to back them up and remove them.");
    await mongoose.disconnect();
    process.exit(0);
}

const dir = path.resolve(import.meta.dirname, "..", "backups");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `projectless-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(items, null, 2));
const written = JSON.parse(fs.readFileSync(file, "utf8")).length;
if (written !== items.length) { console.error("The backup does not hold every component; nothing was deleted."); process.exit(1); }
console.log(`\nBackup written: ${path.relative(process.cwd(), file)} (${written} components)`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const phrase = `delete ${items.length}`;
const answer = (await rl.question(`Type "${phrase}" to delete them for good: `)).trim();
rl.close();
if (answer !== phrase) { console.log("Not confirmed. Nothing was deleted."); await mongoose.disconnect(); process.exit(0); }

const res = await Component.deleteMany({ _id: { $in: items.map((c) => c._id) } });
console.log(`Deleted ${res.deletedCount} component(s).`);
await mongoose.disconnect();
