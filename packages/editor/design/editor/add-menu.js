import { host } from "../host.js";
import { config } from "../config.js";
import { parseComponentSource } from "../../playground/component-source.js";
import { $, S, data, esc, model } from "./base.js";
import { cmd } from "./frame-messages.js";
import { assemble, commit, loadFrame, updateChrome } from "./docs.js";
import { renderInspector } from "./inspector.js";
import { anyDirty, boardPayload, docs, pinBoard, remapKey, saveBoard } from "./designs.js";

// ── Add menu: build from blocks ──────────────────────────────────────────────
const BLOCKS = [
    ["Section", '<section class="p-10"><h2 class="text-2xl font-bold">Section title</h2><p class="mt-2 text-gray-600">Describe this section.</p></section>'],
    ["Container", '<div class="mx-auto max-w-5xl p-6"></div>'],
    ["Columns (2)", '<div class="grid grid-cols-1 gap-6 md:grid-cols-2"><div class="p-6">Column one</div><div class="p-6">Column two</div></div>'],
    ["Heading", '<h2 class="text-3xl font-bold">Heading</h2>'],
    ["Text", '<p class="text-gray-600">Write something here.</p>'],
    ["Button", '<a href="#" class="inline-block rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white">Button</a>'],
    ["Image", '<img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=60" alt="Image" class="rounded-lg">'],
    ["Card", '<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h3 class="font-semibold">Card title</h3><p class="mt-1 text-sm text-gray-600">Card text.</p></div>'],
    ["Input", '<input type="text" placeholder="Type here" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">'],
];
const CONTAINERS = new Set(["body", "div", "section", "header", "footer", "main", "nav", "ul", "ol", "form", "article", "aside"]);
function addToEmpty(html) {
    model.markup = html;
    commit(html);
    loadFrame();
}

// ── An empty page: draft it with AI (the Page panel's Generate) ──────────────
/** Drafts the whole (empty) page from a description. Returns { ok, message? } for the page panel to show. */
export async function draftPage(prompt) {
    try {
        const html = await host.generate({ prompt, useLibrary: true });
        if (!html.startsWith("<")) throw new Error("The AI didn't return HTML. Try rephrasing.");
        S.parsed = parseComponentSource(html);
        commit(S.parsed.markup);
        loadFrame();
        if (!data.title) data.title = prompt.slice(0, 60);
        updateChrome();
        renderInspector();
        return { ok: true };
    } catch (err) {
        return { ok: false, message: err.message };
    }
}

// ── Details dialog: name, category, tags, visibility ─────────────────────────
const dlg = $("detailsDlg");

function fillProjects() {
    const cur = data.project ? data.project.id : "";
    $("dProject").innerHTML = `<option value="" disabled>Choose a project</option>` + (data.projects || []).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("") + `<option value="__new__">New project...</option>`;
    const first = (data.projects || [])[0];
    $("dProject").value = cur || (first ? first.id : ""); // every design belongs to a project
}

/** What the details dialog shows now: the design's name, category, tags... (also what the app's own details form starts from). */
export const detailsOf = () => ({
    title: data.title || "", category: data.category || "", description: data.description || "", tags: (data.tags || []).join(", "),
    isPublished: data.isPublished, project: data.project ? data.project.id : "", isNew: S.isNew,
});

export function openDetails() {
    if (config.hooks.details) return config.hooks.details(detailsOf()); // the app shows its own form and answers with saveDetails()
    fillProjects();
    $("dTitle").value = data.title || "";
    $("dCategory").value = data.category || "";
    $("dDesc").value = data.description || "";
    $("dTags").value = (data.tags || []).join(", ");
    $("dVis").value = String(data.isPublished);
    $("detailsTitle").textContent = S.isNew ? "Name and save your component" : "Component details";
    $("detailsSave").textContent = S.isNew ? "Create component" : "Save details";
    $("detailsError").classList.add("hidden");
    dlg.showModal();
}

