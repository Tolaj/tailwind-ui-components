import { $, send } from "./base.js";
import { fitLayouts, judgeLayouts } from "@windcraft/core/layout-infer.js";
import { step } from "./docs.js";
import { curWidth } from "./plane.js";

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
    const head = L.kind === "grid" ? `Grid, ${L.cols} columns${L.fit ? " sized to content" : ""}` : L.kind === "col" ? "Column" : "Row";
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
    if (m.flow === "probe") return probe(m);
    hide();
    if (m.flow) return restructure(m);
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

// ── A child of a row, column or grid dropped somewhere else in it ───────────────────────────────────────────────────────
// The drop says where everything should end up. Of the layouts that put every other child where it is and this one within reach of
// where it was let go, those that are not the box's present layout are the ways to read the drop; the cheapest is applied, the
// others are one click away, and Undo goes back to the exact position. None fits: the drop stays an exact offset.
const KIND = { "flex row": "row", "flex column": "col", grid: "grid" };
function readings(m) {
    const now = KIND[m.current];
    const seen = new Set();
    const fits = fitLayouts(m.box, m.kids, { tol: 1.5, drag: 40 }).filter((c) => (c.outlier === null || c.outlier === m.moved) && c.kind !== now);
    // among the readings of the drop, those that keep it true on more of the devices come first, then the cheapest
    // a drop is imprecise: the cleanest structure within reach wins over one that happens to match the exact pixels (an uneven gap)
    return judgeLayouts(fits, m.box, m.kids, { frameW: curWidth() })
        .sort((p, q) => q.survives - p.survives || p.cost - q.cost || p.err - q.err)
        .filter((c) => { const k = `${c.kind}${c.cols || ""}${c.fit ? "f" : ""}${c.justify}${c.items}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 3);
}
/** While the child is still being dragged: the box where the best reading would put it (or nothing, if none fits). */
function probe(m) {
    const best = readings(m)[0];
    const k = m.kids[m.moved];
    if (!best) return send({ cmd: "probeGhost", box: null });
    const at = best.outlier === null ? k : best.snap;
    send({ cmd: "probeGhost", box: { x: at.x, y: at.y, w: k.w, h: k.h }, label: describeLayout(best) });
}
function restructure(m) {
    const options = readings(m);
    if (!options.length) { send({ cmd: "keepOffset" }); return; }
    const apply = (L) => send({ cmd: "applyLayout", container: m.container, kids: m.kids.map((k) => k.path), layout: L, flow: true });
    apply(options[0]);
    showApplied(m, options, 0, apply);
}
function showApplied(m, options, at, apply) {
    const scope = $("scopeBar");
    if (scope) scope.style.display = "none";
    const el = ensureBar();
    const alts = options.map((o, i) => i === at ? "" : `<button type="button" data-alt="${i}" class="rounded-full bg-neutral-700 px-2.5 py-1 hover:bg-neutral-600">${describeLayout(o)}</button>`).join("");
    el.innerHTML = `<span class="text-neutral-300">Made it</span><span class="font-medium">${describeLayout(options[at])}</span><span class="text-neutral-400">holds from ${options[at].need}px</span>${alts ? `<span class="text-neutral-400">or</span>${alts}` : ""}` +
        `<button type="button" data-undo class="rounded-full bg-white px-2.5 py-1 font-medium text-neutral-900">Keep exact position</button>`;
    el.style.display = "flex";
    el.querySelectorAll("[data-alt]").forEach((b) => b.addEventListener("click", () => { const i = Number(b.dataset.alt); apply(options[i]); showApplied(m, options, i, apply); }));
    el.querySelector("[data-undo]").addEventListener("click", () => { hide(); step(-1); });
    clearTimeout(timer);
    timer = setTimeout(hide, 12000);
}
