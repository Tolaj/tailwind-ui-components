// Draws the selection (box, resize handles, rotate zones, radius dots, size label) in the editor, above the frame,
// so the frame's edge never clips it and an element hanging outside the frame keeps its full outline.
// The in-frame agent only describes the selection (boxes in the frame's own coordinates) and runs the gestures.
//
// Everything here is laid out in SCREEN pixels, not inside the zoomed plane. A handle that is 9px must be exactly 9px at
// any zoom: sized in plane units it shrinks to a fraction of a pixel at high zoom, the browser rounds that, and the
// ring vanishes and the circle turns into a blob.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const round = (n) => Math.round(n * 100) / 100;

// The rotate cursor is an arc that wraps around the corner it belongs to (drawn for the bottom-right corner and turned
// a quarter for each of the others), plus however far the element itself is already rotated.
// (These cursor URLs go inside style="..." attributes, so they use single quotes.)
const ARC = '<path d="M19 6A13 13 0 0 1 6 19"/><path d="M15.5 9.5 19 5.5 22.5 9.5"/><path d="M9.5 15.5 5.5 19 9.5 22.5"/>';
const CORNER_TURN = { se: 0, sw: 90, nw: 180, ne: 270 };
const rotateCursor = (deg) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(${Math.round(deg)} 12 12)"><g stroke="#fff" stroke-width="4.2">${ARC}</g><g stroke="#111" stroke-width="1.8">${ARC}</g></g></svg>`;
    return `url('data:image/svg+xml,${encodeURIComponent(svg)}') 12 12, crosshair`;
};

