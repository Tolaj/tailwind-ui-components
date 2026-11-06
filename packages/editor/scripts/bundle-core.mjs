// Run by `npm pack` / `npm publish` (prepack and postpack): the editor imports "@windcraft/core/...", so a published copy carries
// core inside it (packages/editor/core) and the page maps "@windcraft/core/" to that folder. The copy is removed again afterwards.
import { cpSync, rmSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.resolve(here, "..", "..", "core");
const to = path.resolve(here, "..", "core");

if (process.argv[2] === "clean") {
    rmSync(to, { recursive: true, force: true });
} else {
    rmSync(to, { recursive: true, force: true });
    mkdirSync(to, { recursive: true });
    for (const f of readdirSync(from)) if (f.endsWith(".js")) cpSync(path.join(from, f), path.join(to, f));
}
