import { $, send } from "./base.js";
import { fitLayouts } from "@windcraft/core/layout-infer.js";

// ── "These line up": offer the layout ─────────────────────────────────────────────────────────────────────────────────
// After an absolutely placed element is dropped among others, the frame sends where they all are (agent.js layoutHint). If a row,
// column or grid explains them (all, or all but the one just dropped, which would settle into its place), a bar over the canvas
// says so in a few words and applies it with one click: the box becomes the layout, the children stop being absolute, for every size.

let bar = null, timer = 0, wired = false;
const hide = () => { clearTimeout(timer); if (bar) bar.style.display = "none"; };

function ensureBar() {
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "layoutBar";
    bar.className = "absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-neutral-900 py-1 pl-3 pr-1 text-[11px] text-white shadow-[0_2px_10px_rgba(0,0,0,.25)]";
    bar.style.display = "none";
    $("canvasHint").parentElement.appendChild(bar);
    return bar;
}

const WORDS = {
    justify: { center: "centered", end: "to the end", between: "spread out", around: "spread around", evenly: "spread evenly" },
    items: { start: "top-aligned", center: "middle-aligned", end: "bottom-aligned" },
};
/** A layout in a few words: "Row · gap 16 · centered". */
export function describeLayout(L) {
    const head = L.kind === "grid" ? `Grid, ${L.cols} columns` : L.kind === "col" ? "Column" : "Row";
    const parts = [head];
    if (L.kind === "grid") { if (L.gapX || L.gapY) parts.push(L.gapX === L.gapY ? `gap ${L.gapX}` : `gap ${L.gapX} × ${L.gapY}`); }
    else {
        if (L.gap) parts.push(`gap ${L.gap}`);
        if (WORDS.justify[L.justify]) parts.push(WORDS.justify[L.justify]);
        if (WORDS.items[L.items]) parts.push(L.kind === "col" ? WORDS.items[L.items].replace("top", "left").replace("bottom", "right").replace("middle", "centered") : WORDS.items[L.items]);
        if (L.push !== undefined && L.push !== null) parts.push("last ones pushed to the end");
    }
    return parts.join(" · ");
}

/** `m`: { container, box, kids: [{ path, x, y, w, h }] } from the frame. */
export function suggestLayout(m) {
    hide();
    const best = fitLayouts(m.box, m.kids, { tol: 1.5, drag: 24 })[0];
    if (!best) return;
    const scope = $("scopeBar"); // the layout is for every size: the "which size" bar has nothing to add
    if (scope) scope.style.display = "none";
    const el = ensureBar();
    const moved = best.outlier !== null ? ` · settles one ${Math.round(Math.hypot(best.snap.x - m.kids[best.outlier].x, best.snap.y - m.kids[best.outlier].y))}px` : "";
    el.innerHTML = `<span class="text-neutral-300">These line up:</span><span class="font-medium">${describeLayout(best)}${moved}</span>` +
        `<button type="button" data-do class="rounded-full bg-white px-2.5 py-1 font-medium text-neutral-900">Make it a layout</button>` +
        `<button type="button" data-no class="rounded-full px-2.5 py-1 text-neutral-300 hover:text-white">Not now</button>`;
    el.style.display = "flex";
    el.querySelector("[data-no]").addEventListener("click", hide);
    el.querySelector("[data-do]").addEventListener("click", () => {
        hide();
        send({ cmd: "applyLayout", container: m.container, kids: m.kids.map((k) => k.path), layout: best });
    });
    timer = setTimeout(hide, 12000);
    if (!wired) { wired = true; document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); }); }
}
