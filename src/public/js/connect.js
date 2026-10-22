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
    const btn = e.target.closest("[data-revoke]");
    if (!btn) return;
    if (!confirm("Disconnect this app? It will lose access immediately.")) return;
    const res = await fetch(`/connect/apps/${encodeURIComponent(btn.dataset.revoke)}/revoke`, { method: "POST" });
    if ((await res.json()).success) location.reload();
});
