// Where each design sits on a project's infinite plane. Shared by the project board and the editor.
// Saved positions win. Everything else is laid out automatically: pages in a row, each page's sections stacked beneath it,
// keeping clear of what was placed by hand (a page dragged into the row's way pushes the next automatic one past it).
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
    // what was placed by hand, and each automatic page as it is placed: an automatic place must not overlap any of them
    const taken = items.filter((i) => i.board).map((i) => ({ x: i.board.x, y: i.board.y, w: widthOf(i), h: heightOf(i) }));
    const clashes = (r) => taken.filter((t) => r.x < t.x + t.w + GAP_X && t.x < r.x + r.w + GAP_X && r.y < t.y + t.h + SECTION_GAP && t.y < r.y + r.h + SECTION_GAP);
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
        let bottom = rowY; // the lowest edge of what was placed automatically in this row, so the next row starts below it
        row.pages.forEach((p) => {
            const secs = items.filter((i) => i.kind === "section" && i.parent === p.id);
            if (p.board) pos[p.id] = { x: p.board.x, y: p.board.y };
            else {
                // the page and the sections stacked under it, as one column; moved right past anything in its way
                const h = heightOf(p) + secs.filter((s) => !s.board).reduce((sum, s) => sum + 260 + heightOf(s), 0);
                const col = { x: nextX, y: rowY, w: widthOf(p), h };
                for (let n = 0, hit = clashes(col); hit.length && n < 500; n++, hit = clashes(col)) col.x = Math.max(...hit.map((t) => t.x + t.w)) + GAP_X;
                taken.push(col);
                pos[p.id] = { x: col.x, y: rowY };
                nextX = col.x + widthOf(p) + GAP_X; // a page placed by hand keeps no slot in the row: it is wherever it was put
            }
            let y = pos[p.id].y + heightOf(p) + 260;
            if (!p.board) bottom = Math.max(bottom, pos[p.id].y + heightOf(p));
            secs.forEach((s) => {
                pos[s.id] = s.board ? { x: s.board.x, y: s.board.y } : { x: pos[p.id].x, y };
                if (!p.board && !s.board) bottom = Math.max(bottom, y + heightOf(s));
                y += heightOf(s) + SECTION_GAP;
            });
        });
        rowY = bottom + ROW_GAP;
    });
    return pos;
}
