// Layout inference: from where the children of a box ARE (their rectangles), the cleanest layouts that put them there.
//
// Rules only, no model: this is the candidate generator for "free drag, then settle into a standard layout". Everything here is a
// pure function of numbers, so it is tested in Node. A candidate is only offered when it reproduces every child within `tol` px;
// it comes with what it would cost to write (Tailwind classes), so the simplest one can win and a tie shows that a choice exists.
//
// Input:  box   { x, y, w, h }  the content box of the container
//         rects [{ x, y, w, h }] the children in DOM order (in-flow ones only)
// Output: candidates sorted cheapest first: { kind: "row" | "col" | "grid", gap, gapX, gapY, justify, items, cols, push, err, cost }
//         (an empty list: nothing clean fits, so the children keep exact positions)

const AX = { row: { s: "x", z: "w", cs: "y", cz: "h" }, col: { s: "y", z: "h", cs: "x", cz: "w" } };
const median = (a) => { const b = a.slice().sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const near = (p, q, tol) => Math.abs(p - q) <= tol;
const spread = (a) => (a.length ? Math.max(...a) - Math.min(...a) : 0);

/** The classes a candidate needs, for ranking: fewer is simpler (flex-row and items-stretch are free, as they are Tailwind's defaults). */
function costOf(c) {
    let n = c.kind === "grid" ? 2 : 1; // flex | grid
    if (c.kind === "col") n += 1; // flex-col
    if (c.kind === "grid") n += 0; // grid-cols-N counted above
    if (c.gap || c.gapX || c.gapY) n += c.kind === "grid" && c.gapX !== c.gapY ? 2 : 1;
    // a gap off Tailwind's scale is an arbitrary value (gap-[150px]): costlier, which is what makes justify-between win over it
    if ([c.gap, c.gapX, c.gapY].some((g) => g && !GAPS.includes(Math.round(g)))) n += 1;
    if (c.fit) n += 2; // grid-cols-[repeat(N,auto)] and justify-start
    if (c.justify && c.justify !== "start") n += 1;
    if (c.items && c.items !== "stretch") n += 1;
    if (c.push !== undefined && c.push !== null) n += 1; // ml-auto
    return n;
}

/** A row or a column: children one after another along the main axis, aligned across it. */
function flexCandidates(kind, box, rects, tol) {
    const a = AX[kind], n = rects.length, out = [];
    // visual order must be the DOM order (otherwise it would need flex-row-reverse or order-*)
    for (let i = 1; i < n; i++) if (rects[i][a.s] < rects[i - 1][a.s] - tol) return out;
    // children must not share the main axis (no overlap)
    for (let i = 1; i < n; i++) if (rects[i][a.s] < rects[i - 1][a.s] + rects[i - 1][a.z] - tol) return out;
    // across the axis: stretch (the default), start, centre or end
    const cs = box[a.cs], cz = box[a.cz];
    const fits = {
        stretch: rects.every((r) => near(r[a.cs], cs, tol) && near(r[a.cz], cz, tol)),
        start: rects.every((r) => near(r[a.cs], cs, tol)),
        center: rects.every((r) => near(r[a.cs] + r[a.cz] / 2, cs + cz / 2, tol)),
        end: rects.every((r) => near(r[a.cs] + r[a.cz], cs + cz, tol)),
    };
    const items = ["stretch", "start", "center", "end"].filter((k) => fits[k]);
    if (!items.length) return out;
    // along the axis: the space before, between and after
    const gaps = [];
    for (let i = 1; i < n; i++) gaps.push(rects[i][a.s] - (rects[i - 1][a.s] + rects[i - 1][a.z]));
    const lead = rects[0][a.s] - box[a.s], trail = box[a.s] + box[a.z] - (rects[n - 1][a.s] + rects[n - 1][a.z]);
    const even = spread(gaps) <= tol * 2, g = Math.max(0, Math.round(median(gaps)));
    const worst = () => 0;
    const add = (j, extra) => items.forEach((it) => out.push({ kind, justify: j, items: it, ...extra, err: worst() }));
    if (even) {
        if (near(lead, 0, tol)) add("start", { gap: g }); // gap-N from the start
        if (near(trail, 0, tol) && !near(lead, 0, tol)) add("end", { gap: g });
        if (near(lead, trail, tol) && lead > tol) add("center", { gap: g });
        // spread out: the space is all between the children (or around them)
        if (n > 2 || true) {
            if (near(lead, 0, tol) && near(trail, 0, tol) && g > 0) add("between", { gap: 0 });
            if (g > 0 && near(lead, g / 2, tol) && near(trail, g / 2, tol)) add("around", { gap: 0 });
            if (g > 0 && near(lead, g, tol) && near(trail, g, tol)) add("evenly", { gap: 0 });
        }
    } else if (n >= 3 && near(trail, 0, tol) && near(lead, 0, tol)) {
        // one gap is much larger than the rest and everything after it is pushed to the end: ml-auto on that child
        const big = gaps.indexOf(Math.max(...gaps)), rest = gaps.filter((_, i) => i !== big);
        if (spread(rest) <= tol * 2 && gaps[big] > Math.max(...rest) + tol * 2) add("start", { gap: Math.max(0, Math.round(median(rest))), push: big + 1 });
    }
    return out;
}

/** Group sorted numbers into clusters (children that start at the same place). */
function clusters(vals, tol) {
    const s = vals.slice().sort((p, q) => p - q), out = [];
    for (const v of s) { const last = out[out.length - 1]; if (last && v - last.max <= tol) { last.max = v; last.vals.push(v); } else out.push({ min: v, max: v, vals: [v] }); }
    return out.map((c) => median(c.vals));
}

/** A grid of equal columns: every child sits in a cell, rows and columns line up, spacing is the same between all columns (and all rows). */
function gridCandidates(box, rects, tol) {
    const n = rects.length;
    if (n < 4) return []; // fewer than four is a row or a column
    const xs = clusters(rects.map((r) => r.x), tol), ys = clusters(rects.map((r) => r.y), tol);
    if (xs.length < 2 || ys.length < 2) return [];
    // the DOM order is row by row
    const cell = (r) => [ys.findIndex((y) => near(y, r.y, tol)), xs.findIndex((x) => near(x, r.x, tol))];
    let prev = -1;
    for (const r of rects) { const [row, col] = cell(r); if (row < 0 || col < 0) return []; const at = row * xs.length + col; if (at <= prev) return []; prev = at; }
    // equal column widths, and the columns do not overlap
    const cw = median(rects.map((r) => r.w));
    if (!rects.every((r) => near(r.w, cw, tol * 2))) return [];
    const cg = [];
    for (let i = 1; i < xs.length; i++) cg.push(xs[i] - xs[i - 1] - cw);
    if (spread(cg) > tol * 2 || cg.some((v) => v < -tol)) return [];
    // rows: the spacing between row starts and the height of the tallest in each row
    const rowH = ys.map((y) => Math.max(...rects.filter((r) => near(r.y, y, tol)).map((r) => r.h)));
    const rg = [];
    for (let i = 1; i < ys.length; i++) rg.push(ys[i] - ys[i - 1] - rowH[i - 1]);
    if (spread(rg) > tol * 2 || rg.some((v) => v < -tol)) return [];
    const lead = xs[0] - box.x, trail = box.x + box.w - (xs[xs.length - 1] + cw);
    if (!near(lead, 0, tol)) return [];
    const gapX = Math.max(0, Math.round(median(cg))), gapY = Math.max(0, Math.round(median(rg)));
    // equal columns that fill the box exactly are grid-cols-N; leftover space on the right would need a fixed track size
    if (!near(trail, 0, tol * 2)) return [];
    return [{ kind: "grid", cols: xs.length, gapX, gapY, gap: gapX === gapY ? gapX : 0, justify: null, items: "stretch", err: 0 }];
}

export function inferLayouts(box, rects, tol = 1.5) {
    if (!rects || rects.length < 2) return [];
    const all = [...flexCandidates("row", box, rects, tol), ...flexCandidates("col", box, rects, tol), ...gridCandidates(box, rects, tol)];
    all.forEach((c) => { c.cost = costOf(c); });
    return all.sort((p, q) => p.cost - q.cost);
}

/** The best candidate and whether it stands alone: `ambiguous` lists the others that cost the same but are a different layout. */
export function bestLayout(box, rects, tol = 1.5) {
    const list = inferLayouts(box, rects, tol);
    if (!list.length) return null;
    const best = list[0], same = (c) => c.kind === best.kind && c.justify === best.justify && c.items === best.items && c.gap === best.gap && c.push === best.push && c.cols === best.cols;
    return { best, ambiguous: list.filter((c) => c.cost === best.cost && !same(c)), count: list.length };
}

// ── Fitting with a displaced child ─────────────────────────────────────────────────────────────────────────────────
// A drop is not clean geometry: one element was just put somewhere near where it belongs. So instead of reading a layout off the
// numbers, layouts are tried and measured: each candidate says where every child would sit (layoutRects), and one that puts all
// children but one within `tol` of where they are, and the one left within `drag`, explains the drop. That child is where the
// layout wants it to go (`snap`). Ranked: nobody displaced first, then the fewest classes, then the smallest total error.

/** Tailwind's spacing steps in px: the gaps worth trying. */
export const GAPS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64];

