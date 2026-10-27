// @windcraft/editor: the visual editor as a package.
//
//   import { mountEditor } from "@windcraft/editor";
//   await mountEditor(document.getElementById("root"), { host, data });
//
// `host` is what the editor needs from the app around it (design/host.js lists it): saving, projects, the AI and the page address.
// `data` is the design to open (below). The page must map "@windcraft/core/" and "@windcraft/editor/" to where those packages are
// served (an import map, or a bundler does it). One editor per page: it takes over the page's size and keyboard.
import { setHost } from "./design/host.js";
import { config } from "./design/config.js";
import { editorHtml } from "./template.js";

const here = (path) => new URL(path, import.meta.url).href;
const TAILWIND = "https://cdn.tailwindcss.com";
let mounted = false;

/** The page itself never zooms or scales: only the canvas does. A pinch, Ctrl/Cmd + scroll and Ctrl/Cmd + = / - / 0 stay out of the browser's zoom. */
function keepPageUnzoomed() {
    addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
    ["gesturestart", "gesturechange", "gestureend"].forEach((t) => addEventListener(t, (e) => e.preventDefault(), { passive: false }));
    addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && ["=", "+", "-", "_", "0"].includes(e.key)) e.preventDefault(); }, true);
}

const load = (el) => new Promise((resolve, reject) => { el.onload = resolve; el.onerror = () => reject(new Error(`Could not load ${el.src || el.href}`)); document.head.append(el); });

/**
 * Opens the editor in `root`.
 * @param {HTMLElement} root
 * @param {object} options
 * @param {import("./design/host.js").Host} options.host
 * @param {object} [options.data]   the design to open: { id, title, htmlCode, version, category, description, tags, isPublished, group,
 *     project: {id,name}, projects: [{id,name}], categories: [{ group, items: [{ slug, name }] }], plane: [the project's other designs], board }
 * @param {{ href: string, title?: string, label?: string } | null} [options.back]   the Back link's target; none hides it
 * @param {boolean} [options.tailwind]   false when the page already loads Tailwind's play CDN (v3); true (default) loads it
 */
export async function mountEditor(root, { host, data = {}, back = null, tailwind = true }) {
    if (mounted) throw new Error("The editor is already mounted on this page");
    mounted = true;
    setHost(host);
    config.data = { id: null, title: "", version: 0, htmlCode: "", category: "", description: "", tags: [], isPublished: true, project: null, projects: [], categories: [], ...data };
    keepPageUnzoomed();
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: here("./styles.css") });
    const jobs = [load(link)];
    if (tailwind && !window.tailwind) jobs.push(load(Object.assign(document.createElement("script"), { src: TAILWIND })));
    await Promise.all(jobs);
    root.innerHTML = editorHtml;
    const a = root.querySelector("#backLink"), label = root.querySelector("#backLabel");
    if (back && a) { a.href = back.href; a.title = back.title || "Back"; if (label) label.textContent = back.label || "Back"; }
    else if (a) { a.remove(); if (label) label.remove(); }
    await import("./design/editor.js");
}
