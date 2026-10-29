// The editor with no backend at all: designs are kept in this browser's localStorage. This is all an app has to write to use it.
import { mountEditor } from "@windcraft/editor/index.js";

const KEY = "windcraft-demo";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const write = (all) => localStorage.setItem(KEY, JSON.stringify(all));
const id = () => Math.random().toString(36).slice(2, 10);

/** @type {import("@windcraft/editor/design/host.js").Host} */
const host = {
    async createComponent(fields) {
        const all = read(), _id = id();
        all[_id] = { ...fields, _id, version: 1 };
        write(all);
        return all[_id];
    },
    async updateComponent(docId, fields) {
        const all = read();
        if (!all[docId]) throw new Error("That design isn't saved here");
        const next = { ...all[docId], ...fields };
        if (fields.htmlCode !== undefined && fields.htmlCode !== all[docId].htmlCode) next.version = (all[docId].version || 1) + 1;
        all[docId] = next;
        write(all);
        return next;
    },
    async createProject(name) { return { id: id(), name }; },
    async saveLayout(projectId, positions) { (window.__layouts ||= []).push({ projectId, positions }); },
    saveLayoutOnExit() {},
    showDesign(docId) { history.replaceState({}, "", docId ? `?design=${docId}` : location.pathname); },
    openDesign(docId) { location.href = `?design=${docId}`; },
};

const saved = read()[new URLSearchParams(location.search).get("design") || ""];
const categories = [{ group: "Demo", items: [{ slug: "demo", name: "Demo" }] }]; // the Details dialog's category list: whatever the app has
await mountEditor(document.getElementById("root"), {
    host,
    data: saved
        ? { id: saved._id, title: saved.title, htmlCode: saved.htmlCode, version: saved.version, category: saved.category, description: saved.description, tags: String(saved.tags || "").split(",").filter(Boolean), categories }
        : { theme: new URLSearchParams(location.search).has("theme") ? { brand: "#e11d48", gray: "stone", font: "Poppins", radius: "xl" } : undefined, // ?theme: a project theme, to see it applied
            title: "My design", category: new URLSearchParams(location.search).has("blank") ? "" : "demo", description: "A demo design", categories }, // ?blank: a first save asks for details, as on a new design
});
