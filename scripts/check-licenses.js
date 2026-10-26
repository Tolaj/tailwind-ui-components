// Fails when a production dependency has a licence that would restrict how Windcraft can be licensed or sold
// (GPL, AGPL, SSPL, source-available...) or one we cannot read. Run with `npm run licenses`; `--list` prints every package.
// Dev-only tools (typescript, eslint...) are not shipped, so they are not checked.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ALLOWED = /^(MIT|MIT-0|ISC|0BSD|Unlicense|CC0-1\.0|BSD(-[23]-Clause)?|Apache-2\.0|BlueOak-1\.0\.0|Python-2\.0|CC-BY-4\.0|Zlib)$/i;

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/** The licence text of a package.json as one SPDX-ish string ("MIT", "(MIT OR Apache-2.0)"). */
function licenceOf(pkg) {
    const l = pkg.license ?? pkg.licenses;
    if (typeof l === "string") return l;
    if (l && typeof l === "object") return Array.isArray(l) ? l.map((x) => x.type || x).join(" OR ") : l.type || "";
    return "";
}

/** An expression is fine when every AND part has at least one allowed OR choice. */
function allowed(expr) {
    const ids = (s) => s.replace(/[()]/g, " ").split(/\s+(?:OR)\s+/i).map((x) => x.trim()).filter(Boolean);
    return expr.split(/\s+AND\s+/i).every((part) => ids(part).some((id) => ALLOWED.test(id)));
}

/** Resolve a dependency the way Node does: the nearest node_modules above the requiring package. */
function resolve(name, from) {
    for (let dir = from; ; dir = path.dirname(dir)) {
        const file = path.join(dir, "node_modules", name, "package.json");
        if (fs.existsSync(file)) return path.dirname(file);
        if (dir === ROOT || dir === path.dirname(dir)) return null;
    }
}

const seen = new Map(); // dir -> { name, version, licence }
function walk(dir) {
    const pkg = readJson(path.join(dir, "package.json"));
    const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };
    for (const name of Object.keys(deps)) {
        const found = resolve(name, dir);
        if (!found) { if (!(pkg.optionalDependencies || {})[name]) console.warn(`not installed: ${name} (needed by ${pkg.name})`); continue; }
        if (seen.has(found)) continue;
        const dep = readJson(path.join(found, "package.json"));
        seen.set(found, { name: dep.name, version: dep.version, licence: licenceOf(dep) });
        walk(found);
    }
}
walk(ROOT);

const rows = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
if (process.argv.includes("--list")) rows.forEach((r) => console.log(`${r.name}@${r.version}\t${r.licence || "(none)"}`));

const bad = rows.filter((r) => !r.licence || !allowed(r.licence));
const counts = {};
rows.forEach((r) => { counts[r.licence || "(none)"] = (counts[r.licence || "(none)"] || 0) + 1; });
console.log(`${rows.length} production packages:`, Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
if (bad.length) {
    console.error("\nNot allowed (or unreadable) - replace the package, or check the licence by hand and add it to ALLOWED:");
    bad.forEach((r) => console.error(`  ${r.name}@${r.version}  ${r.licence || "(no licence field)"}`));
    process.exit(1);
}
console.log("All licences allowed.");
