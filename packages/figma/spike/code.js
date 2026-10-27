// Windcraft Auto Layout spike. One question: for a frame that was drawn WITHOUT Auto Layout, does Figma's own
// `inferredAutoLayout` give us rows, columns, gaps and padding we can trust? Select one or more frames, run the plugin,
// copy the report. It reads only the selection and sends nothing anywhere (no network access in the manifest).
//
// This is one plain file because a Figma plugin cannot import. The analysis functions are exported for the tests in Node.

const CONTAINERS = new Set(["FRAME", "COMPONENT", "INSTANCE"]);
const TOLERANCE = 1; // pixels: how close the real positions must be to what the inferred layout says

/** The inferred layout as a plain object with only the fields we know, whatever else the result has. */
function plainLayout(inferred) {
    if (!inferred) return null;
    const fields = ["layoutMode", "layoutWrap", "primaryAxisSizingMode", "counterAxisSizingMode", "primaryAxisAlignItems", "counterAxisAlignItems",
        "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "itemSpacing", "counterAxisSpacing", "itemReverseZIndex"];
    const out = {};
    for (const f of fields) { try { if (inferred[f] !== undefined) out[f] = inferred[f]; } catch (e) { out[f] = `threw: ${e.message}`; } }
    return out;
}

/**
 * Does laying the children out the way `layout` says put them where they really are? Only rows and columns are checked.
 * Returns { ok, why }: `why` names the first thing that is off.
 */
function layoutMatches(node, layout) {
    const kids = (node.children || []).filter((c) => c.visible !== false);
    if (!layout || (layout.layoutMode !== "HORIZONTAL" && layout.layoutMode !== "VERTICAL")) return { ok: false, why: `not a row or column (${layout ? layout.layoutMode : "none"})` };
    if (kids.length < 2) return { ok: true, why: "fewer than two children" };
    const row = layout.layoutMode === "HORIZONTAL";
    const main = row ? "x" : "y", cross = row ? "y" : "x", size = row ? "width" : "height", crossSize = row ? "height" : "width";
    const sorted = [...kids].sort((a, b) => a[main] - b[main]);
    const start = row ? layout.paddingLeft : layout.paddingTop;
    const crossStart = row ? layout.paddingTop : layout.paddingLeft;
    if (typeof layout.itemSpacing !== "number") return { ok: false, why: "no itemSpacing" };
    if (Math.abs(sorted[0][main] - (start || 0)) > TOLERANCE) return { ok: false, why: `first child starts at ${sorted[0][main]}, padding says ${start || 0}` };
    for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i][main] - (sorted[i - 1][main] + sorted[i - 1][size]);
        if (Math.abs(gap - layout.itemSpacing) > TOLERANCE) return { ok: false, why: `gap ${gap} between children ${i - 1} and ${i}, spacing says ${layout.itemSpacing}` };
    }
    const align = layout.counterAxisAlignItems || "MIN";
    const inner = node[crossSize] - (row ? (layout.paddingTop || 0) + (layout.paddingBottom || 0) : (layout.paddingLeft || 0) + (layout.paddingRight || 0));
    for (const k of sorted) {
        const expected = align === "MIN" ? crossStart || 0 : align === "MAX" ? (crossStart || 0) + inner - k[crossSize] : align === "CENTER" ? (crossStart || 0) + (inner - k[crossSize]) / 2 : null;
        if (expected !== null && Math.abs(k[cross] - expected) > TOLERANCE) return { ok: false, why: `cross position ${k[cross]} for ${align}, expected ${expected}` };
    }
    return { ok: true, why: "" };
}

/** Walks a node and everything under it. Returns the facts the spike is after. */
function analyze(root, { maxSamples = 6 } = {}) {
    const r = {
        root: root.name, nodes: 0, byType: {},
        containers: 0, nativeAutoLayout: 0, noAutoLayout: 0,
        inferredAvailable: 0, inferredNull: 0, inferredMissing: 0, inferredThrew: 0, inferredModes: {},
        inferredMatchesReality: 0, inferredOffReality: 0, offReasons: {},
        samples: [],
    };
    const visit = (node) => {
        r.nodes++;
        r.byType[node.type] = (r.byType[node.type] || 0) + 1;
        if (CONTAINERS.has(node.type)) {
            r.containers++;
            const native = node.layoutMode && node.layoutMode !== "NONE";
            if (native) r.nativeAutoLayout++;
            else if ((node.children || []).length > 1) {
                r.noAutoLayout++;
                let inferred, threw = null;
                try { inferred = node.inferredAutoLayout; } catch (e) { threw = e.message; }
                if (threw) { r.inferredThrew++; if (r.samples.length < maxSamples) r.samples.push({ name: node.name, type: node.type, children: node.children.length, threw }); }
                else if (inferred === undefined) r.inferredMissing++; // the property isn't on this node at all
                else if (!inferred) r.inferredNull++; // there, but Figma found no layout
                else {
                    r.inferredAvailable++;
                    const layout = plainLayout(inferred);
                    r.inferredModes[layout.layoutMode] = (r.inferredModes[layout.layoutMode] || 0) + 1;
                    const match = layoutMatches(node, layout);
                    if (match.ok) r.inferredMatchesReality++;
                    else { r.inferredOffReality++; const key = match.why.replace(/[\d.\-]+/g, "#"); r.offReasons[key] = (r.offReasons[key] || 0) + 1; }
                    if (r.samples.length < maxSamples) r.samples.push({ name: node.name, type: node.type, children: node.children.length, layout, matches: match.ok, why: match.why });
                }
            }
        }
        for (const child of node.children || []) visit(child);
    };
    visit(root);
    return r;
}

/** One line a person can read, from the per-frame results. */
function verdict(reports) {
    const sum = (k) => reports.reduce((n, r) => n + r[k], 0);
    const noAuto = sum("noAutoLayout");
    if (!noAuto) return "These frames use Auto Layout everywhere, so there was nothing to infer. Try a frame drawn by hand without Auto Layout.";
    const avail = sum("inferredAvailable"), good = sum("inferredMatchesReality");
    if (!avail) return `None of the ${noAuto} frames without Auto Layout gave an inferred layout (${sum("inferredNull")} null, ${sum("inferredMissing")} property missing, ${sum("inferredThrew")} errors): we cannot rely on inferredAutoLayout here.`;
    return `${avail} of ${noAuto} frames without Auto Layout gave an inferred layout; ${good} of those match where the children really are (${Math.round((100 * good) / avail)}%).`;
}

/** The whole report for the selected nodes. */
function buildReport(selection, env) {
    const reports = selection.map((n) => analyze(n));
    return { env, selected: selection.length, verdict: verdict(reports), frames: reports };
}

if (typeof figma !== "undefined") {
    figma.showUI(__html__, { width: 520, height: 560 });
    const run = () => {
        const env = { editorType: figma.editorType, mode: figma.mode, apiVersion: figma.apiVersion, fileName: figma.root && figma.root.name };
        const selection = figma.currentPage.selection;
        const report = selection.length
            ? buildReport(selection, env)
            : { env, selected: 0, verdict: "Select one or more frames on the page, then press Run again.", frames: [] };
        figma.ui.postMessage({ type: "report", report });
    };
    figma.ui.onmessage = (msg) => { if (msg && msg.type === "run") run(); if (msg && msg.type === "close") figma.closePlugin(); };
    figma.on("selectionchange", () => figma.ui.postMessage({ type: "selection", count: figma.currentPage.selection.length }));
    run();
}

if (typeof module !== "undefined") module.exports = { plainLayout, layoutMatches, analyze, verdict, buildReport };
