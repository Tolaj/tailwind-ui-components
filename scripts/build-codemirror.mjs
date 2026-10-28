// Bundles CodeMirror 6 into packages/editor/vendor/codemirror.js and Prettier into packages/editor/vendor/prettier.js (one ES module each,
// so the editor needs no build step of its own).
// Run after changing scripts/codemirror-entry.js or updating the @codemirror packages:  node scripts/build-codemirror.mjs
import { build } from "esbuild";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const out = path.join(ROOT, "packages/editor/vendor/codemirror.js");
await build({
    entryPoints: [path.join(import.meta.dirname, "codemirror-entry.js")], outfile: out,
    bundle: true, format: "esm", minify: true, target: "es2020", legalComments: "none",
    banner: { js: "/* CodeMirror 6 (MIT, Marijn Haverbeke and contributors), bundled by scripts/build-codemirror.mjs */" },
});
console.log("wrote", path.relative(ROOT, out));
const pretty = path.join(ROOT, "packages/editor/vendor/prettier.js");
await build({
    entryPoints: [path.join(import.meta.dirname, "prettier-entry.js")], outfile: pretty,
    bundle: true, format: "esm", minify: true, target: "es2020", legalComments: "none",
    banner: { js: "/* Prettier (MIT), bundled by scripts/build-codemirror.mjs */" },
});
console.log("wrote", path.relative(ROOT, pretty));