/** Where each child (given its size) sits in a candidate layout inside `box`: [{ x, y }]. */
export function layoutRects(c, box, sizes) {
    const n = sizes.length;
    if (c.kind === "grid" && c.fit) { // columns as wide as their widest child (grid-cols-[repeat(N,auto)]), packed at the start
        const rows = Math.ceil(n / c.cols), colW = [], rowH = [];
        for (let j = 0; j < c.cols; j++) colW.push(Math.max(0, ...sizes.filter((_, i) => i % c.cols === j).map((s) => s.w)));
        for (let r = 0; r < rows; r++) rowH.push(Math.max(...sizes.slice(r * c.cols, r * c.cols + c.cols).map((s) => s.h)));
        const colX = []; let x = box.x; for (let j = 0; j < c.cols; j++) { colX.push(x); x += colW[j] + c.gapX; }
        const rowY = []; let y = box.y; for (let r = 0; r < rows; r++) { rowY.push(y); y += rowH[r] + c.gapY; }
        return sizes.map((_, i) => ({ x: colX[i % c.cols], y: rowY[Math.floor(i / c.cols)] }));
    }
    if (c.kind === "grid") {
        const cw = (box.w - c.gapX * (c.cols - 1)) / c.cols, rows = Math.ceil(n / c.cols), rowH = [];
        for (let r = 0; r < rows; r++) rowH.push(Math.max(...sizes.slice(r * c.cols, r * c.cols + c.cols).map((s) => s.h)));
        const rowY = []; let y = box.y; for (let r = 0; r < rows; r++) { rowY.push(y); y += rowH[r] + c.gapY; }
        return sizes.map((s, i) => ({ x: box.x + (i % c.cols) * (cw + c.gapX), y: rowY[Math.floor(i / c.cols)] }));
    }
    const a = AX[c.kind], total = sizes.reduce((t, s) => t + s[a.z], 0);
    const pos = [];
    let m0 = box[a.s], gap = c.gap || 0;
    const used = total + gap * (n - 1), free = box[a.z] - used;
    if (c.justify === "end") m0 = box[a.s] + free + 0;
    else if (c.justify === "center") m0 = box[a.s] + free / 2;
    else if (c.justify === "between") gap = n > 1 ? (box[a.z] - total) / (n - 1) : 0;
    else if (c.justify === "around") { gap = (box[a.z] - total) / n; m0 = box[a.s] + gap / 2; }
    else if (c.justify === "evenly") { gap = (box[a.z] - total) / (n + 1); m0 = box[a.s] + gap; }
    let at = m0;
    for (let i = 0; i < n; i++) {
        if (c.push === i) at = box[a.s] + box[a.z] - sizes.slice(i).reduce((t, s) => t + s[a.z], 0) - gap * (n - 1 - i); // ml-auto: this one and the rest sit at the end
        pos.push(at); at += sizes[i][a.z] + gap;
    }
    return sizes.map((s, i) => {
        const cs = c.items === "center" ? box[a.cs] + (box[a.cz] - s[a.cz]) / 2 : c.items === "end" ? box[a.cs] + box[a.cz] - s[a.cz] : box[a.cs];
        return kindIsRow(c) ? { x: pos[i], y: cs } : { x: cs, y: pos[i] };
    });
}
const kindIsRow = (c) => c.kind === "row";

