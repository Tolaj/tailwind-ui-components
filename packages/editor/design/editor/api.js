// What an app can do with a mounted editor (the object mountEditor() resolves to):
//   getHtml()          the component's source as it is now
//   setHtml(html)      replaces it (one undo step); a change made this way is reported with source "host"
//   onChange(fn)       fn({ html, dirty, status, source }) after every change; source says where it came from: "host" (your setHtml), "editor" (the markup changed there) or "status" (only the save state). Returns an unsubscribe
//   isDirty()          whether there is anything unsaved
//   save()             the editor's own save (a first save that needs a name asks the app through ui.onDetails, else shows its dialog)
//   saveDetails(f)     finishes that first save with { title, category, description, tags, isPublished, project }; rejects with the reason
//   details()          what the details form starts from
//   release()          the app is leaving the page on purpose and has kept the work: no "Leave site?" question
import { config } from "../config.js";
import { parseComponentSource } from "../../playground/component-source.js";
import { S, model } from "./base.js";
import { assemble, commit, loadFrame } from "./docs.js";
import { anyDirty } from "./designs.js";
import { save } from "./toolbar.js";
import { detailsOf, saveDetails } from "./add-menu.js";

const listeners = new Set();
let fromHost = false, last = "", lastMarkup = model.markup;
const statusText = () => (document.getElementById("saveState") || {}).textContent || "";

config.hooks.chrome = () => {
    // "host": the app's own setHtml; "editor": the markup changed in the editor (canvas, undo, code); "status": only the save state moved
    const source = fromHost ? "host" : model.markup !== lastMarkup ? "editor" : "status";
    lastMarkup = model.markup;
    const state = { html: assemble(), dirty: anyDirty(), status: statusText().trim(), source };
    const key = JSON.stringify([state.html, state.dirty, state.status, state.source]);
    if (key === last) return;
    last = key;
    listeners.forEach((fn) => fn(state));
};

export const api = {
    getHtml: assemble,
    setHtml(html) {
        if (String(html) === assemble()) return;
        fromHost = true;
        try { S.parsed = parseComponentSource(String(html)); commit(S.parsed.markup, "code"); loadFrame(); } finally { fromHost = false; }
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    isDirty: anyDirty,
    save,
    saveDetails,
    details: detailsOf,
    /** The app is about to leave the page itself (and keeps the work): the browser's "leave site?" question is skipped. */
    release() { config.leaving = true; },
};
