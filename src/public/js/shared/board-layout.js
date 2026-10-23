// Where each design sits on a project's infinite plane. Shared by the project board and the editor.
// Saved positions win. Everything else is laid out automatically: pages in a row, each page's sections stacked beneath it.
export const GAP_X = 320;
export const SECTION_GAP = 200;
export const PAGE_H = 900;
export const SEC_H = 480;

/** items: [{ id, kind, parent, board }]. Returns { [id]: { x, y } }. */
export function computeLayout(items, { frameW, heightOf }) {
    const pos = {};
    const pages = items.filter((i) => i.kind !== "section" || !items.some((p) => p.id === i.parent));
    pages.forEach((p, col) => {
        pos[p.id] = p.board || { x: col * (frameW + GAP_X), y: 0 };
        let y = pos[p.id].y + heightOf(p) + 260;
        items.filter((i) => i.kind === "section" && i.parent === p.id).forEach((s) => {
            pos[s.id] = s.board || { x: pos[p.id].x, y };
            y += heightOf(s) + SECTION_GAP;
        });
    });
    return pos;
}