/** Every candidate layout that explains the rectangles with at most one child displaced (by up to `drag` px). */
export function fitLayouts(box, rects, { tol = 1.5, drag = 40 } = {}) {
    const n = rects.length;
    if (n < 2) return [];
    const sizes = rects.map((r) => ({ w: r.w, h: r.h }));
    const gapsOf = (a) => { const o = []; for (let i = 1; i < n; i++) { const g = Math.round(rects[i][a.s] - (rects[i - 1][a.s] + rects[i - 1][a.z])); if (g >= 0 && g <= 96) o.push(g); } return o; };
    const cands = [];
    for (const kind of ["row", "col"]) {
        const a = AX[kind], gaps = [...new Set([...GAPS, ...gapsOf(a)])];
        for (const items of ["stretch", "start", "center", "end"]) for (const justify of ["start", "end", "center"]) for (const gap of gaps) cands.push({ kind, justify, items, gap });
        for (const items of ["stretch", "start", "center", "end"]) for (const justify of ["between", "around", "evenly"]) cands.push({ kind, justify, items, gap: 0 });
        for (const p of Array.from({ length: n - 1 }, (_, i) => i + 1)) for (const items of ["stretch", "start", "center", "end"]) for (const gap of gaps) cands.push({ kind, justify: "start", items, gap, push: p });
    }
    for (let cols = 2; cols <= Math.min(6, n - 1); cols++) for (const gx of GAPS) for (const gy of GAPS) for (const fit of [false, true]) cands.push({ kind: "grid", cols, gapX: gx, gapY: gy, gap: gx === gy ? gx : 0, items: "stretch", justify: null, fit });
    const out = [];
    for (const c of cands) {
        const pred = layoutRects(c, box, sizes);
        const errs = pred.map((p, i) => Math.max(Math.abs(p.x - rects[i].x), Math.abs(p.y - rects[i].y)));
        const bad = errs.map((e, i) => (e > tol ? i : -1)).filter((i) => i >= 0);
        if (bad.length > 1) continue;
        if (bad.length === 1 && errs[bad[0]] > drag) continue;
        out.push({ ...c, outlier: bad.length ? bad[0] : null, snap: bad.length ? pred[bad[0]] : null, err: errs.reduce((t, e) => t + e, 0) });
    }
    out.forEach((c) => { c.cost = costOf(c); });
    return out.sort((p, q) => (p.outlier !== null) - (q.outlier !== null) || p.cost - q.cost || p.err - q.err);
}