/** Saves the design's details (and, the first time, the design itself). Rejects with the reason when it can't. */
export async function saveDetails(fields) {
    const fromDraft = S.isNew && S.draftKey && S.draftKey === S.curKey; // a design opened from a Figma draft: its Figma data moves to the new page
    const saved = S.isNew ? await host.createComponent({ ...fields, htmlCode: assemble(), ...(fromDraft ? { draftId: data.draftId } : {}) }) : await host.updateComponent(data.id, fields);
    const movedProject = (data.project ? data.project.id : "") !== (fields.project || "");
    data.project = (data.projects || []).find((p) => p.id === fields.project) || null;
    Object.assign(data, { title: fields.title, category: fields.category, description: fields.description, tags: String(fields.tags || "").split(",").map((t) => t.trim()).filter(Boolean), isPublished: String(fields.isPublished) === "true" });
    if (S.isNew) {
        data.id = saved._id;
        data.version = saved.version || 1;
        S.isNew = false;
        S.savedMarkup = model.markup;
        host.showDesign(data.id);
        const d = docs.get(S.curKey);
        if (data.project) pinBoard(S.curKey, false);
        if (d.board && data.project) saveBoard([boardPayload([data.id, d.board])]);
        remapKey(S.curKey, data.id);
        if (fromDraft) { S.draftKey = null; if (saved.figmaSource) document.dispatchEvent(new CustomEvent("figma-source-ready", { detail: { info: saved.figmaSource, id: data.id } })); }
    }
    updateChrome();
    // the plane belongs to a project, so a design that moved to another one reloads onto that project's plane
    if (movedProject && !anyDirty()) host.openDesign(data.id);
    return data;
}

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {
$("addMenu").innerHTML = BLOCKS.map(([name], i) => `<button type="button" data-block="${i}" class="block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-neutral-100">${name}</button>`).join("");
    $("addBtn").addEventListener("click", (e) => { e.stopPropagation(); $("addMenu").classList.toggle("hidden"); });
    document.addEventListener("click", () => $("addMenu").classList.add("hidden"));
    $("addMenu").addEventListener("click", (e) => {
        const b = e.target.closest("[data-block]");
        if (!b) return;
        const html = BLOCKS[Number(b.dataset.block)][1];
        if (model.markup.trim() === "" || !S.selected) {
            if (model.markup.trim() === "") { addToEmpty(html); return; }
            return cmd({ cmd: "insert", path: [], html, position: "inside" });
        }
        cmd({ cmd: "insert", path: S.selected.path, html, position: CONTAINERS.has(S.selected.tag) ? "inside" : "after" });
    });
$("dCategory").innerHTML += (data.categories || []).map((g) => `<optgroup label="${esc(g.group)}">${g.items.map((i) => `<option value="${i.slug}">${esc(i.name)}</option>`).join("")}</optgroup>`).join("");
    $("dProject").addEventListener("change", async (e) => {
        if (e.target.value !== "__new__") return;
        const name = prompt("Project name");
        if (!name || !name.trim()) { fillProjects(); return; }
        let project;
        try { project = await host.createProject(name); } catch (err) { alert(err.message || "Could not create the project"); return fillProjects(); }
        (data.projects ||= []).push(project);
        fillProjects();
        $("dProject").value = project.id;
    });
    $("detailsBtn").addEventListener("click", openDetails);
    $("detailsCancel").addEventListener("click", () => dlg.close());

    $("detailsForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fields = { title: $("dTitle").value.trim(), category: $("dCategory").value, description: $("dDesc").value.trim(), tags: $("dTags").value, isPublished: $("dVis").value, project: $("dProject").value };
        if (!fields.title || !fields.category || !fields.description) return;
        const err = $("detailsError");
        $("detailsSave").disabled = true;
        try {
            await saveDetails(fields);
            dlg.close();
        } catch (error) {
            err.textContent = error.message || "Could not save";
            err.classList.remove("hidden");
        } finally {
            $("detailsSave").disabled = false;
        }
    });
}
