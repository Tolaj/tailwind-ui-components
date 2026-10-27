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
// where Windcraft lives: the server's own PUBLIC_URL (from the environment or the app's .env), so there is one place to set it.
// `--dev` builds are for working on the plugin: they default to localhost and show an address field in the window.
const dev = process.argv.includes("--dev");
const envFile = path.join(dir, "..", "..", ".env");
const fromFile = fs.existsSync(envFile) ? (fs.readFileSync(envFile, "utf8").match(/^\s*PUBLIC_URL\s*=\s*["']?([^"'\s#]+)/m) || [])[1] : "";
const server = (process.env.WINDCRAFT_URL || process.env.PUBLIC_URL || fromFile || (dev ? "http://localhost:3000" : "")).replace(/\/+$/, "");
if (!server) throw new Error("No Windcraft address: set PUBLIC_URL in the app's .env (the same value the server uses), or build with --dev for localhost.");
if (!/^https?:\/\/[^\s"<>]+$/.test(server)) throw new Error(`PUBLIC_URL is not an address: ${server}`);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "plugin", "manifest.json"), "utf8"));
// the plugin may only reach Windcraft's own address (Figma reviews this); a local address is allowed through devAllowedDomains
if (/^http:\/\/localhost(:\d+)?$/.test(server)) { manifest.networkAccess.allowedDomains = ["none"]; manifest.networkAccess.devAllowedDomains = [server]; }
else manifest.networkAccess.allowedDomains = [server];
if (dev) manifest.networkAccess.devAllowedDomains = [...new Set([...(manifest.networkAccess.devAllowedDomains || []), "http://localhost:3000", "http://localhost:3001"])];
fs.writeFileSync(path.join(dist, "manifest.json"), JSON.stringify(manifest, null, 4) + "\n");
// the window is one self-contained page, so Windcraft's logo (from the app) is put into it as a data address
const logo = fs.readFileSync(path.join(dir, "..", "..", "src", "public", "images", "logo.png")).toString("base64");
fs.writeFileSync(path.join(dist, "ui.html"), fs.readFileSync(path.join(dir, "plugin", "ui.html"), "utf8").replace("__LOGO__", `data:image/png;base64,${logo}`).replace("__SERVER__", server).replace("__DEV__", String(dev)));
console.log(`Windcraft address in this build: ${server}${dev ? " (dev build: the window has an address field)" : ""}`);
console.log("Plugin built: import", path.join(dist, "manifest.json"), "in Figma");