// ── What the drop says, and which readings keep saying it at other widths ────────────────────────────────────────────
// A drop is a set of relations ("C is below A", "B is right of A"), not a set of pixels. Any reading that reproduces them at this
// width is a candidate (above); what tells the candidates apart is whether the relations still hold when the box is narrower or
// wider, as on the other devices. A reading that must overflow or overlap at a width the page is used at does not keep them.

/** For every pair, how the second sits against the first: "right" (beside it, further along) or "below" (under it). */
export function relationsOf(rects, tol = 1.5) {
    const out = [];
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const vOver = a.y < b.y + b.h - tol && b.y < a.y + a.h - tol, hOver = a.x < b.x + b.w - tol && b.x < a.x + a.w - tol;
        if (vOver && b.x >= a.x + a.w - tol) out.push([i, j, "right"]);
        else if (hOver && b.y >= a.y + a.h - tol) out.push([i, j, "below"]);
        else if (!hOver && !vOver) out.push([i, j, b.y >= a.y + a.h - tol ? "below" : "right"]);
    }
    return out;
}

/** The narrowest box a layout keeps its children apart in, with them at their own sizes. */
export function needWidth(c, sizes) {
    const n = sizes.length, w = sizes.map((s) => s.w);
    if (c.kind === "col") return Math.max(...w);
    if (c.kind === "row") return w.reduce((t, v) => t + v, 0) + (c.justify === "start" || c.justify === "end" || c.justify === "center" ? (c.gap || 0) * (n - 1) : 0);
    const col = (j) => Math.max(0, ...w.filter((_, i) => i % c.cols === j));
    const cols = Array.from({ length: c.cols }, (_, j) => col(j));
    return (c.fit ? cols.reduce((t, v) => t + v, 0) : Math.max(...cols) * c.cols) + c.gapX * (c.cols - 1);
}

/**
 * Judge candidates by width. `frameW` is the width of the frame the drop was made in; the box is assumed to lose or gain what the
 * frame does. Adds to each: `need` (narrowest box it holds in), `survives` (how many of `devices` it holds in), and `holds`
 * (the relations of the drop are the layout's own at this width). Candidates that do not reproduce the relations are dropped.
 */
export function judgeLayouts(cands, box, rects, { frameW = box.w, devices = [375, 768, 1280], tol = 1.5 } = {}) {
    const sizes = rects.map((r) => ({ w: r.w, h: r.h }));
    return cands.map((c) => {
        const snapped = layoutRects(c, box, sizes).map((p, i) => ({ ...p, ...sizes[i] }));
        const want = relationsOf(rects.map((r, i) => (c.outlier === i ? snapped[i] : r)), tol), got = relationsOf(snapped, tol);
        const holds = want.every(([i, j, rel]) => got.some(([p, q, r2]) => p === i && q === j && r2 === rel));
        const need = Math.round(needWidth(c, sizes));
        const survives = devices.filter((d) => box.w - (frameW - d) >= need).length;
        return { ...c, holds, need, survives };
    }).filter((c) => c.holds);
}
