const $ = (id) => document.getElementById(id);
const post = (url, method = "POST") => fetch(url, { method }).then((r) => r.json());

// ── tool tabs ──
const tabs = [...document.querySelectorAll("[data-tool]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const show = (tool) => {
    tabs.forEach((t) => { const on = t.dataset.tool === tool; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", on); });
    panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== tool));
    try { localStorage.setItem("wc:connectTool", tool); } catch {}
};
tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tool)));
let saved = "claude-web";
try { saved = localStorage.getItem("wc:connectTool") || saved; } catch {}
show(tabs.some((t) => t.dataset.tool === saved) ? saved : "claude-web");

// ── access token ──
$("genTokenBtn").addEventListener("click", async (e) => {
    const regen = e.currentTarget.textContent.trim() === "Regenerate";
    if (regen && !confirm("Regenerate the token? The current one stops working at once.")) return;
    const json = await post("/users/api-token");
    if (!json.success) return alert(json.message || "Could not create the token");
    $("tokenValue").textContent = json.token;
    $("tokenBox").classList.remove("hidden");
    e.currentTarget.textContent = "Regenerate";
});
$("revokeTokenBtn")?.addEventListener("click", async () => {
    if (!confirm("Revoke the token? Tools using it lose access at once.")) return;
    const json = await post("/users/api-token", "DELETE");
    if (json.success) location.reload(); else alert(json.message || "Could not revoke the token");
});

// ── copy ──
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy-target]");
    if (!btn) return;
    await navigator.clipboard.writeText($(btn.dataset.copyTarget).textContent);
    const label = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = label), 1200);
});

// ── disconnect ──
document.addEventListener("click", async (e) => {
    const figmaBtn = e.target.closest("[data-revoke-figma]");
    if (figmaBtn) {
        if (!confirm("Sign the Figma plugin out? It will need to sign in again.")) return;
        if ((await post(`/connect/figma/${encodeURIComponent(figmaBtn.dataset.revokeFigma)}/revoke`)).success) location.reload();
        return;
    }
    const btn = e.target.closest("[data-revoke]");
    if (!btn) return;
    if (!confirm("Disconnect this app? It will lose access immediately.")) return;
    if ((await post(`/connect/apps/${encodeURIComponent(btn.dataset.revoke)}/revoke`)).success) location.reload();
});

// ── connection test ──
$("checkBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const list = $("checkList");
    btn.disabled = true;
    btn.textContent = "Testing...";
    list.classList.remove("hidden");
    list.innerHTML = '<li class="text-gray-500">Checking your server...</li>';
    try {
        const json = await (await fetch("/connect/check")).json();
        const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
        list.innerHTML =
            `<li class="font-medium ${json.allOk ? "text-green-700" : "text-red-700"}">${json.allOk ? "All checks passed. Claude can connect." : "Some checks failed."} <span class="font-normal text-gray-500">${esc(json.base)}</span></li>` +
            json.checks.map((c) => `<li class="flex gap-2"><span class="${c.ok ? "text-green-700" : "text-red-700"} font-semibold">${c.ok ? "✓" : "✗"}</span><span><span class="text-gray-900">${esc(c.label)}</span>${c.detail ? ` <span class="text-gray-500">${esc(c.detail)}</span>` : ""}${c.fix ? `<br><span class="text-amber-800">${esc(c.fix)}</span>` : ""}</span></li>`).join("");
    } catch (err) {
        list.innerHTML = `<li class="text-red-700">The test could not run: ${err.message}</li>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "Run test";
    }
});
