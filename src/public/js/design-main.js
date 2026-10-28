// The design page's entry: opens the editor (packages/editor) with Windcraft's own host (app-host.js).
import { mountEditor } from "@windcraft/editor/index.js";
import { appHost } from "./app-host.js";

const data = JSON.parse(document.getElementById("designData").textContent);

// Back returns to wherever the editor was opened from; failing that, to the design's project (the Projects list is the last resort).
let back = data.project ? { href: `/projects/${data.project.id}`, title: "Back to the project", label: "Project" } : { href: "/projects", title: "Back to projects", label: "Projects" };
try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith("/design")) back = { href: ref.href, title: "Back", label: "Back" };
} catch { /* keep the project link */ }

const root = document.createElement("div");
document.body.append(root);
await mountEditor(root, { host: appHost, data, back, tailwind: false }); // the layout already loads Tailwind
