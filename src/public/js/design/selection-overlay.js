// Draws the selection (box, resize handles, rotate zones, radius dots, size label) in the editor, above the frame,
// so the frame's edge never clips it and an element hanging outside the frame keeps its full outline.
// The in-frame agent only describes the selection (boxes in the frame's own coordinates) and runs the gestures.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const round = (n) => Math.round(n * 100) / 100;

// The rotate cursor is an arc that wraps around the corner it belongs to (drawn for the bottom-right corner and turned
// a quarter for each of the others), plus however far the element itself is already rotated.
const ARC = '<path d="M19 6A13 13 0 0 1 6 19"/><path d="M15.5 9.5 19 5.5 22.5 9.5"/><path d="M9.5 15.5 5.5 19 9.5 22.5"/>';
const CORNER_TURN = { se: 0, sw: 90, nw: 180, ne: 270 };
const rotateCursor = (deg) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(${Math.round(deg)} 12 12)"><g stroke="#fff" stroke-width="4.2">${ARC}</g><g stroke="#111" stroke-width="1.8">${ARC}</g></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`;
};

const CORNERS = { nw: [0, 0], ne: [1, 0], se: [1, 1], sw: [0, 1] };
export const HANDLE_CURSORS = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

/** Sizes use var(--iz) (1 / zoom, set on the plane) so handles keep their on-screen size at any zoom. */
function handles(it, zoom) {
    const iz = 1 / zoom;
    const out = [];
    const add = (name, css, cursor, cls = "") => out.push(`<div class="sh ${cls}" data-sh="${name}" style="${css}cursor:${cursor};"></div>`);
    // rotating: the area just outside each corner (under the squares)
    Object.entries(CORNERS).forEach(([name, [fx, fy]]) => {
        const tx = fx ? "calc(-4.5px * var(--iz))" : "calc(-100% + 4.5px * var(--iz))";
        const ty = fy ? "calc(-4.5px * var(--iz))" : "calc(-100% + 4.5px * var(--iz))";
        add(`rot-${name}`, `left:${fx * 100}%;top:${fy * 100}%;width:calc(24px * var(--iz));height:calc(24px * var(--iz));transform:translate(${tx}, ${ty});`, rotateCursor(CORNER_TURN[name] + it.rot));
    });
    // corner radius: a dot just inside each corner, further in the rounder the corner is
    if (Math.min(it.w, it.h) * zoom >= 40) {
        const inset = Math.min(it.r0 + 11 * iz, Math.min(it.w, it.h) / 2);
        Object.entries(CORNERS).forEach(([name, [fx, fy]]) => add(`rad-${name}`, `left:${round(fx ? it.w - inset : inset)}px;top:${round(fy ? it.h - inset : inset)}px;transform:translate(-50%, -50%);`, "default", "sd"));
    }
    // resizing: the whole length of each edge, then a square on each corner
    const edge = "calc(10px * var(--iz))";
    add("n", `left:0;top:0;width:100%;height:${edge};transform:translateY(-50%);`, HANDLE_CURSORS.n);
    add("s", `left:0;top:100%;width:100%;height:${edge};transform:translateY(-50%);`, HANDLE_CURSORS.s);
    add("w", `left:0;top:0;height:100%;width:${edge};transform:translateX(-50%);`, HANDLE_CURSORS.w);
    add("e", `left:100%;top:0;height:100%;width:${edge};transform:translateX(-50%);`, HANDLE_CURSORS.e);
    Object.entries(CORNERS).forEach(([name, [fx, fy]]) => add(name, `left:${fx * 100}%;top:${fy * 100}%;transform:translate(-50%, -50%);`, HANDLE_CURSORS[name], "sc"));
    return out.join("");
}

/** data: what the agent posted ({ items, handles, label, bbox }). Returns the markup for the selection layer. */
export function selectionHtml(data, zoom) {
    if (!data || !data.items || !data.items.length) return "";
    const iz = 1 / zoom;
    const boxes = data.items.map((it, i) => {
        const inner = data.handles && data.items.length === 1 ? handles(it, zoom) : "";
        return `<div class="sbox" style="left:${round(it.x)}px;top:${round(it.y)}px;width:${round(it.w)}px;height:${round(it.h)}px;transform:rotate(${it.rot}deg);border-radius:${it.radius};">${inner}</div>`;
    }).join("");
    const label = data.label && data.bbox
        ? `<div class="slabel" style="left:${round(data.bbox.x + data.bbox.w / 2)}px;top:${round(data.bbox.y + data.bbox.h + 8 * iz)}px;">${esc(data.label)}</div>`
        : "";
    return boxes + label;
}
