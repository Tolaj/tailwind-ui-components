// Where each design sits on a project's infinite plane. Shared by the project board and the editor.
// Saved positions win. Everything else is laid out automatically: pages in a row, each page's sections stacked beneath it.
// Pages that have a group ("Public site", "Customer area") get a row of their own per group, the rows one under the other in
// the order the groups first appear; without groups there is one row, as there always was.
export const GAP_X = 320;
export const SECTION_GAP = 200;
export const ROW_GAP = 360; // between the bottom of one group's row and the labels of the next
export const PAGE_H = 900;
export const SEC_H = 480;

const LABEL_H = 40; // the name above each frame belongs to it
const CLEAR = 60; // the least air between two frames

/**
 * items: [{ id, kind, parent, group, board }]. Returns { [id]: { x, y } }. A frame may be wider than frameW (widthOf).
 * Nothing placed automatically lands on another frame: a spot that is taken (by a frame with a saved position, or one placed before)
 * is moved past it, a page to the right and a section below. Saved positions are never moved.
 */
export function computeLayout(items, { frameW, heightOf, widthOf = () => frameW }) {
    const pos = {};
    const box = (it, p) => ({ x: p.x, y: p.y - LABEL_H, r: p.x + widthOf(it), b: p.y + heightOf(it) });
    const taken = []; // the boxes of what has a place: the saved ones first, then each one placed
    items.forEach((i) => { if (i.board) taken.push(box(i, i.board)); });
    const hit = (a, b) => a.x < b.r + CLEAR && a.r + CLEAR > b.x && a.y < b.b + CLEAR && a.b + CLEAR > b.y;
    /** The first spot from `p` that touches nothing, moving right (down: false) or down. */
    const clear = (it, p, down) => {
        let q = { ...p };
        for (let n = 0; n < 400; n++) {
            const me = box(it, q), other = taken.find((t) => hit(me, t));
            if (!other) return q;
            q = down ? { x: q.x, y: other.b + CLEAR + LABEL_H } : { x: other.r + CLEAR, y: q.y };
        }
        return q;
    };
    const place = (it, want, down) => {
        const p = it.board ? { x: it.board.x, y: it.board.y } : clear(it, want, down);
        if (!it.board) taken.push(box(it, p));
        return p;
    };
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
        // the lowest edge of this row, so the next row starts below it. A page moved by hand keeps its slot, its height included:
        // dragging a page never moves another one (a row below doesn't move up when a tall page is picked up)
        let bottom = rowY;
        row.pages.forEach((p) => {
            pos[p.id] = place(p, { x: nextX, y: rowY }, false);
            nextX = (p.board ? nextX : pos[p.id].x) + widthOf(p) + GAP_X;
            let y = pos[p.id].y + heightOf(p) + 260;
            let slot = rowY + heightOf(p) + 260; // the same stack, as it stands in the slot
            bottom = Math.max(bottom, rowY + heightOf(p));
            items.filter((i) => i.kind === "section" && i.parent === p.id).forEach((s) => {
                pos[s.id] = place(s, { x: pos[p.id].x, y }, true);
                bottom = Math.max(bottom, slot + heightOf(s));
                y = pos[s.id].y + heightOf(s) + SECTION_GAP;
                slot += heightOf(s) + SECTION_GAP;
            });
        });
        rowY = bottom + ROW_GAP;
    });
    return pos;
}
