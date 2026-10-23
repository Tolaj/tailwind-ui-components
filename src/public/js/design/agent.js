// Runs INSIDE the sandboxed preview iframe (stringified via Function.toString).
// Everything it needs must be defined within agentMain. The sandbox has no same-origin access,
// so all communication with the editor is postMessage.
export function agentMain() {
    const root = document.documentElement;
    const post = (m) => parent.postMessage({ ...m, load: window.__wcLoad }, "*");
    const BLUE = "#0d99ff";
    const RED = "#f24822";

    // ── Overlay (selection boxes, handles, guides). Lives outside <body>, never saved. ──────────
    const mk = (css) => { const d = document.createElement("div"); d.style.cssText = css; return d; };
    const overlay = mk("position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;");
    const hoverBox = mk(`position:absolute;border:1px solid ${BLUE};background:rgba(13,153,255,.06);pointer-events:none;display:none;box-sizing:border-box;`);
    const selLayer = mk("position:absolute;left:0;top:0;");
    const guideLayer = mk("position:absolute;left:0;top:0;");
    const draftBox = mk(`position:absolute;border:1px solid ${BLUE};background:rgba(13,153,255,.08);display:none;box-sizing:border-box;`);
    const marqueeBox = mk(`position:absolute;border:1px solid ${BLUE};background:rgba(13,153,255,.1);display:none;box-sizing:border-box;`);
    const insertLine = mk(`position:absolute;background:${BLUE};display:none;pointer-events:none;`);
    const tagLabel = mk(`position:absolute;background:${BLUE};color:#fff;font:500 11px/1 Inter,system-ui,sans-serif;padding:3px 6px;border-radius:2px;display:none;white-space:nowrap;pointer-events:none;`);
    overlay.append(hoverBox, selLayer, guideLayer, draftBox, marqueeBox, insertLine, tagLabel);
    root.appendChild(overlay);

    // ── State ───────────────────────────────────────────────────────────────────────────────
    let tool = "move";
    let zoom = 1;
    let sels = [];
    let hov = null;
    let editing = null;
    let gesture = null;
    let cssProps = [];
    const primary = () => sels[sels.length - 1] || null;
    const px = (n) => n / zoom;

    const DRAW = new Set(["frame", "rect", "ellipse", "text", "image", "button"]);
    const CURSOR = { move: "default", hand: "grab", frame: "crosshair", rect: "crosshair", ellipse: "crosshair", text: "text", image: "crosshair", button: "crosshair" };
    const CONTAINERS = new Set(["div", "section", "main", "header", "footer", "aside", "nav", "article", "form", "ul", "ol", "li", "figure", "body"]);
    const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" fill="#e5e5e5"/><circle cx="92" cy="58" r="12" fill="#bdbdbd"/><path d="M60 128l36-44 26 30 20-22 38 36z" fill="#bdbdbd"/></svg>');
    const TEMPLATES = {
        frame: { tag: "div", cls: "absolute bg-white border border-neutral-300", w: 320, h: 240 },
        rect: { tag: "div", cls: "absolute bg-neutral-300 rounded-md", w: 160, h: 100 },
        ellipse: { tag: "div", cls: "absolute bg-neutral-300 rounded-full", w: 120, h: 120 },
        text: { tag: "p", cls: "absolute text-base text-neutral-900 whitespace-nowrap", text: "Text", auto: true },
        image: { tag: "img", cls: "absolute object-cover rounded-md bg-neutral-200", w: 240, h: 160, attrs: { src: PLACEHOLDER, alt: "Image" } },
        button: { tag: "button", cls: "absolute rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white whitespace-nowrap", text: "Button", auto: true },
    };

    // ── Geometry helpers ────────────────────────────────────────────────────────────────────
    const isAbs = (el) => { const p = getComputedStyle(el).position; return p === "absolute" || p === "fixed"; };
    const pageRect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }; };
    const rotationOf = (el) => {
        const t = getComputedStyle(el).transform;
        const m = t && t.match(/^matrix\(([^)]+)\)/);
        if (!m) return 0;
        const [a, b] = m[1].split(",").map(Number);
        return Math.round(Math.atan2(b, a) * 180 / Math.PI * 10) / 10;
    };
    const geomOf = (el) => {
        const cs = getComputedStyle(el);
        const abs = isAbs(el);
        return {
            abs,
            x: Math.round(abs ? parseFloat(cs.left) || 0 : el.offsetLeft),
            y: Math.round(abs ? parseFloat(cs.top) || 0 : el.offsetTop),
            w: Math.round(parseFloat(cs.width) || el.offsetWidth),
            h: Math.round(parseFloat(cs.height) || el.offsetHeight),
            rot: rotationOf(el),
        };
    };
    const setPx = (el, prop, v) => { el.style[prop] = `${Math.round(v)}px`; };

    /** Origin of an element's coordinate space in page coordinates (static body uses the page itself). */
    const originOf = (container) => {
        if (container === document.body && getComputedStyle(container).position === "static") return { x: 0, y: 0 };
        const r = pageRect(container);
        const cs = getComputedStyle(container);
        return { x: r.x + (parseFloat(cs.borderLeftWidth) || 0) - container.scrollLeft, y: r.y + (parseFloat(cs.borderTopWidth) || 0) - container.scrollTop };
    };
    const ensurePositioned = (c) => { if (c !== document.body && getComputedStyle(c).position === "static") c.classList.add("relative"); };

    const pathOf = (el) => {
        const p = [];
        while (el && el !== document.body) {
            const par = el.parentElement;
            if (!par) return null;
            p.unshift(Array.prototype.indexOf.call(par.children, el));
            el = par;
        }
        return p;
    };
    const elAt = (path) => {
        let el = document.body;
        for (const i of path || []) { el = el && el.children[i]; if (!el) return null; }
        return el;
    };
    const alive = (el) => el && document.body.contains(el);

    // ── Overlay drawing ─────────────────────────────────────────────────────────────────────
    const CORNERS = [["nw", 0, 0], ["ne", 1, 0], ["se", 1, 1], ["sw", 0, 1]];
    const HCURSOR = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
    const ROTATE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="4.2"><path d="M5 15C6.5 8 17.5 8 19 15"/><path d="M2.5 12.5 5 15.5 8 13"/><path d="M16 13 19 15.5 21.5 12.5"/></g><g stroke="#111" stroke-width="1.8"><path d="M5 15C6.5 8 17.5 8 19 15"/><path d="M2.5 12.5 5 15.5 8 13"/><path d="M16 13 19 15.5 21.5 12.5"/></g></svg>';
    const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(ROTATE_SVG)}") 12 12, crosshair`;

    function place(box, el) {
        if (!el || !alive(el)) { box.style.display = "none"; return; }
        const r = pageRect(el);
        Object.assign(box.style, { display: "block", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    }

    function redraw() {
        sels = sels.filter(alive);
        selLayer.innerHTML = "";
        const el = primary();
        const showHandles = Boolean(el && sels.length === 1 && el !== document.body && tool === "move" && !editing);
        if (!showHandles) {
            sels.forEach((e) => {
                const r = pageRect(e);
                selLayer.appendChild(mk(`position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border:${px(1.5)}px solid ${BLUE};box-sizing:border-box;`));
            });
        } else {
            // the box turns with the element: border, resize edges, corner squares and the rotate zones live inside one rotated container
            const abs = isAbs(el);
            const rot = abs ? rotationOf(el) : 0;
            const br = pageRect(el);
            const w = abs && el.offsetWidth ? el.offsetWidth : br.w;
            const h = abs && el.offsetHeight ? el.offsetHeight : br.h;
            const box = mk(`position:absolute;left:${br.x + br.w / 2 - w / 2}px;top:${br.y + br.h / 2 - h / 2}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);transform-origin:50% 50%;border:${px(1.5)}px solid ${BLUE};box-sizing:border-box;pointer-events:none;`);
            selLayer.appendChild(box);
            const s = px(9);
            const e = px(10);
            const bw = px(1.5);
            const add = (css, name, cursor) => { const hnd = mk(`position:absolute;${css}pointer-events:auto;cursor:${cursor};`); hnd.dataset.h = name; box.appendChild(hnd); };
            // rotating: the area just outside each corner (under the corner squares)
            if (abs) {
                const z = px(24);
                CORNERS.forEach(([name, fx, fy]) => add(`left:${fx ? w - bw - s / 2 : -bw - z + s / 2}px;top:${fy ? h - bw - s / 2 : -bw - z + s / 2}px;width:${z}px;height:${z}px;`, `rot-${name}`, ROTATE_CURSOR));
            }
            // resizing: the whole length of each edge, then a square on each corner
            const edgeW = Math.max(0, w - s), edgeH = Math.max(0, h - s);
            (abs ? ["n", "e", "s", "w"] : ["e", "s"]).forEach((name) => {
                const horizontal = name === "n" || name === "s";
                add(horizontal
                    ? `left:${s / 2 - bw}px;top:${(name === "n" ? 0 : h) - bw - e / 2}px;width:${edgeW}px;height:${e}px;`
                    : `left:${(name === "w" ? 0 : w) - bw - e / 2}px;top:${s / 2 - bw}px;width:${e}px;height:${edgeH}px;`, name, HCURSOR[name]);
            });
            (abs ? CORNERS : [["se", 1, 1]]).forEach(([name, fx, fy]) => add(`left:${w * fx - bw - s / 2}px;top:${h * fy - bw - s / 2}px;width:${s}px;height:${s}px;background:#fff;border:${bw}px solid ${BLUE};box-sizing:border-box;`, name, HCURSOR[name]));
        }
        place(hoverBox, tool === "move" && hov && !sels.includes(hov) ? hov : null);
        // the size label only appears while dragging; otherwise it would sit behind the editor's floating toolbar
        if (el && alive(el) && el !== document.body && gesture && gesture.moved) {
            const r = pageRect(el);
            const g = geomOf(el);
            tagLabel.textContent = sels.length > 1 ? `${sels.length} selected` : `${el.tagName.toLowerCase()}  ${g.w} × ${g.h}`;
            Object.assign(tagLabel.style, { display: "block", left: `${r.x}px`, top: `${Math.max(0, r.y - px(22))}px`, transform: `scale(${1 / zoom})`, transformOrigin: "0 100%" });
        } else tagLabel.style.display = "none";
    }

    const clearGuides = () => { guideLayer.innerHTML = ""; insertLine.style.display = "none"; };
    const drawGuide = (kind, pos, from, to) => {
        guideLayer.appendChild(mk(kind === "v"
            ? `position:absolute;left:${pos}px;top:${from}px;width:${px(1)}px;height:${to - from}px;background:${RED};`
            : `position:absolute;top:${pos}px;left:${from}px;height:${px(1)}px;width:${to - from}px;background:${RED};`));
    };

    // ── Describing and serializing ──────────────────────────────────────────────────────────
    const computedOf = (el) => {
        const cs = getComputedStyle(el);
        const o = {};
        cssProps.forEach((p) => { o[p] = cs.getPropertyValue(p); });
        return o;
    };
    const describe = (el) => {
        if (!el) return null;
        const attrs = {};
        Array.prototype.forEach.call(el.attributes, (a) => { if (a.name !== "class" && a.name !== "style" && a.name !== "contenteditable") attrs[a.name] = a.value; });
        const crumbs = [];
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) crumbs.unshift({ tag: n.tagName.toLowerCase(), path: n === document.body ? [] : pathOf(n) });
        return {
            path: el === document.body ? [] : pathOf(el),
            tag: el.tagName.toLowerCase(),
            classes: el.getAttribute("class") || "",
            style: el.getAttribute("style") || "",
            leaf: el.children.length === 0,
            text: el.children.length === 0 ? el.textContent : null,
            attrs, crumbs,
            geom: geomOf(el),
            rect: el === document.body ? null : pageRect(el),
            computed: computedOf(el),
            count: sels.length,
            outer: el.outerHTML.slice(0, 20000),
        };
    };

    let count = 0;
    const walk = (el, depth) => {
        if (count > 600 || depth > 14) return null;
        const tag = el.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "link") return null;
        count++;
        const own = Array.prototype.filter.call(el.childNodes, (n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
        const label = el.id ? "#" + el.id : own ? own.slice(0, 26) : (el.getAttribute("class") || "").split(/\s+/)[0] || "";
        const children = Array.prototype.map.call(el.children, (c) => walk(c, depth + 1)).filter(Boolean);
        return { tag, label, path: el === document.body ? [] : pathOf(el), children };
    };
    const tree = () => { count = 0; return walk(document.body, 0); };
    const serialize = () => {
        const c = document.body.cloneNode(true);
        c.querySelectorAll("[contenteditable]").forEach((e) => e.removeAttribute("contenteditable"));
        c.querySelectorAll("script[data-wc-agent]").forEach((e) => e.remove());
        return c.innerHTML.trim();
    };

    function changed(silent, key) {
        redraw();
        post({ type: "changed", silent: Boolean(silent), key: key || "", html: serialize(), tree: tree(), info: primary() && alive(primary()) ? describe(primary()) : null });
    }
    function setSelection(list, quiet) {
        sels = list.filter(Boolean);
        redraw();
        if (!quiet) post({ type: "selected", info: describe(primary()) });
    }
    const select = (el, quiet) => setSelection(el ? [el] : [], quiet);
    function setTool(t, quiet) {
        tool = t;
        root.style.cursor = CURSOR[t] || "default";
        redraw();
        if (!quiet) post({ type: "tool", tool: t });
    }

    const targetOf = (e) => {
        let t = e.target;
        if (t && t.nodeType !== 1) t = t.parentElement;
        if (!t || overlay.contains(t) || t === root) return document.body;
        return t;
    };
    const containerAt = (x, y) => {
        let t = document.elementFromPoint(x, y);
        if (!t || overlay.contains(t) || t === root) return document.body;
        while (t && t !== document.body && !CONTAINERS.has(t.tagName.toLowerCase())) t = t.parentElement;
        return t || document.body;
    };

    // ── Creating elements ───────────────────────────────────────────────────────────────────
    function createAt(kind, container, lx, ly, w, h) {
        const t = TEMPLATES[kind];
        const el = document.createElement(t.tag);
        el.className = t.cls;
        if (t.attrs) Object.keys(t.attrs).forEach((k) => el.setAttribute(k, t.attrs[k]));
        if (t.text) el.textContent = t.text;
        ensurePositioned(container);
        container.appendChild(el);
        el.style.position = "absolute";
        setPx(el, "left", lx);
        setPx(el, "top", ly);
        if (!t.auto || (w && h)) { setPx(el, "width", w || t.w); setPx(el, "height", h || t.h); }
        if (t.auto && !(w && h)) { /* keeps its natural size */ }
        return el;
    }

    function finishDraw(g, e) {
        draftBox.style.display = "none";
        const dragged = Math.abs(e.clientX - g.sx) > 4 || Math.abs(e.clientY - g.sy) > 4;
        const o = originOf(g.container);
        const x0 = Math.min(g.sx, e.clientX) + window.scrollX - o.x;
        const y0 = Math.min(g.sy, e.clientY) + window.scrollY - o.y;
        const w = Math.abs(e.clientX - g.sx), h = Math.abs(e.clientY - g.sy);
        const t = TEMPLATES[g.kind];
        const el = dragged && !(g.kind === "text" || g.kind === "button")
            ? createAt(g.kind, g.container, x0, y0, w, h)
            : createAt(g.kind, g.container, x0, y0);
        setSelection([el]);
        setTool("move");
        changed();
        if (t.text) startEdit(el, true);
    }

    // ── Inline editing ──────────────────────────────────────────────────────────────────────
    function startEdit(el, selectAll) {
        if (!el || el === document.body) return;
        editing = el;
        el.setAttribute("contenteditable", "true");
        el.focus();
        if (selectAll) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
        redraw();
        postEditing();
    }
    const fmtState = () => ({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), underline: document.queryCommandState("underline") });
    function postEditing() { post({ type: "editing", on: Boolean(editing), rect: editing ? pageRect(editing) : null, fmt: editing ? fmtState() : null }); }
    function finishEdit() {
        if (!editing) return;
        const el = editing;
        editing = null;
        el.removeAttribute("contenteditable");
        postEditing();
        changed();
    }

    // ── Snapping ────────────────────────────────────────────────────────────────────────────
    function snapLines(container, exclude) {
        const o = originOf(container);
        const xs = [], ys = [];
        const cw = container === document.body ? Math.max(root.scrollWidth, innerWidth) : container.clientWidth;
        const ch = container === document.body ? Math.max(root.scrollHeight, innerHeight) : container.clientHeight;
        xs.push(0, cw / 2, cw);
        ys.push(0, ch / 2, ch);
        Array.prototype.forEach.call(container.children, (c) => {
            if (exclude.includes(c) || c.tagName === "SCRIPT" || c.tagName === "STYLE") return;
            const r = pageRect(c);
            const x = r.x - o.x, y = r.y - o.y;
            xs.push(x, x + r.w / 2, x + r.w);
            ys.push(y, y + r.h / 2, y + r.h);
        });
        return { xs, ys, o, cw, ch };
    }
    function snapBox(box, lines) {
        const t = px(6);
        let dx = 0, dy = 0, gx = null, gy = null, bestX = t + 1, bestY = t + 1;
        [box.x, box.x + box.w / 2, box.x + box.w].forEach((v) => lines.xs.forEach((l) => { const d = l - v; if (Math.abs(d) < Math.min(bestX, t + 1) && Math.abs(d) <= t) { bestX = Math.abs(d); dx = d; gx = l; } }));
        [box.y, box.y + box.h / 2, box.y + box.h].forEach((v) => lines.ys.forEach((l) => { const d = l - v; if (Math.abs(d) < Math.min(bestY, t + 1) && Math.abs(d) <= t) { bestY = Math.abs(d); dy = d; gy = l; } }));
        return { dx, dy, gx, gy };
    }

    // ── Gestures ────────────────────────────────────────────────────────────────────────────
    function startMove(e, items) {
        const abs = items.filter(isAbs);
        if (abs.length) {
            gesture = { type: "move", items: abs.map((el) => ({ el, g: geomOf(el) })), sx: e.clientX, sy: e.clientY, moved: false, container: abs[0].parentElement || document.body };
        } else {
            gesture = { type: "reorder", el: items[0], sx: e.clientX, sy: e.clientY, moved: false, before: null };
        }
    }

    function moveGesture(g, e) {
        let dx = e.clientX - g.sx, dy = e.clientY - g.sy;
        if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        const lines = snapLines(g.container, g.items.map((i) => i.el));
        const x0 = Math.min(...g.items.map((i) => i.g.x)) + dx, y0 = Math.min(...g.items.map((i) => i.g.y)) + dy;
        const x1 = Math.max(...g.items.map((i) => i.g.x + i.g.w)) + dx, y1 = Math.max(...g.items.map((i) => i.g.y + i.g.h)) + dy;
        const s = e.altKey || e.metaKey ? { dx: 0, dy: 0, gx: null, gy: null } : snapBox({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, lines);
        clearGuides();
        if (s.gx !== null) drawGuide("v", s.gx + lines.o.x, Math.min(y0, lines.o.y) + lines.o.y - 4000, y1 + lines.o.y + 4000);
        if (s.gy !== null) drawGuide("h", s.gy + lines.o.y, -4000, x1 + lines.o.x + 4000);
        g.items.forEach((i) => { setPx(i.el, "left", i.g.x + dx + s.dx); setPx(i.el, "top", i.g.y + dy + s.dy); });
    }

    function reorderGesture(g, e) {
        const el = g.el;
        const parentEl = el.parentElement;
        let best = null, bestPos = null;
        Array.prototype.forEach.call(parentEl.children, (c) => {
            if (c === el || c.tagName === "SCRIPT") return;
            const r = pageRect(c);
            const horizontal = getComputedStyle(parentEl).flexDirection.startsWith("row") && getComputedStyle(parentEl).display.includes("flex");
            const cx = e.clientX + window.scrollX, cy = e.clientY + window.scrollY;
            const inside = cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
            if (!inside) return;
            const before = horizontal ? cx < r.x + r.w / 2 : cy < r.y + r.h / 2;
            best = c; bestPos = before ? "before" : "after";
            const line = horizontal ? { l: before ? r.x : r.x + r.w, t: r.y, w: px(3), h: r.h } : { l: r.x, t: before ? r.y : r.y + r.h, w: r.w, h: px(3) };
            Object.assign(insertLine.style, { display: "block", left: `${line.l}px`, top: `${line.t}px`, width: `${line.w}px`, height: `${line.h}px` });
        });
        g.target = best; g.pos = bestPos;
        if (!best) insertLine.style.display = "none";
    }

    function resizeGesture(g, e) {
        // work in the element's own axes, so a rotated element resizes along its own edges
        const th = g.rot * Math.PI / 180, cos = Math.cos(th), sin = Math.sin(th);
        const sdx = e.clientX - g.sx, sdy = e.clientY - g.sy;
        const dx = sdx * cos + sdy * sin, dy = -sdx * sin + sdy * cos;
        const hd = g.h;
        let w = g.g.w, h = g.g.h;
        if (hd.includes("e")) w = g.g.w + dx;
        if (hd.includes("s")) h = g.g.h + dy;
        if (hd.includes("w")) w = g.g.w - dx;
        if (hd.includes("n")) h = g.g.h - dy;
        if (e.shiftKey && g.g.w && g.g.h) {
            const r = g.g.w / g.g.h;
            if (hd.length === 2 || hd === "e" || hd === "w") h = w / r; else w = h * r;
        }
        w = Math.max(1, w); h = Math.max(1, h);
        setPx(g.el, "width", w);
        setPx(g.el, "height", h);
        if (!g.abs) return;
        // keep the opposite edge or corner where it was (or the center, with Alt)
        const ax = hd.includes("w") ? 1 : hd.includes("e") ? -1 : 0;
        const ay = hd.includes("n") ? 1 : hd.includes("s") ? -1 : 0;
        const rot = (x, y) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
        const a0 = rot(ax * g.g.w / 2, ay * g.g.h / 2), a1 = rot(ax * w / 2, ay * h / 2);
        const cx = e.altKey ? g.c.x : g.c.x + a0.x - a1.x;
        const cy = e.altKey ? g.c.y : g.c.y + a0.y - a1.y;
        setPx(g.el, "left", cx - w / 2 - g.o.x);
        setPx(g.el, "top", cy - h / 2 - g.o.y);
    }

    function rotateGesture(g, e) {
        const a = Math.atan2(e.clientY + window.scrollY - g.cy, e.clientX + window.scrollX - g.cx) * 180 / Math.PI;
        let rot = g.start + (a - g.a0);
        if (e.shiftKey) rot = Math.round(rot / 15) * 15;
        g.el.style.transform = rot % 360 === 0 ? "" : `rotate(${Math.round(rot * 10) / 10}deg)`;
        if (!g.el.style.transform) g.el.style.removeProperty("transform");
    }

    function marqueeSelect(g, e) {
        const x0 = Math.min(g.sx, e.clientX) + window.scrollX, y0 = Math.min(g.sy, e.clientY) + window.scrollY;
        const x1 = Math.max(g.sx, e.clientX) + window.scrollX, y1 = Math.max(g.sy, e.clientY) + window.scrollY;
        Object.assign(marqueeBox.style, { display: "block", left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
        const hits = Array.prototype.filter.call(document.body.querySelectorAll("*"), (el) => {
            if (overlay.contains(el) || !isAbs(el)) return false;
            const r = pageRect(el);
            return r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0;
        }).filter((el, _, all) => !all.some((o) => o !== el && o.contains(el)));
        g.hits = hits;
    }

    document.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        if (editing && editing.contains(e.target)) return;
        if (editing) finishEdit();
        const hd = e.target && e.target.dataset && e.target.dataset.h;
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
        e.preventDefault();

        if (hd) {
            const el = primary();
            const g = geomOf(el);
            if (hd.startsWith("rot")) {
                const r = pageRect(el);
                const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
                gesture = { type: "rotate", el, cx, cy, a0: Math.atan2(e.clientY + window.scrollY - cy, e.clientX + window.scrollX - cx) * 180 / Math.PI, start: g.rot, moved: false };
            } else {
                const br = pageRect(el);
                gesture = { type: "resize", el, h: hd, g, abs: g.abs, rot: g.rot, c: { x: br.x + br.w / 2, y: br.y + br.h / 2 }, o: originOf(el.parentElement || document.body), sx: e.clientX, sy: e.clientY, moved: false };
            }
            return;
        }
        if (tool === "hand") { gesture = { type: "pan", sx: e.clientX, sy: e.clientY, moved: false }; root.style.cursor = "grabbing"; return; }
        if (DRAW.has(tool)) {
            gesture = { type: "draw", kind: tool, sx: e.clientX, sy: e.clientY, container: containerAt(e.clientX, e.clientY), moved: false };
            return;
        }
        const t = targetOf(e);
        if (t === document.body) {
            gesture = { type: "marquee", sx: e.clientX, sy: e.clientY, shift: e.shiftKey, hits: [], moved: false };
            if (!e.shiftKey) setSelection([]);
            return;
        }
        if (e.shiftKey) setSelection(sels.includes(t) ? sels.filter((s) => s !== t) : [...sels, t]);
        else if (!sels.includes(t)) setSelection([t]);
        startMove(e, sels.length ? sels : [t]);
    }, true);

    document.addEventListener("pointermove", (e) => {
        const g = gesture;
        if (!g) {
            if (!editing && tool === "move") { hov = targetOf(e); redraw(); }
            return;
        }
        if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 3 && g.type !== "rotate") return;
        g.moved = true;
        if (!g.notified) { g.notified = true; post({ type: "gesture", on: true }); }
        if (g.type === "draw") {
            const x0 = Math.min(g.sx, e.clientX) + window.scrollX, y0 = Math.min(g.sy, e.clientY) + window.scrollY;
            Object.assign(draftBox.style, { display: "block", left: `${x0}px`, top: `${y0}px`, width: `${Math.abs(e.clientX - g.sx)}px`, height: `${Math.abs(e.clientY - g.sy)}px` });
        } else if (g.type === "move") { moveGesture(g, e); redraw(); }
        else if (g.type === "reorder") reorderGesture(g, e);
        else if (g.type === "resize") { resizeGesture(g, e); redraw(); }
        else if (g.type === "rotate") { rotateGesture(g, e); redraw(); }
        else if (g.type === "marquee") marqueeSelect(g, e);
        else if (g.type === "pan") { post({ type: "pan", dx: e.clientX - g.sx, dy: e.clientY - g.sy }); g.sx = e.clientX; g.sy = e.clientY; }
    }, true);

    document.addEventListener("pointerup", (e) => {
        const g = gesture;
        gesture = null;
        clearGuides();
        marqueeBox.style.display = "none";
        root.style.cursor = CURSOR[tool] || "default";
        if (!g) return;
        if (g.notified) post({ type: "gesture", on: false });
        if (g.type === "draw") return finishDraw(g, e);
        if (g.type === "marquee") { if (g.moved) setSelection(g.shift ? [...new Set([...sels, ...g.hits])] : g.hits); return; }
        if (g.type === "reorder" && g.moved && g.target) {
            if (g.pos === "before") g.target.before(g.el); else g.target.after(g.el);
            return changed();
        }
        if (g.type === "pan") return;
        if (g.moved) changed();
        else post({ type: "selected", info: describe(primary()) });
    }, true);

    document.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const el = targetOf(e);
        if (el === document.body || tool !== "move") return;
        setSelection([el]);
        startEdit(el, false);
    }, true);
    document.addEventListener("selectionchange", () => { if (editing) postEditing(); });
    document.addEventListener("focusout", (e) => { if (editing && e.target === editing) finishEdit(); }, true);
    document.addEventListener("submit", (e) => e.preventDefault(), true);
    document.addEventListener("click", (e) => { if (!(editing && editing.contains(e.target))) { e.preventDefault(); e.stopPropagation(); } }, true);

    // ── Align, group, duplicate, delete ─────────────────────────────────────────────────────
    function align(mode) {
        const items = sels.filter(isAbs);
        if (!items.length) return;
        const gs = items.map((el) => ({ el, g: geomOf(el) }));
        let box;
        if (items.length === 1) {
            const par = items[0].parentElement;
            box = { x: 0, y: 0, w: par === document.body ? Math.max(root.scrollWidth, innerWidth) : par.clientWidth, h: par === document.body ? Math.max(root.scrollHeight, innerHeight) : par.clientHeight };
        } else {
            const x0 = Math.min(...gs.map((i) => i.g.x)), y0 = Math.min(...gs.map((i) => i.g.y));
            box = { x: x0, y: y0, w: Math.max(...gs.map((i) => i.g.x + i.g.w)) - x0, h: Math.max(...gs.map((i) => i.g.y + i.g.h)) - y0 };
        }
        if (mode === "distribute-h" || mode === "distribute-v") {
            if (gs.length < 3) return;
            const horiz = mode === "distribute-h";
            gs.sort((a, b) => (horiz ? a.g.x - b.g.x : a.g.y - b.g.y));
            const total = gs.reduce((s, i) => s + (horiz ? i.g.w : i.g.h), 0);
            const gap = ((horiz ? box.w : box.h) - total) / (gs.length - 1);
            let cur = horiz ? box.x : box.y;
            gs.forEach((i) => { setPx(i.el, horiz ? "left" : "top", cur); cur += (horiz ? i.g.w : i.g.h) + gap; });
        } else {
            gs.forEach(({ el, g }) => {
                if (mode === "left") setPx(el, "left", box.x);
                if (mode === "hcenter") setPx(el, "left", box.x + (box.w - g.w) / 2);
                if (mode === "right") setPx(el, "left", box.x + box.w - g.w);
                if (mode === "top") setPx(el, "top", box.y);
                if (mode === "vcenter") setPx(el, "top", box.y + (box.h - g.h) / 2);
                if (mode === "bottom") setPx(el, "top", box.y + box.h - g.h);
            });
        }
        changed();
    }

    function group() {
        const items = sels.filter((el) => isAbs(el) && el.parentElement);
        if (items.length < 2) return;
        const par = items[0].parentElement;
        if (items.some((el) => el.parentElement !== par)) return;
        const gs = items.map((el) => ({ el, g: geomOf(el) }));
        const x0 = Math.min(...gs.map((i) => i.g.x)), y0 = Math.min(...gs.map((i) => i.g.y));
        const x1 = Math.max(...gs.map((i) => i.g.x + i.g.w)), y1 = Math.max(...gs.map((i) => i.g.y + i.g.h));
        const grp = document.createElement("div");
        grp.className = "absolute";
        grp.style.position = "absolute";
        setPx(grp, "left", x0); setPx(grp, "top", y0); setPx(grp, "width", x1 - x0); setPx(grp, "height", y1 - y0);
        par.insertBefore(grp, items[0]);
        gs.forEach(({ el, g }) => { grp.appendChild(el); setPx(el, "left", g.x - x0); setPx(el, "top", g.y - y0); });
        setSelection([grp]);
        changed();
    }

    function ungroup() {
        const el = primary();
        if (!el || el === document.body || !isAbs(el) || !el.children.length || !el.parentElement) return;
        const g = geomOf(el);
        const kids = Array.prototype.slice.call(el.children).filter(isAbs);
        if (!kids.length) return;
        kids.forEach((k) => { const kg = geomOf(k); el.parentElement.insertBefore(k, el); setPx(k, "left", kg.x + g.x); setPx(k, "top", kg.y + g.y); });
        if (!el.children.length) el.remove();
        setSelection(kids);
        changed();
    }

    function duplicate() {
        const copies = sels.filter((el) => el !== document.body).map((el) => {
            const c = el.cloneNode(true);
            el.after(c);
            if (isAbs(c)) { const g = geomOf(c); setPx(c, "left", g.x + 12); setPx(c, "top", g.y + 12); }
            return c;
        });
        if (copies.length) { setSelection(copies); changed(); }
    }

    function removeSelection() {
        const items = sels.filter((el) => el !== document.body);
        if (!items.length) return;
        const next = items[0].parentElement;
        items.forEach((el) => el.remove());
        setSelection(next && next !== root ? [next] : []);
        changed();
    }

    function nudge(dx, dy) {
        const items = sels.filter(isAbs);
        if (!items.length) return;
        items.forEach((el) => { const g = geomOf(el); setPx(el, "left", g.x + dx); setPx(el, "top", g.y + dy); });
        changed(false, "nudge");
    }

    function freePosition(el, on) {
        if (!el || el === document.body) return;
        if (on) {
            if (isAbs(el)) return;
            const par = el.parentElement || document.body;
            ensurePositioned(par);
            const o = originOf(par);
            const r = pageRect(el);
            el.classList.add("absolute");
            el.style.position = "absolute";
            setPx(el, "left", r.x - o.x); setPx(el, "top", r.y - o.y); setPx(el, "width", r.w); setPx(el, "height", r.h);
        } else {
            el.classList.remove("absolute", "fixed");
            ["position", "left", "top", "width", "height", "transform"].forEach((p) => el.style.removeProperty(p));
            if (!el.getAttribute("style")) el.removeAttribute("style");
        }
    }

    // ── Keyboard ────────────────────────────────────────────────────────────────────────────
    document.addEventListener("keydown", (e) => {
        if (editing) {
            if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); finishEdit(); }
            return;
        }
        const meta = e.metaKey || e.ctrlKey;
        const k = e.key.toLowerCase();
        if (e.code === "Space") { e.preventDefault(); post({ type: "space", down: true }); return; }
        if (meta && k === "g") { e.preventDefault(); e.shiftKey ? ungroup() : group(); return; }
        if (meta && k === "d") { e.preventDefault(); duplicate(); return; }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSelection(); return; }
        if (e.key.startsWith("Arrow") && sels.length) {
            e.preventDefault();
            const s = e.shiftKey ? 10 : 1;
            nudge(e.key === "ArrowLeft" ? -s : e.key === "ArrowRight" ? s : 0, e.key === "ArrowUp" ? -s : e.key === "ArrowDown" ? s : 0);
            return;
        }
        if (e.key === "Escape") { e.preventDefault(); if (tool !== "move") setTool("move"); else setSelection([]); return; }
        if (e.shiftKey && (e.key === "!" || e.key === "@")) { e.preventDefault(); post({ type: "key", key: e.key, meta: false, shift: true }); return; }
        const forward = (meta && ["z", "y", "s"].includes(k)) || (!meta && !e.altKey && ["v", "f", "r", "o", "t", "i", "b", "h"].includes(k));
        if (forward) { e.preventDefault(); post({ type: "key", key: k, meta, shift: e.shiftKey }); }
    }, true);

    // the editor owns the plane: scrolling pans it and Ctrl/Cmd + scroll (or a pinch) zooms it
    window.addEventListener("wheel", (e) => {
        e.preventDefault();
        post({ type: "wheel", x: e.clientX, y: e.clientY, dx: e.deltaX, dy: e.deltaY, zoom: e.ctrlKey || e.metaKey });
    }, { passive: false });

    document.addEventListener("keyup", (e) => { if (e.code === "Space" && !editing) post({ type: "space", down: false }); }, true);

    // Tailwind writes its styles a moment after an element appears, so the numbers the editor shows can be stale
    let infoTimer = null;
    new MutationObserver(() => {
        redraw();
        clearTimeout(infoTimer);
        infoTimer = setTimeout(() => { if (primary() && alive(primary()) && !gesture) post({ type: "info", info: describe(primary()) }); }, 150);
    }).observe(document.head, { childList: true, subtree: true, characterData: true });
    window.addEventListener("scroll", redraw, { passive: true });
    window.addEventListener("resize", redraw);
    new ResizeObserver(() => { redraw(); post({ type: "height", height: Math.ceil(root.getBoundingClientRect().height) }); }).observe(root);

    // images dropped from the desktop become <img> elements
    document.addEventListener("dragover", (e) => { e.preventDefault(); }, true);
    document.addEventListener("drop", (e) => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file || !/^image\//.test(file.type) || file.size > 1500000) return;
        const reader = new FileReader();
        reader.onload = () => {
            const container = containerAt(e.clientX, e.clientY);
            const o = originOf(container);
            const el = createAt("image", container, e.clientX + window.scrollX - o.x, e.clientY + window.scrollY - o.y);
            el.setAttribute("src", reader.result);
            el.setAttribute("alt", file.name.replace(/\.[^.]+$/, ""));
            setSelection([el]);
            changed();
        };
        reader.readAsDataURL(file);
    }, true);

    // ── Commands from the editor ────────────────────────────────────────────────────────────
    const mutate = {
        setClasses: (el, m) => { m.value ? el.setAttribute("class", m.value) : el.removeAttribute("class"); },
        setText: (el, m) => { if (el.children.length === 0) el.textContent = m.text; },
        setAttr: (el, m) => { m.value === null ? el.removeAttribute(m.name) : el.setAttribute(m.name, m.value); },
        remove: (el) => { const p = el.parentElement; el.remove(); sels = p && p !== root ? [p] : []; },
        duplicate: (el) => { const c = el.cloneNode(true); el.after(c); sels = [c]; },
        move: (el, m) => {
            if (m.dir < 0 && el.previousElementSibling) el.previousElementSibling.before(el);
            if (m.dir > 0 && el.nextElementSibling) el.nextElementSibling.after(el);
        },
        moveTo: (el, m) => {
            const t = elAt(m.targetPath);
            if (!t || el.contains(t) || el === t) return;
            if (m.position === "before") t.before(el);
            else if (m.position === "after") t.after(el);
            else t.appendChild(el);
        },
        replaceOuter: (el, m) => {
            const tpl = document.createElement("template");
            tpl.innerHTML = m.html;
            const n = tpl.content.firstElementChild;
            if (n) { el.replaceWith(n); sels = [n]; }
        },
        insert: (el, m) => {
            const tpl = document.createElement("template");
            tpl.innerHTML = m.html;
            const n = tpl.content.firstElementChild;
            if (!n) return;
            if (m.position === "inside") el.appendChild(n); else el.after(n);
            sels = [n];
        },
        setGeom: (el, m) => {
            const abs = isAbs(el);
            if (abs && m.x !== undefined && m.x !== null) setPx(el, "left", m.x);
            if (abs && m.y !== undefined && m.y !== null) setPx(el, "top", m.y);
            if (m.w !== undefined && m.w !== null) setPx(el, "width", Math.max(1, m.w));
            if (m.h !== undefined && m.h !== null) setPx(el, "height", Math.max(1, m.h));
            if (m.rot !== undefined && m.rot !== null) { el.style.transform = Number(m.rot) % 360 === 0 ? "" : `rotate(${Number(m.rot)}deg)`; if (!el.style.transform) el.style.removeProperty("transform"); }
        },
        freePosition: (el, m) => freePosition(el, m.on),
        setStyleProp: (el, m) => {
            if (m.value === null || m.value === "") el.style.removeProperty(m.prop);
            else el.style.setProperty(m.prop, m.value);
            if (!el.getAttribute("style")) el.removeAttribute("style");
        },
    };

    window.addEventListener("message", (e) => {
        if (e.source !== parent) return;
        const m = e.data || {};
        if (m.cmd === "load") {
            editing = null;
            document.body.innerHTML = m.html;
            sels = m.selectPath ? [elAt(m.selectPath)].filter(Boolean) : [];
            changed(true);
            if (primary()) post({ type: "selected", info: describe(primary()) });
            return;
        }
        if (m.cmd === "select") { select(elAt(m.path)); return; }
        if (m.cmd === "deselect") { editing = null; setSelection([], true); return; }
        if (m.cmd === "hover") { hov = m.path ? elAt(m.path) : null; redraw(); return; }
        if (m.cmd === "tool") { setTool(m.tool, true); return; }
        if (m.cmd === "cssProps") { cssProps = m.props || []; return; }
        if (m.cmd === "exec") {
            if (editing && m.name) { editing.focus(); document.execCommand(m.name, false, m.arg || null); postEditing(); }
            return;
        }
        if (m.cmd === "view") { zoom = m.zoom || 1; redraw(); return; }
        if (m.cmd === "scrollTo") { const el = elAt(m.path); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
        if (m.cmd === "align") { align(m.mode); return; }
        if (m.cmd === "group") { group(); return; }
        if (m.cmd === "ungroup") { ungroup(); return; }
        if (m.cmd === "deleteSel") { removeSelection(); return; }
        if (m.cmd === "duplicateSel") { duplicate(); return; }
        if (mutate[m.cmd]) {
            const el = elAt(m.path);
            if (!el) return;
            mutate[m.cmd](el, m);
            changed();
            if (primary() && alive(primary())) post({ type: "selected", info: describe(primary()) });
        }
    });

    post({ type: "ready", html: serialize(), tree: tree() });
}
