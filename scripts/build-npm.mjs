// Builds the npm package "windcraft-editor" into dist/npm and nothing else: node scripts/build-npm.mjs
//
// The editor reaches core by relative paths (../../core/...), so the package keeps the repo's layout: editor/ and core/ side by side.
// Publish with:  npm publish ./dist/npm     (check first with: npm pack --dry-run ./dist/npm)
import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist", "npm");
const src = (...p) => path.join(root, "packages", ...p);
const editor = JSON.parse(readFileSync(src("editor", "package.json"), "utf8"));

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, "editor"), { recursive: true });
mkdirSync(path.join(out, "core"), { recursive: true });

// the editor: everything except its demo and tests
for (const name of ["index.js", "embed.js", "embed.html", "embed-frame.js", "template.js", "styles.css", "design", "playground", "vendor"]) {
    cpSync(src("editor", name), path.join(out, "editor", name), { recursive: true });
}
// core: the .js files, no tests
for (const f of readdirSync(src("core"))) if (f.endsWith(".js")) cpSync(src("core", f), path.join(out, "core", f));

cpSync(path.join(root, "LICENSE"), path.join(out, "LICENSE"));
cpSync(src("editor", "README.md"), path.join(out, "README.md"));

const pkg = {
    name: "windcraft-editor",
    version: editor.version,
    description: "Windcraft's visual HTML + Tailwind editor. Mount it in a page and give it a host that loads and saves designs.",
    keywords: ["tailwind", "tailwindcss", "visual-editor", "design-tool", "html", "wysiwyg", "windcraft"],
    type: "module",
    license: "MIT",
    author: "Swapnil Jadhav",
    repository: { type: "git", url: "git+https://github.com/Tolaj/windcraft.git", directory: "packages/editor" },
    homepage: "https://github.com/Tolaj/windcraft#readme",
    bugs: { url: "https://github.com/Tolaj/windcraft/issues" },
    main: "editor/index.js",
    exports: { ".": "./editor/index.js", "./*": "./*" },
    files: ["editor", "core", "LICENSE", "README.md"],
    publishConfig: { access: "public" },
};
writeFileSync(path.join(out, "package.json"), JSON.stringify(pkg, null, 4) + "\n");
console.log(`dist/npm ready: windcraft-editor@${pkg.version}`);
