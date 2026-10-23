// Where each design sits on a project's infinite plane. Shared by the project board and the editor.
// Saved positions win. Everything else is laid out automatically: pages in a row, each page's sections stacked beneath it.
export const GAP_X = 320;
export const SECTION_GAP = 200;
export const PAGE_H = 900;
export const SEC_H = 480;

/** items: [{ id, kind, parent, board }]. Returns { [id]: { x, y } }. A frame may be wider than frameW (widthOf). */
export function computeLayout(items, { frameW, heightOf, widthOf = () => frameW }) {
    const pos = {};
    const pages = items.filter((i) => i.kind !== "section" || !items.some((p) => p.id === i.parent));
    let nextX = 0;
    pages.forEach((p) => {
        pos[p.id] = p.board ? { x: p.board.x, y: p.board.y } : { x: nextX, y: 0 };
        nextX += widthOf(p) + GAP_X;
        let y = pos[p.id].y + heightOf(p) + 260;
        items.filter((i) => i.kind === "section" && i.parent === p.id).forEach((s) => {
            pos[s.id] = s.board ? { x: s.board.x, y: s.board.y } : { x: pos[p.id].x, y };
            y += heightOf(s) + SECTION_GAP;
        });
    });
    return pos;
}
