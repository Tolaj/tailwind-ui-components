// Import designs into this project: drop or choose files (html, zip), or paste; optionally split pages into sections.
// The project page sets window.__PROJECT_ID; the dialog markup is in views/main/project.handlebars.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const importModal = document.getElementById("importModal");
const importInput = document.getElementById("importInput");
const dropZone = document.getElementById("dropZone");
const fileList = document.getElementById("importFiles");
const statusEl = document.getElementById("importStatus");
const goBtn = document.getElementById("importGo");
let pending = [];

const setStatus = (msg, kind = "info") => {
    statusEl.textContent = msg;
    statusEl.className = `text-sm ${kind === "error" ? "text-red-700" : "text-gray-600"}`;
    statusEl.classList.toggle("hidden", !msg);
};

function renderPending() {
    fileList.classList.toggle("hidden", !pending.length);
    fileList.innerHTML = pending
        .map((p, i) => `<li class="flex items-center justify-between px-3 py-1.5"><span class="truncate">${esc(p.name)}</span><button type="button" data-drop="${i}" class="ml-3 text-xs text-gray-500 hover:text-red-700">Remove</button></li>`)
        .join("");
}

/** Reads the .html files inside a zip using the browser's built-in inflate. */
async function readZip(file) {
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("Not a valid zip file");
    let p = dv.getUint32(eocd + 16, true);
    const count = dv.getUint16(eocd + 10, true);
    const out = [];
    for (let n = 0; n < count && dv.getUint32(p, true) === 0x02014b50; n++) {
        const method = dv.getUint16(p + 10, true);
        const compSize = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
        const localOffset = dv.getUint32(p + 42, true);
        const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nameLen));
        p += 46 + nameLen + extraLen + commentLen;
        if (!/\.html?$/i.test(name) || name.startsWith("__MACOSX") || name.endsWith("/")) continue;
        const dataStart = localOffset + 30 + dv.getUint16(localOffset + 26, true) + dv.getUint16(localOffset + 28, true);
        const raw = new Blob([buf.slice(dataStart, dataStart + compSize)]);
        const stream = method === 0 ? raw.stream() : raw.stream().pipeThrough(new DecompressionStream("deflate-raw"));
        out.push({ name: name.split("/").pop(), html: await new Response(stream).text() });
    }
    return out;
}

async function addFiles(files) {
    setStatus("");
    for (const file of files) {
        try {
            if (/\.zip$/i.test(file.name)) pending.push(...(await readZip(file)));
            else if (/\.html?$/i.test(file.name) || file.type === "text/html") pending.push({ name: file.name, html: await file.text() });
            else setStatus(`Skipped ${file.name} (only .html and .zip are supported)`, "error");
        } catch (err) {
            setStatus(`${file.name}: ${err.message}`, "error");
        }
    }
    renderPending();
}

document.getElementById("importBtn").addEventListener("click", () => {
    pending = [];
    renderPending();
    setStatus("");
    document.getElementById("pasteHtml").value = "";
    document.getElementById("pasteTitle").value = "";
    importModal.showModal();
});
["importClose", "importCancel"].forEach((id) => document.getElementById(id).addEventListener("click", () => importModal.close()));
importInput.addEventListener("change", async () => { await addFiles([...importInput.files]); importInput.value = ""; });
fileList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-drop]");
    if (b) { pending.splice(Number(b.dataset.drop), 1); renderPending(); }
});
["dragenter", "dragover"].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("border-gray-900", "bg-gray-50"); }));
["dragleave", "drop"].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("border-gray-900", "bg-gray-50"); }));
dropZone.addEventListener("drop", (e) => addFiles([...e.dataTransfer.files]));

goBtn.addEventListener("click", async () => {
    const items = pending.map((p) => ({
        title: /<title[\s>]/i.test(p.html) ? "" : p.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim(),
        html: p.html,
    }));
    const pasted = document.getElementById("pasteHtml").value.trim();
    if (pasted) items.push({ title: document.getElementById("pasteTitle").value.trim(), html: pasted });
    if (!items.length) return setStatus("Add a file or paste some HTML first.", "error");

    goBtn.disabled = true;
    goBtn.textContent = "Importing...";
    try {
        const res = await fetch("/api/components/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items, split: document.getElementById("splitToggle").checked, tags: "imported", project: window.__PROJECT_ID }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Import failed");
        const okRows = json.results.filter((r) => r.ok);
        const sections = okRows.reduce((n, r) => n + r.sections.length, 0);
        const failed = json.results.filter((r) => !r.ok);
        setStatus(`Imported ${okRows.length} design${okRows.length === 1 ? "" : "s"} and ${sections} section${sections === 1 ? "" : "s"}.${failed.length ? ` ${failed.length} failed: ${failed.map((f) => f.message).join("; ")}` : ""}`, failed.length ? "error" : "info");
        if (okRows.length) setTimeout(() => location.reload(), failed.length ? 2500 : 900);
    } catch (err) {
        setStatus(err.message, "error");
    } finally {
        goBtn.disabled = false;
        goBtn.textContent = "Import";
    }
});

