// Bundles the plugin into dist/ (a Figma plugin is one JS file: it cannot import). Import dist/manifest.json in Figma.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const dir = import.meta.dirname, dist = path.join(dir, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
await build({
    entryPoints: [path.join(dir, "plugin", "code.js")], outfile: path.join(dist, "code.js"),
    bundle: true, format: "iife", target: "es2019", logLevel: "info",
});
for (const f of ["manifest.json", "ui.html"]) fs.copyFileSync(path.join(dir, "plugin", f), path.join(dist, f));
console.log("Plugin built: import", path.join(dist, "manifest.json"), "in Figma");
