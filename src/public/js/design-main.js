// The design page's entry: opens the editor (packages/editor) with Windcraft's own host (app-host.js).
import { mountEditor } from "@windcraft/editor/index.js";
import { appHost } from "./app-host.js";

const data = JSON.parse(document.getElementById("designData").textContent);

// Coming from the quick Add Component dialog: pick up the code and details it handed over.
if (!data.id && new URLSearchParams(window.location.search).has("draft")) {
    try {
        const d = JSON.parse(sessionStorage.getItem("wc:draft") || "null");
        if (d) {
            Object.assign(data, {
                htmlCode: d.html || "", title: d.title || "", category: d.category || "", description: d.description || "",
                tags: String(d.tags || "").split(",").map((t) => t.trim()).filter(Boolean), isPublished: d.isPublished !== "false",
            });
            sessionStorage.removeItem("wc:draft");
        }
    } catch { /* ignore a bad draft */ }
    appHost.showDesign(null);
}

// Back returns to wherever the editor was opened from (the Library link is the fallback).
let back = { href: "/library", title: "Back to library", label: "Library" };
try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith("/design")) back = { href: ref.href, title: "Back", label: "Back" };
} catch { /* keep the Library link */ }

const root = document.createElement("div");
document.body.append(root);
await mountEditor(root, { host: appHost, data, back, tailwind: false }); // the layout already loads Tailwind
