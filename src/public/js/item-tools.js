// What can be done with one item of a project: export it (HTML, React, Vue, Svelte, design spec, profile), look at its history and
// restore a version, move it to another project, say whether AI may use it as a reference, delete it. The dialog markup is in
// views/main/project.handlebars.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const btn = "h-8 rounded-md border border-gray-300 px-2.5 text-[13px] font-medium text-gray-800 hover:bg-gray-50";

// ── Export + history modal ───────────────────────────────────────────────────
const modal = document.getElementById("libModal");
const codeEl = document.getElementById("libCode");
const historyEl = document.getElementById("libHistory");
const copyBtn = document.getElementById("libCopy");
const tabsEl = document.getElementById("libTabs");
const TABS = [["profile", "Profile"], ["design", "Design spec"], ["html", "HTML"], ["react", "React"], ["vue", "Vue"], ["svelte", "Svelte"], ["history", "History"]];
const cache = {};
let current = null;

async function showTab(tab) {
    current.tab = tab;
    tabsEl.innerHTML = TABS.map(([k, label]) =>
        `<button data-tab="${k}" class="rounded-md px-3 py-1 text-[13px] font-medium ${k === tab ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}">${label}</button>`).join("");

    const isHistory = tab === "history";
    codeEl.classList.toggle("hidden", isHistory);
    historyEl.classList.toggle("hidden", !isHistory);
    copyBtn.classList.toggle("hidden", isHistory);

    if (isHistory) {
        historyEl.innerHTML = `<p class="p-5 text-sm text-gray-500">Loading…</p>`;
        const res = await fetch(`/api/components/${current.id}/versions`);
        const json = await res.json();
        if (!json.success) { historyEl.innerHTML = `<p class="p-5 text-sm text-red-700">${esc(json.message)}</p>`; return; }
        historyEl.innerHTML = json.data.map((v) => `
            <div class="flex items-center justify-between gap-3 px-5 py-3">
                <div><span class="font-mono text-sm font-medium">v${v.version}</span>
                    <span class="ml-2 text-[13px] text-gray-500">${esc(v.note || (v.current ? "Current" : "Saved version"))}</span></div>
                ${v.current ? `<span class="text-xs text-gray-400">Current</span>` : `<button data-restore="${v.version}" class="${btn}">Restore</button>`}
            </div>`).join("");
        return;
    }

    const key = `${current.id}:${tab}`;
    codeEl.textContent = "Loading…";
    if (!cache[key] && tab === "profile") {
        const res = await fetch(`/api/components/${current.id}/profile`);
        const json = await res.json();
        cache[key] = json.success ? json.markdown : json.message;
    } else if (!cache[key]) {
        const res = await fetch(`/api/components/${current.id}/export?format=${tab}`);
        const json = await res.json();
        cache[key] = json.success ? json.code : json.message;
    }
    if (current.tab === tab) codeEl.textContent = cache[key];
}

/** Opens the export / history dialog for one item (a page or component of the project) on a tab. */
export function openItemDialog(item, tab = "react") {
    current = { id: item.id, tab };
    document.getElementById("libModalTitle").textContent = `${item.title}  ·  v${item.version}`;
    modal.showModal();
    showTab(tab);
}

tabsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) showTab(b.dataset.tab);
});
historyEl.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-restore]");
    if (!b) return;
    if (!confirm(`Restore v${b.dataset.restore}? The current version is kept in history.`)) return;
    const res = await fetch(`/api/components/${current.id}/versions/${b.dataset.restore}/restore`, { method: "POST" });
    const json = await res.json();
    if (json.success) location.reload();
    else alert(json.message);
});
copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(codeEl.textContent);
    copyBtn.textContent = "Copied";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
});
document.getElementById("libModalClose").addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });


const send = async (method, url, body) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "That did not work");
    return json;
};
/** Moves an item to another project. Resolves when saved; rejects with the reason. */
export const moveItem = (item, projectId) => send("PUT", `/api/components/${item.id}`, { project: projectId });
/** Whether AI generation may use the item as a style reference. */
export const setReference = (item, on) => send("PUT", `/api/components/${item.id}`, { useAsReference: on });
/** Deletes an item after asking. Resolves true when it is gone. */
export async function deleteItem(item) {
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return false;
    await send("DELETE", `/api/components/${item.id}`);
    return true;
}