// The radius cursor, like Figma's: the black pointer with a thick white outline and a small corner curve beside it.
// 32px canvas; the hotspot is the pointer's tip.
const POINTER = "M6.5 3.5V22.6l4.6-4.3 3.1 7 3.4-1.5-3.1-6.9h6.6z";
const RADIUS_PATH = '<path d="M21.5 29.5V27a5 5 0 0 1 5-5h2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
export const radiusCursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="${POINTER}" fill="#000" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><g stroke="#fff" stroke-width="4.2">${RADIUS_PATH}</g><g stroke="#000" stroke-width="1.9">${RADIUS_PATH}</g></svg>`;
const radiusCursor = `url('data:image/svg+xml,${encodeURIComponent(radiusCursorSvg)}') 6 3, default`;

const CORNERS = { nw: [0, 0], ne: [1, 0], se: [1, 1], sw: [0, 1] };
export const HANDLE_CURSORS = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

/** Handles for one selected box. W and H are its size on screen. */
function handles(it, W, H, z) {
    const out = [];
    const add = (name, css, cursor, cls = "") => out.push(`<div class="sh ${cls}" data-sh="${name}" style="${css}cursor:${cursor};"></div>`);
    // rotating: the area just outside each corner (under the squares)
    Object.entries(CORNERS).forEach(([name, [fx, fy]]) => {
        const tx = fx ? "-4.5px" : "calc(-100% + 4.5px)";
        const ty = fy ? "-4.5px" : "calc(-100% + 4.5px)";
        add(`rot-${name}`, `left:${fx * 100}%;top:${fy * 100}%;width:24px;height:24px;transform:translate(${tx}, ${ty});`, rotateCursor(CORNER_TURN[name] + it.rot));
    });
    // corner radius: a dot just inside each corner, further in the rounder the corner is (11px from the corner when square)
    if (Math.min(W, H) >= 40) {
        const inset = Math.min(it.r0 * z + 11, Math.min(W, H) / 2);
        Object.entries(CORNERS).forEach(([name, [fx, fy]]) => add(`rad-${name}`, `left:${round(fx ? W - inset : inset)}px;top:${round(fy ? H - inset : inset)}px;transform:translate(-50%, -50%);`, radiusCursor, "sd"));
    }
    // resizing: the whole length of each edge, then a square on each corner
    add("n", "left:0;top:0;width:100%;height:10px;transform:translateY(-50%);", HANDLE_CURSORS.n);
    add("s", "left:0;top:100%;width:100%;height:10px;transform:translateY(-50%);", HANDLE_CURSORS.s);
    add("w", "left:0;top:0;height:100%;width:10px;transform:translateX(-50%);", HANDLE_CURSORS.w);
    add("e", "left:100%;top:0;height:100%;width:10px;transform:translateX(-50%);", HANDLE_CURSORS.e);
    Object.entries(CORNERS).forEach(([name, [fx, fy]]) => add(name, `left:${fx * 100}%;top:${fy * 100}%;transform:translate(-50%, -50%);`, HANDLE_CURSORS[name], "sc"));
    return out.join("");
}

/**
 * The outline of one box as an SVG path: rotated about its centre, with each corner's own radius. A CSS box this big
 * (tens of thousands of pixels at high zoom) silently stops painting its shadow, but a path is clipped, not skipped.
 * It is inset by half the stroke so the line sits inside the box, like the handles expect.
 */
function outline(it, z, ox, oy) {
    const k = 0.75;
    const x = ox + it.x * z + k, y = oy + it.y * z + k, W = Math.max(0, it.w * z - 2 * k), H = Math.max(0, it.h * z - 2 * k);
    let h = it.rh.map((v) => Math.max(0, v * z - k)), v = it.rv.map((r) => Math.max(0, r * z - k)); // tl tr br bl
    // like CSS, shrink every radius together when neighbouring corners would overlap
    const f = Math.min(1, W / ((h[0] + h[1]) || Infinity), W / ((h[3] + h[2]) || Infinity), H / ((v[0] + v[3]) || Infinity), H / ((v[1] + v[2]) || Infinity));
    h = h.map((r) => r * f); v = v.map((r) => r * f);
    const d = `M${round(x + h[0])} ${round(y)}H${round(x + W - h[1])}A${round(h[1])} ${round(v[1])} 0 0 1 ${round(x + W)} ${round(y + v[1])}V${round(y + H - v[2])}A${round(h[2])} ${round(v[2])} 0 0 1 ${round(x + W - h[2])} ${round(y + H)}H${round(x + h[3])}A${round(h[3])} ${round(v[3])} 0 0 1 ${round(x)} ${round(y + H - v[3])}V${round(y + v[0])}A${round(h[0])} ${round(v[0])} 0 0 1 ${round(x + h[0])} ${round(y)}Z`;
    return `<path d="${d}" transform="rotate(${it.rot} ${round(x + W / 2)} ${round(y + H / 2)})" fill="none" stroke="#fff" stroke-width="1.5"/>`;
}

/**
 * Returns { lines, html }: the outlines go in their own layer that inverts what is under it; the handles and label go above it.
 * data: what the agent posted ({ items, handles, label, bbox, at }), in the frame's own coordinates.
 * view: { zoom, ox, oy }: the zoom, and where the frame's top-left corner is on screen (relative to the canvas).
 */
export function selectionHtml(data, { zoom: z, ox, oy }) {
    if (!data || !data.items || !data.items.length) return { lines: "", html: "", label: "" };
    const boxes = data.items.map((it) => {
        const W = it.w * z, H = it.h * z;
        const inner = data.handles && data.items.length === 1 ? handles(it, W, H, z) : "";
        const radius = `${it.rh.map((v) => `${round(v * z)}px`).join(" ")} / ${it.rv.map((v) => `${round(v * z)}px`).join(" ")}`;
        return `<div class="sbox" style="left:${round(ox + it.x * z)}px;top:${round(oy + it.y * z)}px;width:${round(W)}px;height:${round(H)}px;transform:rotate(${it.rot}deg);border-radius:${radius};">${inner}</div>`;
    }).join("");
    // a size label sits under the element; the radius label follows the pointer, like the size label does while resizing
    const label = data.label && data.at
        ? `<div class="slabel pt" style="left:${round(ox + data.at.x * z + 16)}px;top:${round(oy + data.at.y * z + 14)}px;">${esc(data.label)}</div>`
        : data.label && data.bbox
            ? `<div class="slabel" style="left:${round(ox + (data.bbox.x + data.bbox.w / 2) * z)}px;top:${round(oy + (data.bbox.y + data.bbox.h) * z + 8)}px;">${esc(data.label)}</div>`
            : "";
    const lines = `<svg class="sout">${data.items.map((it) => outline(it, z, ox, oy)).join("")}</svg>`;
    return { lines, html: boxes, label };
}
