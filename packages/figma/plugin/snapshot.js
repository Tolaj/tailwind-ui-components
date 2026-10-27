// Reads Figma nodes into the plain JSON that src/convert.js turns into HTML. This is the only file that touches Figma's API.
// Positions are made relative to the node's parent from the absolute transforms, so groups need no special care.
// Vectors become inline SVG, and shapes filled with a picture a PNG, both exported by Figma itself.

const VECTORS = new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON", "LINE"]);
const CONTAINERS = new Set(["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);
const MAX_NODES = 12000;
const MAX_PNG_BYTES = 300 * 1024;

const mixed = () => (typeof figma !== "undefined" ? figma.mixed : Symbol.for("mixed"));
const val = (v) => (v === mixed() ? undefined : v);
const safe = (fn) => { try { return fn(); } catch { return undefined; } };
const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// a Figma transform is [[a, b, tx], [c, d, ty]]
const mul = (m, n) => [
    [m[0][0] * n[0][0] + m[0][1] * n[1][0], m[0][0] * n[0][1] + m[0][1] * n[1][1], m[0][0] * n[0][2] + m[0][1] * n[1][2] + m[0][2]],
    [m[1][0] * n[0][0] + m[1][1] * n[1][0], m[1][0] * n[0][1] + m[1][1] * n[1][1], m[1][0] * n[0][2] + m[1][1] * n[1][2] + m[1][2]],
];
const inv = ([[a, b, tx], [c, d, ty]]) => { const det = a * d - b * c || 1; return [[d / det, -b / det, (b * ty - d * tx) / det], [-c / det, a / det, (c * tx - a * ty) / det]]; };
const IDENTITY = [[1, 0, 0], [0, 1, 0]];

const LAYOUT = ["counterAxisAlignContent", "gridRowCount", "gridColumnCount", "gridRowGap", "gridColumnGap", "gridRowSizes", "gridColumnSizes", "minWidth", "maxWidth", "minHeight", "maxHeight", "layoutMode", "layoutWrap", "primaryAxisAlignItems", "counterAxisAlignItems", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing", "counterAxisSpacing"];
const AS_CHILD = ["gridRowSpan", "gridColumnSpan", "gridRowAnchorIndex", "gridColumnAnchorIndex", "layoutPositioning", "layoutSizingHorizontal", "layoutSizingVertical", "layoutGrow", "layoutAlign"];
const PAINT = ["blendMode", "fills", "strokes", "strokeWeight", "strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight", "strokeAlign", "dashPattern",
    "cornerRadius", "topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius", "effects", "clipsContent"];
const TEXT = ["characters", "fontName", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlignHorizontal", "textAlignVertical", "textCase", "textDecoration", "textAutoResize", "textTruncation", "maxLines", "paragraphIndent", "paragraphSpacing"];
const SEGMENT_BASE = ["fontName", "fontSize", "fontWeight", "fills", "textDecoration", "textCase", "lineHeight", "letterSpacing"];
const SEGMENT_MORE = ["hyperlink", "textDecorationStyle", "textDecorationOffset", "textDecorationThickness", "textDecorationColor", "textDecorationSkipInk", "listOptions", "indentation", "textStyleId", "fillStyleId"];
/** The styled runs of a text. getStyledTextSegments refuses the whole call for a field name it does not know, so a shorter list is tried before giving up. */
const textSegments = (node) =>
    safe(() => node.getStyledTextSegments([...SEGMENT_BASE, ...SEGMENT_MORE])) || safe(() => node.getStyledTextSegments([...SEGMENT_BASE, "hyperlink"])) || safe(() => node.getStyledTextSegments(SEGMENT_BASE));

const hasImageFill = (node) => Array.isArray(node.fills) && node.fills.some((p) => p.type === "IMAGE" && p.visible !== false);
const boxOf = (node, parentAbs) => {
    const b = node.absoluteRenderBounds || node.absoluteBoundingBox;
    if (!b) return null;
    return { x: b.x - parentAbs[0][2], y: b.y - parentAbs[1][2], width: b.width, height: b.height };
};

// ── Everything else Figma knows about a layer ────────────────────────────────────────────────────────────────────────────────────
// The converter in the plugin does not use most of this. It travels with the layer (as `meta`) when the design is sent to Windcraft, so
// the server can use it (design tokens, components and variants, hover states, responsive rules...) without a new plugin release.
const META_PROPS = ["constraints", "scrollBehavior", "overflowDirection", "layoutGrids", "locked", "description", "devStatus", "reactions", "boundVariables",
    "componentPropertyReferences", "componentPropertyDefinitions", "componentProperties", "variantProperties", "fillStyleId", "strokeStyleId", "effectStyleId", "textStyleId", "gridStyleId", "exportSettings"];
const STYLE_IDS = ["fillStyleId", "strokeStyleId", "effectStyleId", "textStyleId", "gridStyleId"];
const MAX_LOOKUPS = 600; // names of styles, variables and components are looked up once each, up to this many per design

/** The values of the layer's own properties worth keeping, plus the names behind its style, variable and component ids. */
async function collectMeta(node, ctx) {
    const meta = {};
    for (const key of META_PROPS) {
        const v = val(safe(() => node[key]));
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
        if (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) continue;
        meta[key] = plain(v);
    }
    ctx.names = ctx.names || { styles: new Map(), variables: new Map(), collections: new Map(), components: new Map() };
    const lookup = async (cache, id, fn) => {
        if (!id || typeof id !== "string") return undefined;
        if (cache.has(id)) return cache.get(id);
        if (ctx.lookups >= MAX_LOOKUPS) return undefined;
        ctx.lookups = (ctx.lookups || 0) + 1;
        const value = await fn().catch(() => null);
        cache.set(id, value);
        return value;
    };
    const names = {};
    for (const key of STYLE_IDS) {
        const style = meta[key] && (await lookup(ctx.names.styles, meta[key], async () => { const s = await figma.getStyleByIdAsync(meta[key]); return s ? { name: s.name, type: s.type, description: s.description || "" } : null; }));
        if (style) (names.styles = names.styles || {})[key] = style;
    }
    if (meta.boundVariables) { // the variables this layer's properties follow: their names, kinds and collections
        const ids = new Set();
        JSON.stringify(meta.boundVariables, (k, v) => { if (k === "id" && typeof v === "string" && v.startsWith("VariableID")) ids.add(v); return v; });
        for (const id of ids) {
            const variable = await lookup(ctx.names.variables, id, async () => {
                const v = await figma.variables.getVariableByIdAsync(id);
                if (!v) return null;
                const collection = await lookup(ctx.names.collections, v.variableCollectionId, async () => { const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId); return c ? { name: c.name, modes: (c.modes || []).map((m) => m.name) } : null; });
                return { name: v.name, type: v.resolvedType, collection: collection ? collection.name : "", values: plain(v.valuesByMode) };
            });
            if (variable) (names.variables = names.variables || {})[id] = variable;
        }
    }
    if (node.type === "INSTANCE") { // which component (and variant) this is an instance of
        const main = await safeAsync(() => node.getMainComponentAsync());
        if (main) {
            const info = await lookup(ctx.names.components, main.id, async () => ({ id: main.id, name: main.name, set: main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : "", description: main.description || "", key: main.key }));
            if (info) names.component = info;
        }
    }
    if (Object.keys(names).length) meta.names = names;
    return Object.keys(meta).length ? meta : null;
}
const safeAsync = async (fn) => { try { return await fn(); } catch { return undefined; } };

/** A picture's bytes as a small data URI: shrunk to the size it is shown at by the plugin window (which has a canvas). */
async function pictureUri(bytes, width, height, cover, ctx, label) {
    if (ctx.compress) {
        // pictures share one budget: once ~3 MB is used, the rest are saved smaller and rougher
        const tight = (ctx.pictureChars || 0) > 3000000;
        const uri = await ctx.compress({ bytes, width, height, cover, quality: tight ? 0.6 : 0.78, maxPixels: tight ? 400000 : 1600000 });
        if (uri) ctx.pictureChars = (ctx.pictureChars || 0) + uri.length;
        if (uri) return uri;
        ctx.warnings.push(`${label}: its picture could not be shrunk`);
    }
    if (bytes.length > MAX_PNG_BYTES) { ctx.warnings.push(`${label}: its picture is ${Math.round(bytes.length / 1024)} KB, too big to include`); return null; }
    return `data:image/png;base64,${figma.base64Encode(bytes)}`;
}

/** A frame or shape that has a picture fill (and children, so it stays a box): each picture becomes the fill's data. */
async function attachPictures(node, out, ctx) {
    for (const paint of out.fills || []) {
        if (paint.type !== "IMAGE" || paint.visible === false || !paint.imageHash) continue;
        try {
            const key = `${paint.imageHash}:${Math.round(node.width)}x${Math.round(node.height)}`;
            ctx.cache = ctx.cache || new Map();
            if (!ctx.cache.has(key)) {
                const bytes = await figma.getImageByHash(paint.imageHash).getBytesAsync();
                ctx.cache.set(key, await pictureUri(bytes, node.width, node.height, paint.scaleMode !== "FIT" && paint.scaleMode !== "TILE", ctx, node.name));
            }
            if (ctx.cache.get(key)) paint.dataUri = ctx.cache.get(key);
        } catch (e) {
            ctx.warnings.push(`${node.name}: its picture fill could not be read (${e.message})`);
        }
    }
}

/**
 * @param {SceneNode} node
 * @param {Transform} parentAbs   the parent's absolute transform (the top node is read as if it sat at the origin)
 * @param {{ warnings: string[], count: number, progress?: (n: number) => void, compress?: (job: { bytes: Uint8Array, width: number, height: number, cover: boolean }) => Promise<string | null> }} ctx
 */
export async function snapshotNode(node, parentAbs, ctx, isRoot = false) {
    if (++ctx.count > MAX_NODES) { if (ctx.count === MAX_NODES + 1) ctx.warnings.push(`Stopped at ${MAX_NODES} layers: the rest are left out`); return null; }
    if (ctx.progress && ctx.count % 50 === 0) ctx.progress(ctx.count);
    const abs = node.absoluteTransform || IDENTITY;
    const out = {
        id: node.id, name: node.name, type: node.type, visible: node.visible !== false,
        opacity: val(node.opacity), isMask: Boolean(safe(() => node.isMask)),
        width: node.width, height: node.height,
        transform: isRoot ? IDENTITY : plain(mul(inv(parentAbs), abs)),
    };
    for (const key of [...LAYOUT, ...AS_CHILD, ...PAINT]) { const v = val(safe(() => node[key])); if (v !== undefined) out[key] = plain(v); }
    if (!out.visible) return out;
    const meta = await collectMeta(node, ctx);
    if (meta) out.meta = meta;

    if (node.type === "TEXT") {
        for (const key of TEXT) { const v = val(safe(() => node[key])); if (v !== undefined) out[key] = plain(v); }
        const segments = textSegments(node);
        if (segments && segments.length) out.segments = plain(segments);
        return out;
    }

    if (VECTORS.has(node.type) || (hasImageFill(out) && !(node.children && node.children.length))) {
        const box = boxOf(node, isRoot ? IDENTITY : parentAbs);
        try {
            if (VECTORS.has(node.type)) { out.svg = await node.exportAsync({ format: "SVG_STRING" }); }
            else {
                const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
                out.png = await pictureUri(bytes, box ? box.width : node.width, box ? box.height : node.height, false, ctx, node.name);
            }
            if (box && (out.svg || out.png)) out.box = box;
            if (!out.svg && !out.png) delete out.png;
        } catch (e) {
            ctx.warnings.push(`${node.name}: could not be exported (${e.message})`);
        }
        return out;
    }

    if (hasImageFill(out)) await attachPictures(node, out, ctx); // a box with a picture behind its children
    if (CONTAINERS.has(node.type) && node.children) {
        out.children = [];
        for (const child of node.children) {
            const snap = await snapshotNode(child, abs, ctx);
            if (snap) out.children.push(snap);
        }
    }
    return out;
}

/** Everything under `node` as a snapshot, plus what could not be carried over. */
export async function snapshotDesign(node, progress, compress) {
    const ctx = { warnings: [], count: 0, progress, compress };
    const tree = await snapshotNode(node, IDENTITY, ctx, true);
    return { tree, warnings: ctx.warnings, count: ctx.count };
}
