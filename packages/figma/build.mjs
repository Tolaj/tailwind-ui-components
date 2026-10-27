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
fs.copyFileSync(path.join(dir, "plugin", "manifest.json"), path.join(dist, "manifest.json"));
// the window is one self-contained page, so Windcraft's logo (from the app) is put into it as a data address
const logo = fs.readFileSync(path.join(dir, "..", "..", "src", "public", "images", "logo.png")).toString("base64");
fs.writeFileSync(path.join(dist, "ui.html"), fs.readFileSync(path.join(dir, "plugin", "ui.html"), "utf8").replace("__LOGO__", `data:image/png;base64,${logo}`));
console.log("Plugin built: import", path.join(dist, "manifest.json"), "in Figma");
