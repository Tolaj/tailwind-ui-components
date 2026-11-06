// windcraft-editor: the visual editor as a package.
//
//   import { mountEditor } from "windcraft-editor";
//   await mountEditor(document.getElementById("root"), { host, data });
//
// `host` is what the editor needs from the app around it (design/host.js lists it): saving, projects, the AI and the page address.
// `data` is the design to open (below). The page must serve this package's files and, for a plain browser page, map "windcraft-editor"
// to editor/index.js with an import map (a bundler does that itself). One editor per page: it takes over the page's size and keyboard.
import { setHost } from "./design/host.js";
import { config } from "./design/config.js";
import { editorHtml } from "./template.js";
import { localHost, savedDesign } from "./local-host.js";

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
 * @param {object} [options.data]   the design to open: { id, title, htmlCode, version, category, description, tags, isPublished, useAsReference, group,
 *     project: {id,name}, projects: [{id,name}], categories: [{ group, items: [{ slug, name }] }], plane: [the project's other designs], board }
 * @param {{ href: string, title?: string, label?: string } | null} [options.back]   the Back link's target; none hides it
 * @param {{ panels?: boolean, nav?: boolean, tools?: string[] | null, onDetails?: (fields: object) => void }} [options.ui]   what of the editor shows:
 *     panels: false hides Layers, Properties and Code; nav: false hides Back, the page list and the project; tools: the ids to keep
 *     ("move","hand","interact","frame","shape","text","add"; null keeps all); onDetails: the app shows its own details form when a first save needs a name
 * @param {boolean} [options.tailwind]   false when the page already loads Tailwind's play CDN (v3); true (default) loads it
 */
export async function mountEditor(root, { host, data = {}, back = null, tailwind = true, ui = {} }) {
    if (mounted) throw new Error("The editor is already mounted on this page");
    mounted = true;
    setHost(host);
    config.data = { id: null, title: "", version: 0, htmlCode: "", category: "", description: "", tags: [], isPublished: false, useAsReference: true, project: null, projects: [], categories: [], ...data };
    config.ui = { panels: true, nav: true, tools: null, ...ui };
    if (ui.onDetails) config.hooks.details = ui.onDetails;
    keepPageUnzoomed();
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: here("./styles.css") });
    const jobs = [load(link)];
    if (tailwind && !window.tailwind) jobs.push(load(Object.assign(document.createElement("script"), { src: TAILWIND })));
    await Promise.all(jobs);
    if (!root.style.height && root.parentElement === document.body) root.style.height = "100vh"; // an editor that is the page; one in a container takes the container's height
    root.innerHTML = editorHtml;
    const a = root.querySelector("#backLink"), label = root.querySelector("#backLabel");
    if (back && a) { a.href = back.href; a.title = back.title || "Back"; if (label) label.textContent = back.label || "Back"; }
    else if (a) { a.remove(); if (label) label.remove(); }
    root.classList.toggle("wc-no-panels", config.ui.panels === false);
    root.classList.toggle("wc-no-nav", config.ui.nav === false);
    root.classList.toggle("wc-no-add", Boolean(config.ui.tools) && !config.ui.tools.includes("add"));
    await import("./design/editor.js");
    return (await import("./design/editor/api.js")).api;
}
export { embedEditor } from "./embed.js";

/**
 * The quickest way in: the editor with nothing to set up. Designs are saved in this browser (localStorage).
 * @param {HTMLElement} root
 * @param {{ html?: string, title?: string, key?: string, theme?: object }} [options]
 *     html: what a new design starts with; title: its name; key: the localStorage key (use different ones for different editors);
 *     theme: { brand, gray, font, radius }
 */
export async function startEditor(root, { html = "", title = "My design", key = "windcraft", theme } = {}) {
    const categories = [{ group: "Designs", items: [{ slug: "design", name: "Design" }] }];
    const saved = savedDesign(key);
    await mountEditor(root, {
        host: localHost(key),
        data: saved
            ? { id: saved._id, title: saved.title, htmlCode: saved.htmlCode, version: saved.version, category: saved.category || "design", description: saved.description, tags: String(saved.tags || "").split(",").filter(Boolean), categories }
            : { title, htmlCode: html, category: "design", description: "", theme, categories },
    });
}
