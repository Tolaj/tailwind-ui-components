import { $ } from "./base.js";
import { layout } from "./plane.js";

// ── Side panels: drag the edge to widen them (never narrower than they start); the width is remembered, a double-click resets it ─────────────
const MIN = 240;
const maxWidth = () => Math.max(MIN, Math.min(640, Math.round(innerWidth * 0.45)));

function resizable(panel, side, key) {
    panel.classList.add("relative");
    const handle = document.createElement("div");
    handle.className = `rz ${side}`;
    handle.title = "Drag to resize, double-click to reset";
    panel.append(handle);
    const set = (w) => { panel.style.width = `${Math.round(Math.min(maxWidth(), Math.max(MIN, w)))}px`; };
    try { const w = Number(localStorage.getItem(key)); if (w) set(w); } catch { /* storage is optional */ }
    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        drag = { x: e.clientX, w: panel.offsetWidth };
        handle.setPointerCapture(e.pointerId); // keeps the drag over the design's iframe too
        handle.classList.add("on");
        document.body.style.cursor = "col-resize";
    });
    handle.addEventListener("pointermove", (e) => {
        if (!drag) return;
        set(drag.w + (side === "l" ? e.clientX - drag.x : drag.x - e.clientX)); // the left panel grows to the right, the right one to the left
        layout();
    });
    const end = (e) => {
        if (!drag) return;
        drag = null;
        handle.classList.remove("on");
        document.body.style.cursor = "";
        try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        try { localStorage.setItem(key, String(panel.offsetWidth)); } catch { /* storage is optional */ }
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("lostpointercapture", end);
    handle.addEventListener("dblclick", () => { set(MIN); try { localStorage.removeItem(key); } catch { /* storage is optional */ } layout(); });
}

/** Registers this part's listeners (called once, in order, by editor.js). */
export function init() {
    resizable($("leftPanel"), "l", "wc:leftW");
    resizable($("panel"), "r", "wc:panelW");
}
