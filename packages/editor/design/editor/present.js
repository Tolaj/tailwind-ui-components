import { host } from "../host.js";
import { createPresenter } from "../presenter.js";
import { $, S, data, model } from "./base.js";
import { anyDirty, docs } from "./designs.js";
import { heightOfDoc, widthOf } from "./plane.js";

// ── Preview (the play button) ───────────────────────────────────────────────────────────────────────────────────
// With an app that has a prototype page (host.previewUrl), the preview is that page, in its own tab: the same page a shared link
// opens, as Figma's prototype is its own view. Without one (the demo, an embedded editor, a design not saved yet) the same viewer
// opens over the editor, showing what is on the canvas now.
// (The Interact tool is different: it runs the one page you are editing, on the canvas.)

let viewer = null;

/** The pages to show: whole pages in the order of the Pages list (parts of a page are left out); the components when there are no pages. */
function pagesToShow() {
    const all = [...docs.values()];
    const tops = all.filter((d) => d.kind !== "section" || !all.some((p) => p.key === d.parent));
    const pages = tops.filter((d) => d.kind === "page");
    return pages.length ? pages : tops;
}

const sourceOf = (d) => {
    if (d.key === S.curKey) return { ...S.parsed, markup: model.markup }; // what is on the canvas now, saved or not
    return d.loaded ? { ...d.parsed, markup: d.markup } : d.source;
};

export function openPreview() {
    if (viewer) return;
    const cur = docs.get(S.curKey);
    if (host.previewUrl && data.project && cur && !S.isNew && cur.meta && cur.meta.id) {
        if (anyDirty() && !confirm("The preview shows the saved version of your pages. Open it without your unsaved changes?")) return;
        window.open(host.previewUrl({ projectId: data.project.id, designId: cur.meta.id }), "_blank", "noopener");
        return;
    }
    const list = pagesToShow();
    if (!list.length) return;
    viewer = createPresenter({
        pages: list.map((d) => ({ key: d.key, title: (d.key === S.curKey ? data.title : d.meta.title) || "Untitled page", width: widthOf(d), height: heightOfDoc(d), source: () => sourceOf(d) })),
        start: Math.max(0, list.findIndex((d) => d.key === S.curKey)), // starts on the page you are on
        onClose: closePreview,
    });
    $("playBtn").classList.add("on");
}

export function closePreview() {
    if (!viewer) return;
    viewer.destroy();
    viewer = null;
    $("playBtn").classList.remove("on");
}
export const previewOpen = () => Boolean(viewer);
