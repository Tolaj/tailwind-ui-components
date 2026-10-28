const showToast = (message, type = "info") => {
  const authToast = document.getElementById("auth-toast");
  const toast = document.createElement("div");
  toast.className =
    "px-5 py-3 rounded-lg shadow-md text-white text-sm flex items-center justify-between gap-4 animate-slide-in";

  if (type === "success") toast.classList.add("bg-green-500");
  else if (type === "error") toast.classList.add("bg-red-500");
  else toast.classList.add("bg-gray-700");

  const span = document.createElement("span");
  span.textContent = message;
  const btn = document.createElement("button");
  btn.className = "text-white text-lg leading-none focus:outline-none";
  btn.textContent = "×";
  btn.addEventListener("click", () => toast.remove());
  toast.appendChild(span);
  toast.appendChild(btn);

  authToast.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 300);
  }, 20000);
}

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
  .animate-slide-in {
    animation: slideIn 0.4s ease forwards;
  }
  .animate-slide-out {
    animation: slideOut 0.3s ease forwards;
  }
`;

document.head.appendChild(style);

// ── Save into a project / open in the editor ──────────────────────────────────
// Both start the same way: choose a project (or name a new one). Save puts a private copy there; Open in editor then opens that copy.
const LAST_PROJECT = "wc:lastProject";
let projectCard = null;
function closeProjectCard() { if (projectCard) { projectCard.remove(); projectCard = null; } }
document.addEventListener("click", (e) => { if (projectCard && !projectCard.contains(e.target) && !e.target.closest("[data-card-action], [data-report]")) closeProjectCard(); });

async function chooseProject(id, mode, btn) {
  if (!btn.dataset.signedIn) {
    const back = new URL(location.href);
    back.searchParams.set(mode === "edit" ? "edit" : "save", id);
    location.href = `/auth/sign-in?returnTo=${encodeURIComponent(back.pathname + back.search)}`;
    return;
  }
  closeProjectCard();
  let projects = [];
  try { projects = (await (await fetch("/api/projects")).json()).data || []; } catch { /* no list: a new project can still be named */ }
  let last = ""; try { last = localStorage.getItem(LAST_PROJECT) || ""; } catch { /* storage is optional */ }
  const pick = projects.find((p) => p.id === last) || projects.find((p) => p.active) || projects[0];
  const card = document.createElement("div");
  card.className = "absolute z-50 w-72 rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-[0_8px_28px_rgba(0,0,0,0.16)]";
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  card.innerHTML = `<p class="mb-2 font-semibold text-gray-900">${mode === "edit" ? "Open in editor, in which project?" : "Save to which project?"}</p>
    ${projects.length ? `<select class="h-9 w-full rounded-md border border-gray-300 px-2 text-sm">${projects.map((p) => `<option value="${p.id}" ${pick && p.id === pick.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}<option value="__new__">New project…</option></select>` : ""}
    <input type="text" maxlength="80" placeholder="Name the new project" class="${projects.length ? "hidden " : ""}mt-2 h-9 w-full rounded-md border border-gray-300 px-2 text-sm">
    <p class="mt-2 hidden text-xs text-red-700" data-err></p>
    <div class="mt-3 flex justify-end gap-2"><button type="button" data-cancel class="h-8 rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-800 hover:bg-gray-50">Cancel</button><button type="button" data-go class="h-8 rounded-md bg-black px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">${mode === "edit" ? "Open in editor" : "Save"}</button></div>`;
  const r = btn.getBoundingClientRect();
  card.style.top = `${window.scrollY + r.bottom + 6}px`;
  card.style.left = `${Math.max(8, Math.min(window.scrollX + r.right - 288, window.scrollX + document.documentElement.clientWidth - 296))}px`;
  document.body.appendChild(card);
  projectCard = card;
  const sel = card.querySelector("select"), name = card.querySelector("input"), err = card.querySelector("[data-err]"), go = card.querySelector("[data-go]");
  if (sel) sel.addEventListener("change", () => { name.classList.toggle("hidden", sel.value !== "__new__"); if (sel.value === "__new__") name.focus(); });
  card.querySelector("[data-cancel]").addEventListener("click", closeProjectCard);
  go.addEventListener("click", async () => {
    const body = !sel || sel.value === "__new__" ? { projectName: name.value.trim() } : { project: sel.value };
    if (body.projectName === "") { err.textContent = "Name the project first."; err.classList.remove("hidden"); return; }
    go.disabled = true; err.classList.add("hidden");
    try {
      const res = await fetch(`/api/components/${id}/fork`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Could not save it");
      try { localStorage.setItem(LAST_PROJECT, json.project.id); } catch { /* storage is optional */ }
      if (mode === "edit") { location.href = `/design/${json.id}`; return; }
      closeProjectCard();
      btn.textContent = "Saved";
      btn.title = `Saved in ${json.project.name}: open the project`;
      btn.onclick = () => (location.href = `/projects/${json.project.id}`);
    } catch (e2) {
      err.textContent = e2.message; err.classList.remove("hidden"); go.disabled = false;
    }
  });
}
// back from signing in with ?save=<id> or ?edit=<id>: carry on where the person left off
document.addEventListener("DOMContentLoaded", () => {
  const url = new URL(location.href);
  for (const mode of ["save", "edit"]) {
    const id = url.searchParams.get(mode);
    if (!id) continue;
    url.searchParams.delete(mode);
    history.replaceState({}, "", url.pathname + url.search);
    const btn = document.querySelector(`[data-card-action="${mode}"][data-card-id="${CSS.escape(id)}"]`);
    if (btn && btn.dataset.signedIn) chooseProject(id, mode, btn);
    break;
  }
});

// ── Likes ────────────────────────────────────────────────────────────────────
function paintLike(btn, liked, count) {
  btn.dataset.liked = liked ? "1" : "";
  btn.setAttribute("aria-pressed", String(liked));
  btn.classList.toggle("is-liked", liked);
  btn.classList.toggle("text-red-600", liked);
  btn.querySelector(".like-heart").setAttribute("fill", liked ? "currentColor" : "none");
  btn.querySelector(".like-count").textContent = String(count);
}
async function sendLike(id, btn, liked) {
  const res = await fetch(`/api/components/${id}/like`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(typeof liked === "boolean" ? { liked } : {}),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Could not like it");
  paintLike(btn, json.liked, json.likes);
}
/** The Like button. Signed out: sign in first, and come back to this page, where the like is counted (see below). */
async function toggleLike(id, btn) {
  if (!btn.dataset.signedIn) {
    const back = new URL(location.href);
    back.searchParams.set("like", id);
    location.href = `/auth/sign-in?returnTo=${encodeURIComponent(back.pathname + back.search)}`;
    return;
  }
  btn.disabled = true;
  try { await sendLike(id, btn); } catch (err) { alert(err.message); } finally { btn.disabled = false; }
}
// back from signing in with ?like=<id>: count that like once, then clean the address
document.addEventListener("DOMContentLoaded", async () => {
  const url = new URL(location.href);
  const id = url.searchParams.get("like");
  if (!id) return;
  url.searchParams.delete("like");
  history.replaceState({}, "", url.pathname + url.search);
  const btn = document.querySelector(`[data-like="${CSS.escape(id)}"]`);
  if (btn && btn.dataset.signedIn && !btn.dataset.liked) { try { await sendLike(id, btn, true); } catch { /* the like button still works by hand */ } }
});

// ── New project: made at once, and the editor opens on a blank page with the code beside it ──────────────────
// (the name is "Untitled project" until it is renamed on the project page)
async function newProject(btn) {
  if (btn) btn.disabled = true;
  try {
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Untitled project" }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Could not create the project");
    location.href = `/design/new?project=${json.data.id}&kind=component`;
  } catch (err) {
    alert(err.message);
    if (btn) btn.disabled = false;
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
// A flag next to Like. It tells the site owners (the design stays visible until they decide). Signed out: sign in, then carry on.
async function reportDesign(id, btn) {
  if (!btn.dataset.signedIn) {
    const back = new URL(location.href);
    back.searchParams.set("report", id);
    location.href = `/auth/sign-in?returnTo=${encodeURIComponent(back.pathname + back.search)}`;
    return;
  }
  closeProjectCard();
  const card = document.createElement("div");
  card.className = "absolute z-50 w-72 rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-[0_8px_28px_rgba(0,0,0,0.16)]";
  card.innerHTML = `<p class="mb-2 font-semibold text-gray-900">Report this design</p>
    <select class="h-9 w-full rounded-md border border-gray-300 px-2 text-sm"><option value="inappropriate">Inappropriate or rude</option><option value="broken">Broken or doesn't work</option><option value="copied">Copied from someone else</option><option value="other">Something else</option></select>
    <textarea rows="2" maxlength="300" placeholder="Anything we should know? (optional)" class="mt-2 w-full rounded-md border border-gray-300 p-2 text-sm"></textarea>
    <p class="mt-1 hidden text-xs text-red-700" data-err></p>
    <div class="mt-2 flex justify-end gap-2"><button type="button" data-cancel class="h-8 rounded-md border border-gray-300 px-3 text-xs font-medium hover:bg-gray-50">Cancel</button><button type="button" data-go class="h-8 rounded-md bg-black px-3 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">Send report</button></div>`;
  const r = btn.getBoundingClientRect();
  card.style.top = `${window.scrollY + r.bottom + 6}px`;
  card.style.left = `${Math.max(8, Math.min(window.scrollX + r.right - 288, window.scrollX + document.documentElement.clientWidth - 296))}px`;
  document.body.appendChild(card);
  projectCard = card; // closes like the project card: on a click elsewhere
  const err = card.querySelector("[data-err]"), go = card.querySelector("[data-go]");
  card.querySelector("[data-cancel]").addEventListener("click", closeProjectCard);
  go.addEventListener("click", async () => {
    go.disabled = true;
    try {
      const res = await fetch(`/api/components/${id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: card.querySelector("select").value, note: card.querySelector("textarea").value }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Could not send the report");
      closeProjectCard();
      btn.disabled = true;
      btn.title = "Reported, thank you";
      btn.classList.add("text-red-600");
    } catch (e2) { err.textContent = e2.message; err.classList.remove("hidden"); go.disabled = false; }
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const url = new URL(location.href);
  const id = url.searchParams.get("report");
  if (!id) return;
  url.searchParams.delete("report");
  history.replaceState({}, "", url.pathname + url.search);
  const btn = document.querySelector(`[data-report="${CSS.escape(id)}"]`);
  if (btn && btn.dataset.signedIn) reportDesign(id, btn);
});
