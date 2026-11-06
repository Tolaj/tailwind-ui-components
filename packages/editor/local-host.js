// A host with no backend: designs are kept in this browser's localStorage. startEditor (index.js) uses it, and so does the demo.

const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
const write = (key, all) => localStorage.setItem(key, JSON.stringify(all));
const id = () => Math.random().toString(36).slice(2, 10);

/** @param {string} key  the localStorage key the designs are kept under */
export function localHost(key = "windcraft") {
    /** @type {import("./design/host.js").Host} */
    const host = {
        async createComponent(fields) {
            const all = read(key), _id = id();
            all[_id] = { ...fields, _id, version: 1 };
            write(key, all);
            return all[_id];
        },
        async updateComponent(docId, fields) {
            const all = read(key);
            if (!all[docId]) throw new Error("That design isn't saved here");
            const next = { ...all[docId], ...fields };
            if (fields.htmlCode !== undefined && fields.htmlCode !== all[docId].htmlCode) next.version = (all[docId].version || 1) + 1;
            all[docId] = next;
            write(key, all);
            return next;
        },
        async deleteComponent(docId) { const all = read(key); delete all[docId]; write(key, all); },
        async createProject(name) { return { id: id(), name }; },
        async saveLayout() {},
        saveLayoutOnExit() {},
        showDesign(docId) { history.replaceState({}, "", docId ? `?design=${docId}` : location.pathname); },
        openDesign(docId) { location.href = `?design=${docId}`; },
    };
    return host;
}

/** The design the address (?design=...) points at, if it is saved here. */
export function savedDesign(key = "windcraft") {
    return read(key)[new URLSearchParams(location.search).get("design") || ""] || null;
}
