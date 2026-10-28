// The editor embedded next to the app's own code box: the box and the canvas follow each other, and the app shows its own details form.
import { embedEditor } from "@windcraft/editor/index.js";

const KEY = "windcraft-embed-demo";
const host = {
    async createComponent(fields) { const rec = { ...fields, _id: Math.random().toString(36).slice(2, 10), version: 1 }; localStorage.setItem(KEY, JSON.stringify(rec)); return rec; },
    async updateComponent(id, fields) { const rec = { ...JSON.parse(localStorage.getItem(KEY) || "{}"), ...fields, version: 2 }; localStorage.setItem(KEY, JSON.stringify(rec)); return rec; },
    async createProject(name) { return { id: "p1", name }; },
    async saveLayout() {}, saveLayoutOnExit() {}, showDesign() {}, openDesign() {},
};
const code = document.getElementById("code"), bar = document.getElementById("bar");
code.value = '<div class="p-8"><h1 class="text-3xl font-bold">Hello</h1><p class="mt-2 text-gray-600">Edit me on either side.</p></div>';

const ed = embedEditor(document.getElementById("host"), {
    host,
    data: { htmlCode: code.value, categories: [{ group: "Demo", items: [{ slug: "demo", name: "Demo" }] }] },
    ui: { panels: false, nav: false, tools: ["move", "hand", "interact", "frame", "shape", "text", "add"] },
    onDetails: (fields) => { bar.textContent = "needs details"; window.__details = fields; },
});
ed.onChange(({ html, dirty, status, source }) => {
    bar.textContent = `${status || "idle"}${dirty ? " · dirty" : ""}`;
    if (source !== "host" && document.activeElement !== code) code.value = html;
});
code.addEventListener("input", () => ed.setHtml(code.value));
window.__ed = ed;
