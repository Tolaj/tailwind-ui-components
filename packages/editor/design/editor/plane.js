import { computeLayout } from "@windcraft/core/board-layout.js";
import { $, DEFAULT_W, S, data, frame, send } from "./base.js";
import { docs, wraps } from "./designs.js";
import { placeFloat, renderFloat, renderFrameSel } from "./frame-handles.js";
import { renderInspector } from "./inspector.js";

// ── The plane: every design in the project on one infinite surface ───────────
const MIN_Z = 0.02, MAX_Z = 256; // 2% to 25600%
const GRID_FROM = 4; // the pixel grid appears at 400%
export const view = { x: 0, y: 0, z: 1 };
export const canvas = $("canvas");

export const MIN_H = 720;
// a frame has its own width, and a height that follows its content unless it was set by hand
export const widthOf = (d) => (d.board && d.board.w) || DEFAULT_W;
export const curWidth = () => widthOf(docs.get(S.curKey));
export const heightOfDoc = (d) => (d.board && d.board.h) || (d.key === S.curKey ? Math.max(MIN_H, S.frameHeight) : Math.max(MIN_H, d.height || 0));
export const canvasSize = () => [canvas.clientWidth, canvas.clientHeight];

/** The group a design belongs to in its project ("Public site"), or "". */
export const pageGroupOf = (key) => ((key === S.curKey ? data.group : (docs.get(key) || {}).meta?.group) || "");

export function positions() {
    return computeLayout([...docs.values()].map((d) => ({ id: d.key, kind: d.kind, parent: d.parent, group: pageGroupOf(d.key), board: d.board })), { frameW: DEFAULT_W, widthOf: (it) => widthOf(docs.get(it.id)), heightOf: (it) => heightOfDoc(docs.get(it.id)) });
}

export function applyView() {
    $("plane").style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
    $("plane").style.setProperty("--iz", String(1 / view.z));
    // dot grid: always about 16-32 screen pixels apart (the spacing doubles or halves as you zoom), and whole pixels so the dots stay crisp
    let dot = 24 * view.z;
    while (dot < 16) dot *= 2;
    while (dot >= 32) dot /= 2;
    dot = Math.round(dot);
    canvas.style.backgroundSize = `${dot}px ${dot}px`;
    canvas.style.backgroundPosition = `${Math.round(view.x)}px ${Math.round(view.y)}px`;
    updatePixelGrid();
    if (S.sentZoom !== view.z) { S.sentZoom = view.z; send({ cmd: "view", zoom: view.z }); }
    renderFrameSel(); // the selection is in screen pixels, so it is redrawn on every pan and zoom
    syncZoomSel();
    placeFloat();
}

/** From 400% every design pixel gets a hairline, over the designs and under the selection, like Figma's pixel grid. */
function updatePixelGrid() {
    const g = $("pgrid");
    if (view.z < GRID_FROM) return g.classList.add("hidden");
    g.classList.remove("hidden");
    // cover just what is on screen, in the plane's own units, snapped to whole pixels
    const x0 = Math.floor(-view.x / view.z), y0 = Math.floor(-view.y / view.z);
    Object.assign(g.style, { left: `${x0}px`, top: `${y0}px`, width: `${Math.ceil(canvas.clientWidth / view.z) + 2}px`, height: `${Math.ceil(canvas.clientHeight / view.z) + 2}px` });
}

function syncZoomSel() {
    const sel = $("zoomSel");
    const hit = [...sel.options].find((o) => Number(o.value) && Math.abs(Number(o.value) - view.z) < 0.005);
    if (hit) { sel.value = hit.value; return; }
    let custom = [...sel.options].find((o) => o.value === "custom");
    if (!custom) { custom = new Option("", "custom"); sel.add(custom); }
    custom.textContent = `${Math.round(view.z * 100)}%`;
    sel.value = "custom";
    placePills(); // the zoom label changes the right group's width
}

export function zoomAt(factor, cx, cy) {
    const z = Math.min(MAX_Z, Math.max(MIN_Z, view.z * factor));
    const k = z / view.z;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.z = z;
    applyView();
}

export function fitTo(keys, maxZ = 1) {
    const pos = positions();
    const list = keys.filter((k) => pos[k]);
    if (!list.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach((k) => {
        const p = pos[k];
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y - 30);
        x1 = Math.max(x1, p.x + widthOf(docs.get(k))); y1 = Math.max(y1, p.y + heightOfDoc(docs.get(k)));
    });
    const [W, H] = canvasSize();
    const z = Math.min(maxZ, Math.max(MIN_Z, Math.min((W - 120) / (x1 - x0), (H - 120) / (y1 - y0))));
    view.z = z;
    view.x = (W - (x1 - x0) * z) / 2 - x0 * z;
    view.y = (H - (y1 - y0) * z) / 2 - y0 * z;
    applyView();
}

/** Sizes and places every frame. The live frame and the previews all follow the same positions. */
export function layout() {
    if (!S.selected) setTimeout(renderInspector, 0); // the page panel (shown while no element is selected) follows its size and position
    const pos = positions();
    docs.forEach((d, key) => {
        const en = wraps.get(key);
        const p = pos[key];
        if (!en || !p) return;
        const h = heightOfDoc(d);
        Object.assign(en.wrap.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${widthOf(d)}px`, height: `${h}px` });
        // the live iframe never changes parent (that would reload it); it just sits over the active frame (over the page being
        // left, while a switch is under way)
        if (!S.switching) S.frameAt = S.curKey;
        if (key === S.frameAt) Object.assign(frame.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${widthOf(d)}px`, height: `${h}px` });
    });
    placePills();
    applyView();
    renderFloat();
}

/** The two tool groups share the top row; when the canvas is too narrow for both side by side, the right one drops under the left. */
export function placePills() {
    const left = $("pillL"), right = $("pillR");
    right.style.top = "";
    left.style.maxWidth = "none";
    left.classList.remove("tight");
    const natural = left.offsetWidth; // the left group at its full width
    left.style.maxWidth = "calc(100% - 24px)"; // beyond that the design name shrinks...
    if (canvas.clientWidth < natural - 100) left.classList.add("tight"); // ...and finally disappears
    if (canvas.clientWidth < natural + right.offsetWidth + 12 * 3) right.style.top = "60px";
}

export function handleWheel({ dx, dy, zoomKey, cx, cy }) {
    S.viewTouched = true;
    if (zoomKey) zoomAt(Math.exp(-dy * 0.01), cx, cy);
    else { view.x -= dx; view.y -= dy; applyView(); }
}
