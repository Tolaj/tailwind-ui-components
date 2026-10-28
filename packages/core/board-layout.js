// Where each design sits on a project's infinite plane. Shared by the project board and the editor.
// Saved positions win. Everything else is laid out automatically: pages in a row, each page's sections stacked beneath it.
// Pages that have a group ("Public site", "Customer area") get a row of their own per group, the rows one under the other in
// the order the groups first appear; without groups there is one row, as there always was.
export const GAP_X = 320;
export const SECTION_GAP = 200;
export const ROW_GAP = 360; // between the bottom of one group's row and the labels of the next
export const PAGE_H = 900;
export const SEC_H = 480;

/** items: [{ id, kind, parent, group, board }]. Returns { [id]: { x, y } }. A frame may be wider than frameW (widthOf). */
export function computeLayout(items, { frameW, heightOf, widthOf = () => frameW }) {
    const pos = {};
    const pages = items.filter((i) => i.kind !== "section" || !items.some((p) => p.id === i.parent));
    /** @type {{ group: string, pages: typeof pages }[]} */
    const rows = [];
    pages.forEach((p) => {
        const group = p.group || "";
        let row = rows.find((r) => r.group === group);
        if (!row) rows.push((row = { group, pages: [] }));
        row.pages.push(p);
    });
    let rowY = 0;
    rows.forEach((row) => {
        let nextX = 0;
        // the lowest edge of this row's slots, so the next row starts below it. Every page keeps its slot, its height included, also
        // once it was moved by hand: dragging a page never moves another one (a row below doesn't move up when a tall page is picked up)
        let bottom = rowY;
        row.pages.forEach((p) => {
            pos[p.id] = p.board ? { x: p.board.x, y: p.board.y } : { x: nextX, y: rowY };
            nextX += widthOf(p) + GAP_X;
            let y = pos[p.id].y + heightOf(p) + 260;
            let slot = rowY + heightOf(p) + 260; // the same stack, as it stands in the slot
            bottom = Math.max(bottom, rowY + heightOf(p));
            items.filter((i) => i.kind === "section" && i.parent === p.id).forEach((s) => {
                pos[s.id] = s.board ? { x: s.board.x, y: s.board.y } : { x: pos[p.id].x, y };
                bottom = Math.max(bottom, slot + heightOf(s));
                y += heightOf(s) + SECTION_GAP;
                slot += heightOf(s) + SECTION_GAP;
            });
        });
        rowY = bottom + ROW_GAP;
    });
    return pos;
}
