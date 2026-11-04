import { $, S } from "./base.js";
import { cmd } from "./frame-messages.js";
import { RUNG_NAMES, SCOPES } from "@windcraft/core/intent.js";

// ── Where did that edit land? ──────────────────────────────────────────────────────────────────────────────────────────
// A drag, resize or move is written for the device being edited (intent.js). Right after one, a small bar over the canvas says so
// and offers the other two scopes in one click. The choice sticks for the next edits. It goes away on its own, and if anything else
// was changed in the meantime it goes away rather than undo that.

const KEY = "wc:scope";
/** The scope edits are written for: "device" (this size and up), "only" (only this size) or "all" (every size). */
export function scopeMode() {
    try { const v = localStorage.getItem(KEY); if (SCOPES.includes(v)) return v; } catch { /* private window */ }
    return "device";
}
const remember = (m) => { try { localStorage.setItem(KEY, m); } catch { /* private window */ } };

let bar = null, timer = 0, stamp = null, wired = false;
const hide = () => { clearTimeout(timer); if (bar) bar.style.display = "none"; };

function ensureBar() {
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "scopeBar";
    bar.className = "absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-neutral-900 py-1 pl-3 pr-1 text-[11px] text-white shadow-[0_2px_10px_rgba(0,0,0,.25)]";
    bar.style.display = "none";
    $("canvasHint").parentElement.appendChild(bar);
    return bar;
}

/**
 * `items`: the gesture as it came from the frame; `out`: what compileGesture made of it; `compile(items, mode)`: the same for another scope.
 * Nothing is shown when nothing became a class for a device (a new shape, a value that stays CSS).
 */
export function offerScope(items, out, compile) {
    hide();
    const shown = out.filter((r) => !items[out.indexOf(r)].made && !r.structural && Object.keys(r.tokens).length);
    if (!shown.length) return;
    const scope = shown[0].scope;
    if (scope.picked) return; // the person chose the screen in the panel: nothing to offer
    const el = ensureBar();
    const names = RUNG_NAMES[scope.rung];
    const mode = scope.mode;
    const label = (m) => (m === "device" ? (scope.rung ? `${names} and up` : "All sizes") : m === "only" ? `Only ${names}` : "All sizes");
    // on Mobile "this size and up" is every size, so it is not offered twice
    const current = !scope.rung && mode === "device" ? "all" : mode;
    const modes = scope.rung ? SCOPES : ["all", "only"];
    el.innerHTML = `<span class="text-neutral-300">Applied to</span>` + modes.map((m) => `<button type="button" data-scope="${m}" class="rounded-full px-2.5 py-1 font-medium ${m === current ? "bg-white text-neutral-900" : "text-neutral-300 hover:text-white"}">${label(m)}</button>`).join("");
    el.style.display = "flex";
    el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        const next = b.dataset.scope;
        if (stamp !== null && S.history[S.hIndex] !== stamp) return hide(); // something else changed since: not undone by this
        remember(next);
        compile(items, next).forEach((r, i) => { if (r.classes !== out[i].classes) cmd({ cmd: "setClasses", path: r.path, value: r.classes }, "scope"); });
        hide();
    }));
    stamp = null;
    setTimeout(() => { stamp = S.history[S.hIndex]; }, 700); // the edit has landed in the history by then
    timer = setTimeout(hide, 9000);
    if (!wired) { wired = true; document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); }); }
}
