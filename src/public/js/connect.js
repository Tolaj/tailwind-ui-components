const tokenEnv = "TAILWIND_LIBRARY_TOKEN";

document.getElementById("genTokenBtn").addEventListener("click", async () => {
    if (!confirm("Generate a new token? Any previous token stops working.")) return;
    const res = await fetch("/users/api-token", { method: "POST" });
    const json = await res.json();
    if (!json.success) return alert(json.message || "Could not create token");
    document.getElementById("tokenCmd").textContent = `export ${tokenEnv}=${json.token}`;
    document.getElementById("tokenBox").classList.remove("hidden");
});

document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy-target]");
    if (!btn) return;
    await navigator.clipboard.writeText(document.getElementById(btn.dataset.copyTarget).textContent);
    const label = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = label), 1200);
});

document.addEventListener("click", async (e) => {
    const figmaBtn = e.target.closest("[data-revoke-figma]");
    if (figmaBtn) {
        if (!confirm("Sign the Figma plugin out? It will need to sign in again.")) return;
        const res = await fetch(`/connect/figma/${encodeURIComponent(figmaBtn.dataset.revokeFigma)}/revoke`, { method: "POST" });
        if ((await res.json()).success) location.reload();
        return;
    }
    const btn = e.target.closest("[data-revoke]");
    if (!btn) return;
    if (!confirm("Disconnect this app? It will lose access immediately.")) return;
    const res = await fetch(`/connect/apps/${encodeURIComponent(btn.dataset.revoke)}/revoke`, { method: "POST" });
    if ((await res.json()).success) location.reload();
});

document.getElementById("checkBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const list = document.getElementById("checkList");
    btn.disabled = true;
    btn.textContent = "Testing...";
    list.classList.remove("hidden");
    list.innerHTML = '<li class="text-gray-500">Checking your server...</li>';
    try {
        const res = await fetch("/connect/check");
        const json = await res.json();
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
