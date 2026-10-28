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

async function saveToLibrary(id, button) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";
    try {
        const res = await fetch(`/api/components/${id}/fork`, { method: "POST" });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        button.textContent = json.existing ? "Already in library" : "Saved to library";
        button.onclick = () => (location.href = "/library");
        button.title = "Open your library";
    } catch (err) {
        button.textContent = label;
        alert(err.message || "Could not save to library");
    } finally {
        button.disabled = false;
    }
}

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
