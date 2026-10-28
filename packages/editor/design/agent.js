// Runs INSIDE the sandboxed preview iframe (stringified via Function.toString).
// Everything it needs must be defined within agentMain. The sandbox has no same-origin access,
// so all communication with the editor is postMessage.
export function agentMain() {
    const root = document.documentElement;
    const post = (m) => parent.postMessage({ ...m, load: window.__wcLoad }, "*");
    const BLUE = "#111";
    const RED = "#f24822";

    // ── Overlay (selection boxes, handles, guides). Lives outside <body>, never saved. ──────────
    const mk = (css) => { const d = document.createElement("div"); d.style.cssText = css; return d; };
    const overlay = mk("position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;");
    const hoverBox = mk(`position:absolute;border:1px solid ${BLUE};box-shadow:0 0 0 1px rgba(255,255,255,.7);background:rgba(0,0,0,.04);pointer-events:none;display:none;box-sizing:border-box;`);
    const guideLayer = mk("position:absolute;left:0;top:0;");
    const draftBox = mk(`position:absolute;border:1px solid ${BLUE};box-shadow:0 0 0 1px rgba(255,255,255,.7);background:rgba(0,0,0,.05);display:none;box-sizing:border-box;`);
    const marqueeBox = mk(`position:absolute;border:1px solid ${BLUE};box-shadow:0 0 0 1px rgba(255,255,255,.7);background:rgba(0,0,0,.06);display:none;box-sizing:border-box;`);
    const insertLine = mk(`position:absolute;background:${BLUE};box-shadow:0 0 0 1px rgba(255,255,255,.8);display:none;pointer-events:none;`);
    // while an element is dragged through the page flow: the box that follows the pointer, the container it would land in, and a short note
    const RIM = "box-shadow:0 0 0 1px rgba(255,255,255,.75);";
    const ghostBox = mk(`position:absolute;border:1px dashed ${BLUE};${RIM}background:rgba(0,0,0,.05);display:none;pointer-events:none;box-sizing:border-box;`);
    const dropBox = mk(`position:absolute;border:1.5px solid ${BLUE};${RIM}background:rgba(0,0,0,.035);display:none;pointer-events:none;box-sizing:border-box;`);
    const dropHint = mk(`position:absolute;display:none;pointer-events:none;background:${BLUE};color:#fff;font:500 11px/1 system-ui,sans-serif;white-space:nowrap;border-radius:4px;`);
    const gridLayer = mk("position:absolute;left:0;top:0;pointer-events:none;"); // Figma's layout grids, when switched on
    overlay.append(gridLayer, hoverBox, guideLayer, draftBox, marqueeBox, ghostBox, dropBox, insertLine, dropHint);
    root.appendChild(overlay);

    // In the editor the cursor belongs to the active tool, never to the design: a button's own cursor:pointer would show a
    // pointing hand over it. Everything inherits the cursor set on <html> (arrow, grab, crosshair...); text being typed keeps its I-beam.
    const cursorStyle = document.createElement("style");
    cursorStyle.setAttribute("data-wc-agent-style", "");
    cursorStyle.textContent = "html * { cursor: inherit !important; } [contenteditable=true], [contenteditable=true] * { cursor: text !important; }";
    document.head.appendChild(cursorStyle);
    root.style.cursor = "default"; // the Move tool is active from the start

    // ── State ───────────────────────────────────────────────────────────────────────────────
    let tool = "move";
    let zoom = 1;
    let sels = [];
    let inside = null; // the group gone into with a double-click (see pickable)
    let hov = null;
    let editing = null;
    let gesture = null;
    let cssProps = [];
    // elements made in this editor session (drawn, inserted from the + menu, dropped, duplicated from one of those): they are always styled with Tailwind
    const made = new WeakSet();
    const markMade = (el) => { made.add(el); el.querySelectorAll("*").forEach((n) => made.add(n)); };
    const primary = () => sels[sels.length - 1] || null;
    const px = (n) => n / zoom;

    const DRAW = new Set(["frame", "rect", "ellipse", "line", "arrow", "text", "image", "button"]);
    const CURSOR = { move: "default", hand: "grab", frame: "crosshair", rect: "crosshair", ellipse: "crosshair", line: "crosshair", arrow: "crosshair", text: "text", image: "crosshair", button: "crosshair" };
    const CONTAINERS = new Set(["div", "section", "main", "header", "footer", "aside", "nav", "article", "form", "ul", "ol", "li", "figure", "body"]);
    const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" fill="#e5e5e5"/><circle cx="92" cy="58" r="12" fill="#bdbdbd"/><path d="M60 128l36-44 26 30 20-22 38 36z" fill="#bdbdbd"/></svg>');
    const TEMPLATES = {
        frame: { tag: "div", cls: "absolute bg-white border border-neutral-300", w: 320, h: 240 },
        rect: { tag: "div", cls: "absolute bg-neutral-300 rounded-md", w: 160, h: 100 },
        ellipse: { tag: "div", cls: "absolute bg-neutral-300 rounded-full", w: 120, h: 120 },
        line: { tag: "div", cls: "absolute bg-neutral-900 text-neutral-900", w: 160, h: 2 },
        arrow: { tag: "div", cls: "absolute bg-neutral-900 text-neutral-900", w: 160, h: 2, html: '<i class="pointer-events-none" style="position:absolute;right:0;top:50%;transform:translateY(-50%);border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:9px solid currentColor"></i>' },
        text: { tag: "p", cls: "absolute text-base text-neutral-900 whitespace-nowrap", text: "Text", auto: true },
        image: { tag: "img", cls: "absolute object-cover rounded-md bg-neutral-200", w: 240, h: 160, attrs: { src: PLACEHOLDER, alt: "Image" } },
        button: { tag: "button", cls: "absolute rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white whitespace-nowrap", text: "Button", auto: true },
    };

    // ── Geometry helpers ────────────────────────────────────────────────────────────────────
    const isAbs = (el) => { const p = getComputedStyle(el).position; return p === "absolute" || p === "fixed"; };
    const pageRect = (el) => {
        const r = el.getBoundingClientRect();
        // a group in a grid has no box of its own (display: contents, so the grid's cells stay as they were): the box around its children
        if (!r.width && !r.height && el.children && el.children.length && getComputedStyle(el).display === "contents") {
            const rs = Array.prototype.map.call(el.children, pageRect).filter((q) => q.w || q.h);
            if (rs.length) { const x = Math.min(...rs.map((q) => q.x)), y = Math.min(...rs.map((q) => q.y)); return { x, y, w: Math.max(...rs.map((q) => q.x + q.w)) - x, h: Math.max(...rs.map((q) => q.y + q.h)) - y }; }
        }
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    };
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
    function place(box, el) {
        if (!el || !alive(el)) { box.style.display = "none"; return; }
        const r = pageRect(el);
        Object.assign(box.style, { display: "block", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    }

    // The selection box, handles and size label are drawn by the editor, above the frame, so nothing clips them at the
    // frame's edge and the outline of an element hanging outside the frame stays visible. The agent only describes it.
    let lastOverlay = "";
    const boxOf = (el) => {
        const br = pageRect(el);
        const w = el.offsetWidth || br.w, h = el.offsetHeight || br.h;
        const cs = getComputedStyle(el);
        // each corner's horizontal and vertical radius in pixels (a percentage is of the width / height)
        const corners = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((c) => {
            const t = String(cs[`border${c}Radius`] || "0").split(/\s+/);
            const px = (v, ref) => (String(v).endsWith("%") ? (parseFloat(v) * ref) / 100 : parseFloat(v) || 0);
            return [px(t[0], w), px(t[1] === undefined ? t[0] : t[1], h)];
        });
        return {
            x: br.x + br.w / 2 - w / 2, y: br.y + br.h / 2 - h / 2, w, h, rot: rotationOf(el),
            rh: corners.map((c) => c[0]), rv: corners.map((c) => c[1]), r0: corners[0][0],
        };
    };
    function redraw() {
        sels = sels.filter(alive);
        const el = primary();
        const items = sels.filter((e) => e !== document.body).map(boxOf);
        const handles = Boolean(el && sels.length === 1 && el !== document.body && tool === "move" && !editing && !isLocked(el));
        let label = "", at = null;
        if (el && el !== document.body && gesture && gesture.moved) {
            const g = geomOf(el);
            if (gesture.type === "radius") { label = `Radius ${gesture.r}`; at = gesture.at; }
            else label = sels.length > 1 ? `${sels.length} selected` : `${g.w} × ${g.h}`;
        }
        const bbox = el && el !== document.body && alive(el) ? pageRect(el) : null;
        const data = JSON.stringify({ items, handles, label, bbox, at });
        if (data !== lastOverlay) { lastOverlay = data; post({ type: "overlay", items, handles, label, bbox, at }); }
        place(hoverBox, tool === "move" && hov && hov !== document.body && !sels.includes(hov) ? hov : null); // not the page itself
    }

    const clearGuides = () => { guideLayer.innerHTML = ""; insertLine.style.display = "none"; ghostBox.style.display = "none"; dropBox.style.display = "none"; dropHint.style.display = "none"; };

    // ── Describing and serializing ──────────────────────────────────────────────────────────
    const computedOf = (el) => {
        const cs = getComputedStyle(el);
        const o = {};
        cssProps.forEach((p) => { o[p] = cs.getPropertyValue(p); });
        return o;
    };
    // ── Where each property's value comes from ──────────────────────────────────────────────
    // A Tailwind class on this element, its inline style, the design's own CSS (<style>/<link> marked data-wc-design by the editor),
    // inherited, or nothing. The winner is found by switching each kind of stylesheet off for an instant and seeing whether the
    // value changes (synchronous: nothing repaints); which rule it is comes from walking the stylesheets.
    const LOGICAL = {
        "padding-left": ["padding-inline-start"], "padding-right": ["padding-inline-end"], "padding-top": ["padding-block-start"], "padding-bottom": ["padding-block-end"],
        "margin-left": ["margin-inline-start"], "margin-right": ["margin-inline-end"], "margin-top": ["margin-block-start"], "margin-bottom": ["margin-block-end"],
        width: ["inline-size"], height: ["block-size"], "min-width": ["min-inline-size"], "max-width": ["max-inline-size"], "min-height": ["min-block-size"], "max-height": ["max-block-size"],
        left: ["inset-inline-start"], right: ["inset-inline-end"], top: ["inset-block-start"], bottom: ["inset-block-end"],
    };
    // Tailwind v4 writes shorthands with var() (padding-inline: calc(var(--spacing) * 4)), which leave the longhands empty in the rule
    const shorthandsOf = (p) => {
        const m = p.match(/^(padding|margin)-(left|right|top|bottom)$/);
        if (m) return [`${m[1]}-${/left|right/.test(m[2]) ? "inline" : "block"}`, m[1]];
        if (/^(left|right|top|bottom)$/.test(p)) return [/left|right/.test(p) ? "inset-inline" : "inset-block", "inset"];
        if (/^border-(top|bottom)-(left|right)-radius$/.test(p)) return ["border-radius"];
        const b = p.match(/^border-(top|right|bottom|left)-(width|style|color)$/);
        if (b) return [`border-${b[2]}`, `border-${b[1]}`, `border-${/left|right/.test(b[1]) ? "inline" : "block"}-${b[2]}`, "border"];
        return { "background-color": ["background"], "row-gap": ["gap"], "column-gap": ["gap"], "font-size": ["font"], "font-weight": ["font"], "line-height": ["font"], "flex-direction": ["flex-flow"], "flex-wrap": ["flex-flow"], "text-decoration-line": ["text-decoration"] }[p] || [];
    };
    const unesc = (s) => s.replace(/\\(.)/g, "$1");
    const classNamesIn = (sel) => [...sel.matchAll(/\.((?:\\.|[\w-])+)/g)].map((m) => unesc(m[1]));
    function sheetsByKind() {
        const owners = [...document.querySelectorAll("style, link[rel=stylesheet]")].filter((n) => !n.hasAttribute("data-wc-agent-style") && !n.hasAttribute("data-wc-editor"));
        const design = owners.filter((n) => n.hasAttribute("data-wc-design"));
        const tw = owners.filter((n) => !n.hasAttribute("data-wc-design") && n.tagName === "STYLE" && n.type !== "text/tailwindcss");
        // classes the design defines itself in <style type="text/tailwindcss"> (.btn { @apply ... }): compiled into Tailwind's sheet, but the design's
        const custom = new Set(design.filter((n) => n.type === "text/tailwindcss").flatMap((n) => [...n.textContent.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1])));
        return { design: design.map((n) => n.sheet).filter(Boolean), tw: tw.map((n) => n.sheet).filter(Boolean), custom };
    }
    function sourcesOf(el, props) {
        if (!el || el === document.body || !props.length) return {};
        const { design, tw, custom } = sheetsByKind();
        const rulesOf = (sheet) => {
            const out = [];
            const walk = (list) => {
                for (const r of list) {
                    if (r.media && r.cssRules && !(r instanceof CSSStyleRule)) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules); continue; }
                    if (r instanceof CSSStyleRule) {
                        let hit = false;
                        try { hit = el.matches(r.selectorText); } catch (err) { /* a selector this browser can't match */ }
                        if (hit) out.push(r);
                        if (r.cssRules && r.cssRules.length) walk(r.cssRules);
                        continue;
                    }
                    if (r.cssRules) walk(r.cssRules); // @layer, @supports
                }
            };
            try { walk(sheet.cssRules); } catch (err) { out.cross = true; } // a linked sheet from another site can't be read
            return out;
        };
        const twRules = tw.flatMap(rulesOf);
        const designLists = design.map(rulesOf);
        const designRules = designLists.flat();
        const designUnreadable = designLists.some((l) => l.cross);
        const toks = [...el.classList].filter((t) => !custom.has(t)).map((t) => ({ t, sel: "." + CSS.escape(t) }));
        const tokenOf = (r) => { const s = r.selectorText; const hit = toks.find(({ sel }) => s === sel || (s.startsWith(sel) && /^[:[]/.test(s.slice(sel.length)))); return hit ? hit.t : null; };
        const declares = (r, p) => [p, ...(LOGICAL[p] || []), ...shorthandsOf(p)].some((q) => r.style.getPropertyValue(q) !== "");
        // of the rules that set a property, the likely winner: one naming a class of this element beats a reset like `*` or `h1`; then the later one
        const best = (rules) => { const own = rules.filter((r) => classNamesIn(r.selectorText).some((n) => el.classList.contains(n))); const l = own.length ? own : rules; return l[l.length - 1]; };

        const read = () => { const cs = getComputedStyle(el); const o = {}; props.forEach((p) => { o[p] = cs.getPropertyValue(p); }); return o; };
        const base = read();
        const without = (sheets) => { sheets.forEach((s) => { s.disabled = true; }); const v = read(); sheets.forEach((s) => { s.disabled = false; }); return v; };
        const noTw = tw.length ? without(tw) : base, noDesign = design.length ? without(design) : base;

        const res = {};
        props.forEach((p) => {
            const inline = el.style.getPropertyValue(p);
            const ownTw = twRules.filter((r) => declares(r, p));
            const twTok = ownTw.map(tokenOf).filter(Boolean);
            const ownDesign = designRules.filter((r) => declares(r, p));
            const twWins = base[p] !== noTw[p], designWins = base[p] !== noDesign[p];
            let s;
            if (twWins && twTok.length) s = { source: "tailwind", token: twTok[twTok.length - 1] };
            else if (twWins && ownTw.length) {
                const sel = best(ownTw).selectorText;
                const names = classNamesIn(sel);
                const mine = names.find((n) => custom.has(n) && el.classList.contains(n));
                const parent = names.find((n) => !el.classList.contains(n) && el.parentElement && el.parentElement.closest("." + CSS.escape(n)));
                s = mine ? { source: "design", selector: sel } : parent ? { source: "parent", token: parent } : { source: "default" }; // the last: Tailwind's reset
            } else if (designWins && ownDesign.length) s = { source: "design", selector: best(ownDesign).selectorText };
            else if (designWins && designUnreadable) s = { source: "design", selector: "a linked stylesheet" };
            else if (inline) s = { source: "inline" };
            else if (twTok.length || ownDesign.length) s = { source: "tie", token: twTok[twTok.length - 1] || null }; // two sources set the same value
            else if (twWins || designWins) s = { source: "inherited" };
            else s = { source: "default" };
            res[p] = s;
        });
        return res;
    }

    // A brand-new class takes Tailwind a moment to build. Wait until its rule is in Tailwind's stylesheet (checked every few ms),
    // at most 150 ms, so the time a released drag spends converting stays short.
    const hasRule = (token) => {
        const sel = "." + CSS.escape(token);
        const walk = (list) => { for (const r of list) { if (r.selectorText && (r.selectorText === sel || r.selectorText.startsWith(sel + ":") || r.selectorText.startsWith(sel + " ") || r.selectorText.startsWith(sel + ","))) return true; if (r.cssRules && walk(r.cssRules)) return true; } return false; };
        return sheetsByKind().tw.some((sh) => { try { return walk(sh.cssRules); } catch (err) { return false; } });
    };
    async function settle(tokens) {
        const t0 = performance.now();
        const list = (tokens || []).filter(Boolean);
        do {
            await new Promise((r) => setTimeout(r, 8));
            if (list.length && list.every(hasRule)) return;
        } while (performance.now() - t0 < 150);
    }
    /** The CSS value a Tailwind class gives a property, measured on a hidden twin next to the element (used when the class itself can't win). */
    async function valueOfClass(el, token, prop) {
        if (!token || !el.parentElement) return null;
        const twin = document.createElement(el.tagName);
        twin.className = token;
        twin.style.cssText = "visibility:hidden;pointer-events:none;position:absolute;";
        el.after(twin);
        await settle([token]);
        const v = getComputedStyle(twin).getPropertyValue(prop);
        twin.remove();
        return v || null;
    }
    const tidyStyle = (el) => { if (!el.getAttribute("style")) el.removeAttribute("style"); };
    /**
     * A property edit from the panel, written where it belongs and checked: "tw" sets the new class string and keeps it only if that
     * class is now what gives the property its value (something stronger, like the design's CSS or a md: class, makes it fall back);
     * "css" writes the inline style, made !important when the design's own CSS would still win.
     */
    // ── After a drag, resize or draw: pixels become Tailwind classes (the editor builds them, this frame checks them) ──
    const GESTURE_PROPS = ["width", "height", "left", "top", "margin-left", "margin-top", "margin-right", "margin-bottom", "align-self"];
    const inlineOf = (el, props) => { const o = {}; props.forEach((p) => { o[p] = el.style.getPropertyValue(p); }); return o; };
    /** What the editor needs to turn an element's new inline pixels into classes: the values, its classes, and where each value came from before. */
    function gestureItem(el, pre, props, clear) {
        const values = {};
        props.forEach((p) => { const v = el.style.getPropertyValue(p); if (v && !el.style.getPropertyPriority(p)) values[p] = v; });
        // `clear`: class groups (mt, mx, self...) to take off the element, for the margins and alignment its old place gave it
        return { path: pathOf(el), classes: el.getAttribute("class") || "", made: made.has(el), pre: pre || {}, values, ...(clear && clear.length ? { clear } : {}) };
    }
    /**
     * The editor's answer: per element, the class string and the class meant to give each property its value. The classes go on
     * first, and only once Tailwind has built them is the inline pixel removed, all in one go, so nothing flickers. If any of an
     * element's properties then takes its value from something else, that element gets its classes and pixels back.
     */
    // From release until the editor's classes are in, new presses wait: a second drag in that moment would work on pixels that
    // are about to become classes. If the editor never answers, the pixels are saved as they are.
    let converting = false, convertTimer = 0;
    function askConvert(items) {
        converting = true;
        clearTimeout(convertTimer);
        convertTimer = setTimeout(() => { converting = false; changed(); }, 2000);
        post({ type: "convert", items });
    }
    async function applyGesture(m) {
        const work = (m.items || []).map((it) => ({ it, el: elAt(it.path), props: Object.keys(it.tokens || {}) })).filter((w) => w.el && (w.props.length || w.it.cleared));
        work.forEach((w) => { w.prevClass = w.el.getAttribute("class"); w.prevStyle = w.el.getAttribute("style"); w.el.setAttribute("class", w.it.classes); });
        if (!converting) return; // too late: the pixels were already saved
        clearTimeout(convertTimer);
        if (work.length) await settle(work.flatMap((w) => Object.values(w.it.tokens)));
        work.forEach((w) => {
            const { el, it, props } = w;
            props.forEach((p) => el.style.removeProperty(p));
            tidyStyle(el);
            const now = sourcesOf(el, props);
            const lost = props.some((p) => { const s = now[p] || {}; return s.source === "design" || s.source === "inline" || (s.source === "tailwind" && s.token !== it.tokens[p]); });
            if (!lost) return;
            if (w.prevClass === null) el.removeAttribute("class"); else el.setAttribute("class", w.prevClass);
            if (w.prevStyle === null) el.removeAttribute("style"); else el.setAttribute("style", w.prevStyle);
        });
        converting = false;
        redraw();
        changed();
    }

    let propSeq = 0;
    async function setProp(el, m) {
        const seq = ++propSeq; // a colour picker being dragged sends edit after edit: only the latest one gets checked (and maybe undone)
        const props = m.props || [m.prop]; // several at once for an all-sides edit (padding, border width, radius)
        let css = m.css;
        let perProp = null; // the fallback CSS measured for each property
        if (m.route === "tw") {
            const prevClass = el.getAttribute("class"), prevStyle = el.getAttribute("style");
            if (m.classes) el.setAttribute("class", m.classes); else el.removeAttribute("class");
            props.forEach((p) => el.style.removeProperty(p));
            tidyStyle(el);
            if (!m.token) return; // a class was removed: nothing to check
            await settle([m.token]);
            if (seq !== propSeq) return;
            const now = sourcesOf(el, props);
            const lost = props.some((p) => { const s = now[p] || {}; return s.source === "design" || s.source === "inline" || (s.source === "tailwind" && s.token !== m.token); });
            if (!lost) return;
            if (prevClass === null) el.removeAttribute("class"); else el.setAttribute("class", prevClass);
            if (prevStyle === null) el.removeAttribute("style"); else el.setAttribute("style", prevStyle);
            if (!css) {
                const base = m.token.replace(/^(?:[^[\]:]*(?:\[[^\]]*\])?[^[\]:]*:)+/, ""); // without its md: / hover: prefix
                perProp = {};
                for (const p of props) perProp[p] = await valueOfClass(el, base, p);
            }
        } else if (!css && m.token) { // a Tailwind value typed on a CSS row (red-500): measure what it means
            perProp = {};
            for (const p of props) perProp[p] = await valueOfClass(el, m.token, p);
        }
        props.forEach((p) => {
            const v = perProp ? perProp[p] : css;
            if (v === null || v === undefined || v === "") { el.style.removeProperty(p); return; }
            el.style.setProperty(p, v);
        });
        // the design's own CSS still wins (an !important rule): only an important inline value beats it
        const after = sourcesOf(el, props);
        props.forEach((p) => { const v = el.style.getPropertyValue(p); if (v && (after[p] || {}).source === "design") el.style.setProperty(p, v, "important"); });
        tidyStyle(el);
    }

    /** For a child of a flex box: its direction and whether flex sizes it along that axis (flex-1, grow, a basis), which a width or height can't override. */
    const flexItemOf = (el) => {
        const p = el.parentElement;
        if (!p || el === document.body || !/flex/.test(getComputedStyle(p).display)) return null;
        const cs = getComputedStyle(el), dir = getComputedStyle(p).flexDirection.startsWith("row") ? "row" : "column";
        return { dir, sized: (parseFloat(cs.flexGrow) || 0) > 0 || cs.flexBasis !== "auto" };
    };
    /**
     * A box with two or more children stacked in the normal flow can be made a row, column or grid. The gap that keeps today's
     * spacing: in the flow, touching margins collapse into the larger one; in flex they add up, so the margins come off the gap.
     */
    const arrangeOf = (el) => {
        if (!el || el === document.body || !/^(block|flow-root|list-item)$/.test(getComputedStyle(el).display)) return null;
        const kids = Array.prototype.filter.call(el.children, (k) => !["SCRIPT", "STYLE"].includes(k.tagName) && !isAbs(k));
        if (kids.length < 2) return null;
        const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 0; };
        const rs = kids.map((k) => ({ r: k.getBoundingClientRect(), cs: getComputedStyle(k) }));
        const space = med(rs.slice(1).map((b, i) => b.r.top - rs[i].r.bottom));
        const margins = med(rs.slice(1).map((b, i) => (parseFloat(rs[i].cs.marginBottom) || 0) + (parseFloat(b.cs.marginTop) || 0)));
        return { count: kids.length, colGap: Math.max(0, Math.round(space - margins)), rowGap: Math.max(0, Math.round(space)) };
    };
    // ── Which tags an element can become ───────────────────────────────────────────────────
    // Only swaps that keep the HTML valid for where the element sits and what it holds: text tags (p, h1, span...) only around
    // text and inline content, no link or button inside another, list items only in a list, one <main>, no form in a form.
    // Images, inputs, media and table rows keep their own tag (another one would drop what they are).
    const FLOW_TAGS = ["div", "section", "article", "aside", "header", "footer", "nav", "main", "form", "figure", "blockquote"];
    const TEXT_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "label", "strong", "em", "small"];
    const ACTION_TAGS = ["a", "button"];
    const PHRASING = new Set(["a", "abbr", "b", "br", "button", "code", "em", "i", "img", "input", "kbd", "label", "mark", "q", "s", "select", "small", "span", "strong", "sub", "sup", "svg", "textarea", "time", "u", "wbr", "picture", "video", "audio", "canvas", "iframe", "object", "data", "var", "samp", "cite", "dfn", "bdi", "bdo", "ruby", "del", "ins", "map", "meter", "output", "progress", "slot", "template", "noscript", "script", "style"]);
    const TEXT_ONLY = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "label", "strong", "em", "small", "a", "button", "b", "i", "u", "s", "code", "q", "cite", "mark", "sub", "sup", "abbr", "time", "legend", "dt", "caption", "summary", "pre"]);
    const INTERACTIVE = "a, button, input, select, textarea, label, details, iframe, [tabindex]";
    const PAIRS = { td: ["td", "th"], th: ["td", "th"], dt: ["dt", "dd"], dd: ["dt", "dd"], thead: ["thead", "tbody", "tfoot"], tbody: ["thead", "tbody", "tfoot"], tfoot: ["thead", "tbody", "tfoot"] };
    const SWAPPABLE = new Set([...FLOW_TAGS, ...TEXT_TAGS, ...ACTION_TAGS, "ul", "ol", "li", "menu", "b", "i", "u", "s", "code", "mark", "pre"]);
    function tagOptions(el) {
        const tag = el.tagName.toLowerCase();
        if (el === document.body || overlay.contains(el)) return [];
        if (PAIRS[tag]) return PAIRS[tag];
        if (!SWAPPABLE.has(tag)) return [];
        const parent = el.parentElement, ptag = parent ? parent.tagName.toLowerCase() : "body";
        if (["ul", "ol", "menu"].includes(ptag)) return ["li"]; // a list holds only list items
        const kids = Array.prototype.filter.call(el.children, (k) => !["SCRIPT", "STYLE", "TEMPLATE"].includes(k.tagName));
        const kidTags = kids.map((k) => k.tagName.toLowerCase());
        if (kids.length && kidTags.every((t) => t === "li")) return ["ul", "ol"]; // its items need a list around them
        const up = (sel) => Boolean(parent && parent.closest(sel));
        const down = (sel) => Boolean(el.querySelector(sel));
        const inlineOnly = kidTags.every((t) => PHRASING.has(t)); // holds only text and inline elements
        const inText = TEXT_ONLY.has(ptag) || up("p, h1, h2, h3, h4, h5, h6, span, a, button, label");
        const inAction = up("a, button");
        let out = [];
        if (!inText) {
            out.push(...FLOW_TAGS.filter((t) => {
                if (t === "main") return (tag === "main" || !document.querySelector("main")) && !up("article, aside, footer, header, nav"); // one per page
                if (t === "header" || t === "footer") return !up("header, footer") && !down("header, footer");
                if (t === "form") return !up("form") && !down("form");
                return true;
            }));
            if (!kids.length && !el.textContent.trim()) out.push("ul", "ol"); // an empty one can start a list (text can't sit in one)
        }
        if (inlineOnly) {
            out.push(...(inText ? TEXT_TAGS.filter((t) => !/^(p|h\d)$/.test(t)) : TEXT_TAGS).filter((t) => t !== "label" || (!inAction && !up("label") && !down("label"))));
            if (!inAction && !down(INTERACTIVE)) out.push(...ACTION_TAGS);
        }
        if (!out.includes(tag)) out.unshift(tag);
        return [...new Set(out)];
    }

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
            group: el.hasAttribute("data-wc-group"),
            text: el.children.length === 0 ? el.textContent : null,
            attrs, crumbs,
            geom: geomOf(el),
            rect: el === document.body ? null : pageRect(el),
            computed: computedOf(el),
            sources: sourcesOf(el, cssProps),
            flexItem: flexItemOf(el),
            parentLayout: el !== document.body && el.parentElement ? layoutOf(el.parentElement) : null,
            arrange: arrangeOf(el),
            tagOptions: tagOptions(el),
            added: made.has(el),
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
        return { tag, label, path: el === document.body ? [] : pathOf(el), children, locked: el.hasAttribute("data-wc-locked"), hidden: el.classList.contains("hidden") };
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
        const info = primary() && alive(primary()) ? describe(primary()) : null;
        // with nothing selected the editor shows the page, and the page's styling is the body's: it gets the body's fresh values
        post({ type: "changed", silent: Boolean(silent), key: key || "", html: serialize(), tree: tree(), info, body: info ? null : describe(document.body) });
    }
    function setSelection(list, quiet) {
        sels = list.filter(Boolean);
        if (inside && !(sels.length && sels.every((el) => el !== inside && inside.contains(el)))) inside = null; // picked something outside: out of the group
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

    // A locked element (and what is inside it) cannot be picked, moved or resized on the page: a press on it goes to what holds it. The
    // lock is an attribute on the element, so it is saved with the design. It can still be chosen in the Layers panel, to unlock it.
    const isLocked = (el) => Boolean(el && el.closest && el.closest("[data-wc-locked]"));
    const targetOf = (e) => {
        let t = e.target;
        if (t && t.nodeType !== 1) t = t.parentElement;
        if (!t || overlay.contains(t) || t === root) return document.body;
        while (t && t !== document.body && isLocked(t)) t = t.parentElement;
        return pickable(t || document.body);
    };
    // ── Groups ── A group (Ctrl+G) is a box made around a few elements, marked data-wc-group so it is saved with the design. On the page
    // it acts as one thing, as in Figma: a click picks the whole group, a double-click goes inside it (then what is in it can be picked
    // and moved), and picking something outside it or Esc comes back out. The Layers panel can still pick anything.
    /** The group `el` is in, if any (not `el` itself). What is in a group stays in it until it is ungrouped. */
    const groupAround = (el) => (el && el.parentElement ? el.parentElement.closest("[data-wc-group]") : null);
    /** May `el` be put inside `parent`? Only within the group it is in, if it is in one. */
    const staysInGroup = (el, parent) => { const gp = groupAround(el); return !gp || (!!parent && gp.contains(parent)); };
    /** What a click on `t` picks: the outermost group around it that has not been gone into, or else `t` itself. */
    function pickable(t) {
        if (!t || t === document.body) return t;
        const chain = [];
        for (let p = t; p && p !== document.body; p = p.parentElement) if (p.hasAttribute && p.hasAttribute("data-wc-group")) chain.unshift(p);
        for (const gp of chain) if (!(inside && gp.contains(inside))) return gp;
        return t;
    }
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
        if (t.html) el.innerHTML = t.html;
        ensurePositioned(container);
        container.appendChild(el);
        markMade(el);
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
        if (g.kind === "line" || g.kind === "arrow") {
            // a line runs from where the drag began to where it ended: a box of that length, centred on the midpoint and turned to the angle
            const dx = dragged ? e.clientX - g.sx : t.w, dy = dragged ? e.clientY - g.sy : 0;
            const len = Math.max(8, Math.hypot(dx, dy));
            const mx = g.sx + dx / 2 + window.scrollX - o.x, my = g.sy + dy / 2 + window.scrollY - o.y;
            const line = createAt(g.kind, g.container, mx - len / 2, my - 1, len, 2);
            const deg = Math.round(Math.atan2(dy, dx) * 1800 / Math.PI) / 10;
            if (deg) line.style.transform = `rotate(${deg}deg)`;
            setSelection([line]);
            setTool("move");
            return askConvert([gestureItem(line, {}, ["position", "left", "top", "width", "height"])]);
        }
        const el = dragged && !(g.kind === "text" || g.kind === "button")
            ? createAt(g.kind, g.container, x0, y0, w, h)
            : createAt(g.kind, g.container, x0, y0);
        setSelection([el]);
        setTool("move");
        askConvert([gestureItem(el, {}, ["position", "left", "top", "width", "height"])]);
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
    // ── Smart guides ────────────────────────────────────────────────────────────────────────
    // Everything is in page coordinates. A moving box snaps to the edges and centres of EVERY box around it (not just its siblings),
    // the lines that lined up are drawn only as far as the boxes involved, and the gaps to the neighbours are measured.
    const GUIDE_SKIP = new Set(["SCRIPT", "STYLE", "BR", "TEMPLATE", "HEAD", "META", "LINK"]);
    function targetsFor(exclude) {
        const out = [];
        document.body.querySelectorAll("*").forEach((n) => {
            if (overlay.contains(n) || GUIDE_SKIP.has(n.tagName) || exclude.some((x) => x === n || x.contains(n))) return;
            const r = pageRect(n);
            if (r.w >= 1 && r.h >= 1) out.push(r);
        });
        out.push({ x: 0, y: 0, w: Math.max(root.scrollWidth, innerWidth), h: Math.max(root.scrollHeight, innerHeight) });
        return out;
    }
    const three = (a, len) => [a, a + len / 2, a + len];
    /** The smallest move that puts one of `vals` on one of the targets' lines, or null when nothing is close enough. */
    function nearestLine(vals, lineSets, t) {
        let best = null;
        vals.forEach((v) => lineSets.forEach((set) => set.forEach((c) => { const d = c - v; if (Math.abs(d) <= t && (best === null || Math.abs(d) < Math.abs(best))) best = d; })));
        return best;
    }
    const cross = (x, y) => guideLayer.appendChild(mk(`position:absolute;left:${x}px;top:${y}px;width:${px(9)}px;height:${px(1)}px;background:${RED};transform:translate(-50%,-50%) rotate(45deg);`)) && guideLayer.appendChild(mk(`position:absolute;left:${x}px;top:${y}px;width:${px(9)}px;height:${px(1)}px;background:${RED};transform:translate(-50%,-50%) rotate(-45deg);`));
    function chip(x, y, text) {
        const c = mk(`position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);background:${RED};color:#fff;font:600 ${px(11)}px/1 system-ui,sans-serif;padding:${px(3)}px ${px(6)}px;border-radius:${px(4)}px;white-space:nowrap;`);
        c.textContent = text;
        guideLayer.appendChild(c);
    }
    /** A measured gap: a line between two edges with end ticks and the distance in a red chip. axis "x" runs left to right at height `at`. */
    function drawGap(axis, from, to, at) {
        const len = to - from;
        if (len < 1) return;
        const line = axis === "x" ? `left:${from}px;top:${at}px;width:${len}px;height:${px(1)}px;` : `left:${at}px;top:${from}px;width:${px(1)}px;height:${len}px;`;
        guideLayer.appendChild(mk(`position:absolute;${line}background:${RED};`));
        [from, to].forEach((v) => guideLayer.appendChild(mk(axis === "x"
            ? `position:absolute;left:${v}px;top:${at - px(4)}px;width:${px(1)}px;height:${px(9)}px;background:${RED};`
            : `position:absolute;left:${at - px(4)}px;top:${v}px;width:${px(9)}px;height:${px(1)}px;background:${RED};`)));
        axis === "x" ? chip(from + len / 2, at - px(11), String(Math.round(len))) : chip(at + px(14), from + len / 2, String(Math.round(len)));
    }
    /** The nearest box on each side that overlaps `box` in the other direction. */
    function neighbours(box, targets) {
        const n = { left: null, right: null, up: null, down: null };
        const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
        targets.forEach((r) => {
            if (ov(r.y, r.y + r.h, box.y, box.y + box.h) > 0) {
                if (r.x + r.w <= box.x + 0.5 && (!n.left || r.x + r.w > n.left.x + n.left.w)) n.left = r;
                if (r.x >= box.x + box.w - 0.5 && (!n.right || r.x < n.right.x)) n.right = r;
            }
            if (ov(r.x, r.x + r.w, box.x, box.x + box.w) > 0) {
                if (r.y + r.h <= box.y + 0.5 && (!n.up || r.y + r.h > n.up.y + n.up.h)) n.up = r;
                if (r.y >= box.y + box.h - 0.5 && (!n.down || r.y < n.down.y)) n.down = r;
            }
        });
        return n;
    }
    const mid = (a0, a1, b0, b1) => (Math.max(a0, b0) + Math.min(a1, b1)) / 2;
    const gapBetween = (side, a, b) => (side === "left" ? a.x - (b.x + b.w) : side === "right" ? b.x - (a.x + a.w) : side === "up" ? a.y - (b.y + b.h) : b.y - (a.y + a.h));
    /** Beyond the first neighbour: the next boxes in the same direction that sit the same distance apart, so a whole evenly spaced row shows its gaps. */
    function chainGaps(side, first, d, targets) {
        const out = [];
        let cur = first;
        for (let i = 0; i < 12; i++) {
            const nb = neighbours(cur, targets)[side];
            if (!nb || Math.abs(gapBetween(side, cur, nb) - d) > 0.6) break;
            const horizontal = side === "left" || side === "right";
            const [a, b] = side === "left" || side === "up" ? [nb, cur] : [cur, nb];
            out.push(horizontal
                ? { axis: "x", from: a.x + a.w, to: b.x, at: mid(nb.y, nb.y + nb.h, cur.y, cur.y + cur.h) }
                : { axis: "y", from: a.y + a.h, to: b.y, at: mid(nb.x, nb.x + nb.w, cur.x, cur.x + cur.w) });
            cur = nb;
        }
        return out;
    }
    /** Draw what the box lined up with (only the lines in `keysX` / `keysY`, 0 = start, 1 = centre, 2 = end) and the gaps worth showing. */
    function showGuides(box, targets, keysX, keysY, measure, want = []) {
        guideLayer.innerHTML = "";
        const near = (a, b) => Math.abs(a - b) < 0.6;
        [["x", keysX], ["y", keysY]].forEach(([axis, keys]) => {
            const seen = [];
            keys.forEach((k) => {
                const v = axis === "x" ? three(box.x, box.w)[k] : three(box.y, box.h)[k];
                if (seen.some((p) => near(p, v))) return;
                const parts = targets.map((r) => { const ls = axis === "x" ? three(r.x, r.w) : three(r.y, r.h); const j = ls.findIndex((l) => near(l, v)); return j < 0 ? null : { r, j }; }).filter(Boolean);
                if (!parts.length) return;
                seen.push(v);
                const rs = [box, ...parts.map((p) => p.r)];
                const lo = Math.min(...rs.map((r) => (axis === "x" ? r.y : r.x))), hi = Math.max(...rs.map((r) => (axis === "x" ? r.y + r.h : r.x + r.w)));
                guideLayer.appendChild(mk(axis === "x"
                    ? `position:absolute;left:${v}px;top:${lo}px;width:${px(1)}px;height:${hi - lo}px;background:${RED};`
                    : `position:absolute;top:${v}px;left:${lo}px;height:${px(1)}px;width:${hi - lo}px;background:${RED};`));
                // an x on the box and on the two boxes at the far ends of the line (not on every box in between), at their corners or middles
                const far = [parts.reduce((m, p) => ((axis === "x" ? p.r.y : p.r.x) < (axis === "x" ? m.r.y : m.r.x) ? p : m), parts[0]), parts.reduce((m, p) => ((axis === "x" ? p.r.y + p.r.h : p.r.x + p.r.w) > (axis === "x" ? m.r.y + m.r.h : m.r.x + m.r.w) ? p : m), parts[0])];
                [{ r: box, j: k }, ...far.filter((p, i) => far.indexOf(p) === i)].forEach(({ r, j }) => {
                    const a0 = axis === "x" ? r.y : r.x, a1 = axis === "x" ? r.y + r.h : r.x + r.w;
                    (j === 1 ? [(a0 + a1) / 2] : [a0, a1]).forEach((a) => (axis === "x" ? cross(v, a) : cross(a, v)));
                });
            });
        });
        // gaps: equal spacing between two neighbours is always shown; with Alt, the distance to the nearest box on every side
        const n = neighbours(box, targets);
        const gx = n.left && n.right ? [box.x - (n.left.x + n.left.w), n.right.x - (box.x + box.w)] : null;
        const gy = n.up && n.down ? [box.y - (n.up.y + n.up.h), n.down.y - (box.y + box.h)] : null;
        const eqX = gx && near(gx[0], gx[1]), eqY = gy && near(gy[0], gy[1]);
        // Distances show: with Alt, whenever the box has lined up with something (so you see how far it is from its neighbours), and for equal spacing
        const lined = guideLayer.children.length > 0;
        // `want`: the sides along the direction being moved or resized always get their distance to the neighbouring box
        const sides = measure || lined ? ["left", "right", "up", "down"] : [...new Set([...want, ...(eqX ? ["left", "right"] : []), ...(eqY ? ["up", "down"] : [])])];
        sides.forEach((side) => {
            const r = n[side];
            if (!r) return;
            chainGaps(side, r, gapBetween(side, box, r), targets).forEach((c) => drawGap(c.axis, c.from, c.to, c.at));
            if (side === "left") drawGap("x", r.x + r.w, box.x, mid(r.y, r.y + r.h, box.y, box.y + box.h));
            if (side === "right") drawGap("x", box.x + box.w, r.x, mid(r.y, r.y + r.h, box.y, box.y + box.h));
            if (side === "up") drawGap("y", r.y + r.h, box.y, mid(r.x, r.x + r.w, box.x, box.x + box.w));
            if (side === "down") drawGap("y", box.y + box.h, r.y, mid(r.x, r.x + r.w, box.x, box.x + box.w));
        });
    }
    /** How far to nudge `box` along each axis so it lines up with the boxes around it, or sits an equal distance between two of them. */
    function snapDelta(box, targets, keysX, keysY) {
        const t = px(6);
        const aX = nearestLine(keysX.map((k) => three(box.x, box.w)[k]), targets.map((r) => three(r.x, r.w)), t);
        const aY = nearestLine(keysY.map((k) => three(box.y, box.h)[k]), targets.map((r) => three(r.y, r.h)), t);
        const n = neighbours(box, targets);
        // spacing candidates: an equal distance from the two neighbours either side, or the same distance from a neighbour as that neighbour
        // sits from the box beyond it (an evenly spaced row stays even)
        const likeBeyond = (first, side, boxStart, boxEnd) => {
            if (!first) return null;
            const beyond = neighbours(first, targets)[side];
            if (!beyond) return null;
            const g0 = gapBetween(side, first, beyond);
            if (g0 < 1) return null;
            return side === "left" ? first.x + first.w + g0 - boxStart : side === "right" ? first.x - g0 - boxEnd : side === "up" ? first.y + first.h + g0 - boxStart : first.y - g0 - boxEnd;
        };
        const between = (a, b, boxStart, boxEnd, aEnd, bStart) => (a && b ? ((bStart - boxEnd) - (boxStart - aEnd)) / 2 : null);
        const near = (list) => list.filter((d) => d !== null && Math.abs(d) <= t).sort((p, q) => Math.abs(p) - Math.abs(q))[0];
        const gX = near([between(n.left, n.right, box.x, box.x + box.w, n.left && n.left.x + n.left.w, n.right && n.right.x), likeBeyond(n.left, "left", box.x, box.x + box.w), likeBeyond(n.right, "right", box.x, box.x + box.w)]);
        const gY = near([between(n.up, n.down, box.y, box.y + box.h, n.up && n.up.y + n.up.h, n.down && n.down.y), likeBeyond(n.up, "up", box.y, box.y + box.h), likeBeyond(n.down, "down", box.y, box.y + box.h)]);
        // an exact gap wins over an edge that is about as close: the spacing is the thing that is hard to eyeball
        const choose = (align, gap) => (gap !== undefined && (align === null || Math.abs(gap) <= Math.abs(align) + px(4)) ? gap : align);
        return { dx: choose(aX, gX), dy: choose(aY, gY) }; // null on an axis where nothing was close enough
    }

    // ── Gestures ────────────────────────────────────────────────────────────────────────────
    function startMove(e, all) {
        const items = all.filter((el) => !isLocked(el)); // a locked element stays where it is
        if (!items.length) return;
        const abs = items.filter(isAbs);
        // Alt-drag on an element in the page flow places it freely: it turns absolute (where it is) on the first movement, so an
        // Alt-click alone changes nothing
        if (!abs.length && e.altKey && items[0] && items[0] !== document.body && items[0].parentElement) {
            gesture = { type: "move", freeOnMove: items[0], items: [], sx: e.clientX, sy: e.clientY, moved: false, container: items[0].parentElement };
            return;
        }
        if (abs.length) {
            gesture = { type: "move", items: abs.map((el) => ({ el, g: geomOf(el), pre: sourcesOf(el, ["left", "top"]) })), sx: e.clientX, sy: e.clientY, moved: false, container: abs[0].parentElement || document.body };
        } else {
            gesture = { type: "reorder", el: items[0], rect: pageRect(items[0]), sx: e.clientX, sy: e.clientY, moved: false, before: null };
        }
    }

    function moveGesture(g, e) {
        if (g.freeOnMove) {
            const el = g.freeOnMove;
            g.freeOnMove = null;
            const pre = sourcesOf(el, FREE_PROPS);
            freePosition(el, true);
            g.items = [{ el, g: geomOf(el), pre }];
            g.container = el.parentElement;
            g.freed = true;
            setSelection([el], true);
        }
        let dx = e.clientX - g.sx, dy = e.clientY - g.sy;
        if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        const o = originOf(g.container);
        if (!g.targets) g.targets = targetsFor(g.items.map((i) => i.el));
        const x0 = Math.min(...g.items.map((i) => i.g.x)) + dx, y0 = Math.min(...g.items.map((i) => i.g.y)) + dy;
        const x1 = Math.max(...g.items.map((i) => i.g.x + i.g.w)) + dx, y1 = Math.max(...g.items.map((i) => i.g.y + i.g.h)) + dy;
        const box = { x: x0 + o.x, y: y0 + o.y, w: x1 - x0, h: y1 - y0 };
        const measure = g.freed ? e.metaKey : e.altKey || e.metaKey; // Alt: no snapping, just the distances (an Alt-drag that freed the element: Cmd)
        const s = measure ? { dx: null, dy: null } : snapDelta(box, g.targets, [0, 1, 2], [0, 1, 2]);
        // Snaps are sticky: once locked on a line (a centre, an edge, an equal gap) the box stays there until the pointer has moved a
        // clear distance past it, then it lets go. So it moves in steps from line to line, not smoothly through them.
        g.hold = g.hold || { x: null, y: null };
        const release = px(4);
        if (measure) g.hold = { x: null, y: null };
        [["x", "dx"], ["y", "dy"]].forEach(([a, d]) => {
            const h = g.hold[a], fresh = s[d];
            // keep the line it is on only while it is close, and never over another line that is nearer to the pointer
            if (h !== null && Math.abs(box[a] - h) <= release && (fresh === null || Math.abs(fresh) >= Math.abs(box[a] - h))) s[d] = h - box[a];
            else g.hold[a] = fresh === null ? null : box[a] + fresh;
        });
        s.dx = s.dx || 0; s.dy = s.dy || 0;
        box.x += s.dx; box.y += s.dy;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        const want = ax > 2 * ay ? ["left", "right"] : ay > 2 * ax ? ["up", "down"] : ["left", "right", "up", "down"]; // the axis it is moving along
        showGuides(box, g.targets, [0, 1, 2], [0, 1, 2], measure, want);
        g.items.forEach((i) => { setPx(i.el, "left", i.g.x + dx + s.dx); setPx(i.el, "top", i.g.y + dy + s.dy); });
    }

    // Where would the dragged element land if let go here? Decided from the real layout under the pointer: the container it is over
    // (flex row or column, grid, plain block flow), the child it is next to, and which side of that child.
    const layoutOf = (c) => {
        const cs = getComputedStyle(c);
        if (cs.display.includes("grid")) return "grid";
        if (cs.display.includes("flex")) return cs.flexDirection.startsWith("row") ? "flex row" : "flex column";
        return "page flow";
    };
    function dropTarget(el, x, y) {
        const hit = document.elementsFromPoint(x, y).find((n) => !overlay.contains(n) && n !== root && !el.contains(n)) || document.body;
        // a box that only holds text (a card label, a button-like div) is an item to drop beside, not a container to drop into
        const holdsText = (k) => !k.children.length && k.textContent.trim() !== "";
        let c = hit;
        while (c && c !== document.body && (!CONTAINERS.has(c.tagName.toLowerCase()) || holdsText(c))) c = c.parentElement;
        c = c || document.body;
        const px0 = x + window.scrollX, py0 = y + window.scrollY;
        // near the edge of a container, "before / after it" in its own parent wins over "inside it". For a neighbour of the dragged
        // element the edges are wide (the outer 30%), so passing over it reorders and only aiming at its middle drops inside it.
        if (c !== document.body && c.parentElement) {
            const r = pageRect(c), parentLayout = layoutOf(c.parentElement);
            const horizontalParent = parentLayout === "flex row" || parentLayout === "grid";
            const along = horizontalParent ? r.w : r.h;
            const band = c.parentElement === el.parentElement ? Math.max(8, along * 0.3) : Math.min(14, Math.min(r.w, r.h) / 4);
            const edge = horizontalParent ? Math.min(px0 - r.x, r.x + r.w - px0) : Math.min(py0 - r.y, r.y + r.h - py0);
            if (edge >= 0 && edge < band) return { container: c.parentElement, ref: c, before: horizontalParent ? px0 < r.x + r.w / 2 : py0 < r.y + r.h / 2, horizontal: horizontalParent };
        }
        const kids = Array.prototype.filter.call(c.children, (k) => k !== el && !["SCRIPT", "STYLE"].includes(k.tagName) && !(k.hasAttribute && k.hasAttribute("data-wc-agent-style")));
        if (!kids.length) return { container: c, ref: null };
        // the child the pointer is over, or the nearest one
        let ref = null, best = Infinity;
        kids.forEach((k) => {
            const r = pageRect(k);
            const dx = px0 < r.x ? r.x - px0 : px0 > r.x + r.w ? px0 - r.x - r.w : 0;
            const dy = py0 < r.y ? r.y - py0 : py0 > r.y + r.h ? py0 - r.y - r.h : 0;
            const d = Math.hypot(dx, dy);
            if (d < best) { best = d; ref = k; }
        });
        const r = pageRect(ref), l = layoutOf(c);
        const inline = /^inline/.test(getComputedStyle(ref).display);
        const horizontal = l === "flex row" || (l === "grid" && py0 >= r.y && py0 <= r.y + r.h) || (l === "page flow" && inline);
        return { container: c, ref, before: horizontal ? px0 < r.x + r.w / 2 : py0 < r.y + r.h / 2, horizontal };
    }


    // ── Nudging: a drag moves the element with a pair of margins, and nothing around it moves ──────────────────
    // The margin behind the element grows by the distance dragged and the margin ahead of it shrinks by the same amount (below zero
    // if it has to), so the space it takes in the layout never changes and its neighbours and parent stay exactly where they are.
    // A drag that is clearly meant to put it somewhere else (see wantsBlockDrag) becomes a block drag instead.
    const NUDGE_PROPS = ["margin-left", "margin-right", "margin-top", "margin-bottom", "align-self", "width", "height"];
    const ORANGE = "#f59e0b";
    const kidsOf = (c, skip) => Array.prototype.filter.call(c.children, (k) => k !== skip && !["SCRIPT", "STYLE"].includes(k.tagName) && !(k.hasAttribute && k.hasAttribute("data-wc-agent-style")));
    const canNudge = (el) => !!el.parentElement && el !== document.body && !isAbs(el) && getComputedStyle(el).display !== "inline";
    /** Would dropping at `t` leave the element where it is among its siblings? */
    function sameSlot(el, t) {
        if (t.container !== el.parentElement) return false;
        if (!t.ref) return true;
        const kids = kidsOf(el.parentElement, null), others = kids.filter((k) => k !== el);
        const i = others.indexOf(t.ref);
        return i >= 0 && (t.before ? i : i + 1) === kids.indexOf(el);
    }
    function nudgeStart(g) {
        const el = g.el, par = el.parentElement, cs = getComputedStyle(el), pcs = getComputedStyle(par), pr = pageRect(par);
        const f = (v) => parseFloat(v) || 0;
        const bx = f(pcs.borderLeftWidth) + f(pcs.paddingLeft), bt = f(pcs.borderTopWidth) + f(pcs.paddingTop);
        const box = { x: pr.x + bx, y: pr.y + bt, w: pr.w - bx - f(pcs.borderRightWidth) - f(pcs.paddingRight), h: pr.h - bt - f(pcs.borderBottomWidth) - f(pcs.paddingBottom) };
        const idx = Array.prototype.indexOf.call(par.children, el);
        const others = kidsOf(par, el).filter((k) => !isAbs(k) && getComputedStyle(k).display !== "none").map((k) => ({ el: k, r: pageRect(k), before: Array.prototype.indexOf.call(par.children, k) < idx }));
        const r0 = pageRect(el);
        // which sides are auto (ml-auto, mx-auto, mt-auto ...): that side is left alone and the other one moves
        const tokens = (el.getAttribute("class") || "").split(/\s+/).map((t) => t.replace(/^(?:[\w-]+:)*/, ""));
        const isAuto = (prop, side, ax) => { const v = el.style.getPropertyValue(prop); return v ? v === "auto" : tokens.some((t) => t === "m-auto" || t === `m${ax}-auto` || t === `m${side}-auto`); };
        const auto = { l: isAuto("margin-left", "l", "x"), r: isAuto("margin-right", "r", "x"), t: isAuto("margin-top", "t", "y"), b: isAuto("margin-bottom", "b", "y") };
        // the margins of the neighbours just above and below in the flow, which its own top and bottom margins collapse with
        const flowKids = kidsOf(par, null).filter((k) => !isAbs(k) && getComputedStyle(k).display !== "none"), fi = flowKids.indexOf(el);
        const side = { above: flowKids[fi - 1] ? f(getComputedStyle(flowKids[fi - 1]).marginBottom) : 0, below: flowKids[fi + 1] ? f(getComputedStyle(flowKids[fi + 1]).marginTop) : 0 };
        g.nudge = { w0: cs.width, h0: cs.height, active: false, inl0: inlineOf(el, NUDGE_PROPS), pre: sourcesOf(el, NUDGE_PROPS), m: { x: f(cs.marginLeft), y: f(cs.marginTop) }, f: { x: f(cs.marginRight), y: f(cs.marginBottom) }, auto, side, r0, box, outer: pr, lay: layoutOf(par), others };
    }
    /** The gap two adjoining vertical margins make (they collapse), and the margin that makes `gap` next to `other`. */
    const collapse = (p, q) => (p >= 0 && q >= 0 ? Math.max(p, q) : p <= 0 && q <= 0 ? Math.min(p, q) : p + q);
    const solveCollapse = (gap, other) => (other >= 0 ? (gap >= other ? gap : gap - other) : gap >= 0 ? gap - other : Math.min(gap, other) === gap ? gap : gap - other);
    const sameRect = (p, q) => Math.abs(p.x - q.x) < 1 && Math.abs(p.y - q.y) < 1 && Math.abs(p.w - q.w) < 1 && Math.abs(p.h - q.h) < 1;
    /** Did anything other than the dragged element move? Its neighbours and its parent must stay exactly where they were. */
    const othersStay = (n, el) => n.others.every((o) => sameRect(pageRect(o.el), o.r)) && sameRect(pageRect(el.parentElement), n.outer);
    /** How far the element's margin pushed what comes after it along `a` (a neighbour after it, or the parent growing). */
    function pushed(n, el, a) {
        const Z = a === "x" ? "w" : "h";
        for (const o of n.others) { if (o.r[a] <= n.r0[a]) continue; const d = pageRect(o.el)[a] - o.r[a]; if (Math.abs(d) > 0.5) return d; }
        return pageRect(el.parentElement)[Z] - n.outer[Z];
    }
    const restoreProp = (el, n, p) => { if (n.inl0[p]) el.style.setProperty(p, n.inl0[p]); else el.style.removeProperty(p); };
    function restoreNudge(g) {
        const n = g.nudge;
        if (!n || !n.active) return;
        NUDGE_PROPS.forEach((p) => restoreProp(g.el, n, p));
        tidyStyle(g.el);
        n.active = false;
        guideLayer.innerHTML = "";
    }
    /** Is this axis one that the element's own margin moves its siblings along (block flow down, a flex box along its direction)? */
    const mainAxis = (lay, a) => (lay === "page flow" || lay === "flex column" ? a === "y" : lay === "flex row" ? a === "x" : false);
    const crossAxis = (lay, a) => (lay === "flex row" ? a === "y" : lay === "flex column" ? a === "x" : lay === "grid" ? a === "y" : false);
    /** The line, among the container's edges and centre, its neighbours' edges and the spacing used between them, that `start` .. `start + size` is close to. */
    function containerLine(n, a, start, size) {
        const S = a, Z = a === "x" ? "w" : "h", main = mainAxis(n.lay, a);
        const lines = [{ at: n.box[S], e: "s", k: "start" }, { at: n.box[S] + n.box[Z] / 2, e: "c", k: "centre" }, { at: n.box[S] + n.box[Z], e: "e", k: "end" }];
        const sibs = n.others.filter((o) => !main || o.before);
        sibs.forEach((o) => lines.push({ at: o.r[S], e: "s", k: "sib" }, { at: o.r[S] + o.r[Z] / 2, e: "c", k: "sib" }, { at: o.r[S] + o.r[Z], e: "e", k: "sib" }));
        const gaps = [];
        if (main) {
            const before = n.others.filter((o) => o.before).sort((p, q) => p.r[S] - q.r[S]);
            const all = n.others.slice().sort((p, q) => p.r[S] - q.r[S]);
            for (let i = 1; i < all.length; i++) { const d = all[i].r[S] - (all[i - 1].r[S] + all[i - 1].r[Z]); if (d >= 0) gaps.push(Math.round(d)); }
            const end = before.length ? Math.max(...before.map((o) => o.r[S] + o.r[Z])) : n.box[S];
            const med = gaps.length ? gaps.sort((p, q) => p - q)[Math.floor(gaps.length / 2)] : 0;
            [0, med].forEach((gp) => lines.push({ at: end + gp, e: "s", k: "gap", gap: gp }));
        }
        const T = px(6);
        let best = null, gap = null;
        lines.forEach((c) => {
            const d = c.at - (c.e === "s" ? start : c.e === "c" ? start + size / 2 : start + size);
            if (Math.abs(d) > T) return;
            if (c.k === "gap") { if (!gap || Math.abs(d) < Math.abs(gap.d)) gap = { ...c, d }; } else if (!best || Math.abs(d) < Math.abs(best.d)) best = { ...c, d };
        });
        return gap && (!best || Math.abs(gap.d) <= Math.abs(best.d) + px(4)) ? gap : best; // the spacing wins over an edge that is about as close
    }
    function nudgeGesture(g, e) {
        const n = g.nudge, el = g.el;
        let dx = e.clientX - g.sx, dy = e.clientY - g.sy;
        if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        NUDGE_PROPS.forEach((p) => restoreProp(el, n, p));
        n.active = true;
        const lines = [], said = [];
        const cur = (p) => parseFloat(el.style.getPropertyValue(p)) || 0, used = (p) => parseFloat(getComputedStyle(el)[p === "margin-right" ? "marginRight" : "marginBottom"]) || 0;
        const step = (v) => (e.metaKey ? Math.round(v) : Math.round(v / 4) * 4); // on the Tailwind scale; Cmd: to the pixel
        ["x", "y"].forEach((a) => {
            const d = a === "x" ? dx : dy;
            if (Math.abs(d) < 0.5) return; // not dragged along this axis: nothing to write
            const N = a === "x" ? "margin-left" : "margin-top", F = a === "x" ? "margin-right" : "margin-bottom";
            const autoN = n.auto[a === "x" ? "l" : "t"], autoF = n.auto[a === "x" ? "r" : "b"];
            // pushed from the far side (ml-auto, mx-auto, mt-auto): the auto side stays auto and the other side moves the opposite way;
            // mx-auto becomes ml-auto plus a right margin
            if (autoN) {
                const v = step(n.f[a] - d), want = n.r0[a] + (n.f[a] - v);
                setPx(el, F, v);
                for (let i = 0; i < 2; i++) { const err = want - pageRect(el)[a]; if (Math.abs(err) <= 0.5) break; setPx(el, F, cur(F) - err); }
                return;
            }
            const near = step(n.m[a] + d), dd = near - n.m[a], want = n.r0[a] + dd;
            if (Math.abs(dd) < 0.5) return;
            // sideways in the page flow nothing is pushed (blocks stack), and a right margin does nothing there: the left one alone
            const pair = !autoF && !(a === "x" && n.lay === "page flow");
            if (a === "y" && n.lay === "page flow") {
                // down the page a margin collapses with the neighbour's: the gap is the larger of two positive margins, the sum of a
                // positive and a negative one. So the margins are solved for the gaps wanted above and below, not just added to.
                setPx(el, N, solveCollapse(collapse(n.side.above, n.m.y) + dd, n.side.above));
                if (pair) setPx(el, F, solveCollapse(collapse(n.f.y, n.side.below) - dd, n.side.below));
            } else {
                setPx(el, N, near);
                if (pair) setPx(el, F, n.f[a] - dd);
            }
            // collapsing margins (page flow) and boxes that are centred or spread out don't add up simply: corrected on the real layout,
            // the near margin until the element is where it should be, the far one until nothing after it was pushed
            for (let i = 0; i < 3; i++) {
                const err = want - pageRect(el)[a];
                if (Math.abs(err) > 0.5) setPx(el, N, cur(N) + err);
                const push = pair ? pushed(n, el, a) : 0;
                if (Math.abs(push) > 0.5) setPx(el, F, used(F) - push);
                if (Math.abs(err) <= 0.5 && Math.abs(push) <= 0.5) break;
            }
        });
        // the far half of a pair that changes nothing (a right margin in a column, a bottom one that sets no height) is left off
        ["margin-right", "margin-bottom"].forEach((p) => {
            const v = el.style.getPropertyValue(p);
            if (!v || v === n.inl0[p]) return;
            const look = () => [el, ...n.others.map((o) => o.el), el.parentElement].map(pageRect), before = look();
            restoreProp(el, n, p);
            if (!look().every((q, i) => sameRect(q, before[i]))) el.style.setProperty(p, v);
        });
        // Moving must not resize: an auto-width block narrows as its margin grows, a stretched flex item shrinks. Where the size changed
        // it is pinned to what it was; if something else still resizes it (flex-grow), the far margin gives the difference back.
        let kept = "";
        const rs = pageRect(el);
        if (Math.abs(rs.w - n.r0.w) > 0.5) {
            el.style.setProperty("width", n.w0);
            const again = pageRect(el).w;
            if (Math.abs(again - n.r0.w) > 0.5) {
                restoreProp(el, n, "width");
                setPx(el, "margin-right", (parseFloat(getComputedStyle(el).marginRight) || 0) - (n.r0.w - pageRect(el).w));
            } else kept = `width kept ${Math.round(n.r0.w)}px`;
        }
        if (Math.abs(pageRect(el).h - n.r0.h) > 0.5) { el.style.setProperty("height", n.h0); if (Math.abs(pageRect(el).h - n.r0.h) > 0.5) restoreProp(el, n, "height"); else kept = kept || `height kept ${Math.round(n.r0.h)}px`; }
        if (kept) said.push(kept);
        // what it shows: each margin as an orange measuring line with its number (as Figma shows distances), and the lines it snapped to
        guideLayer.innerHTML = "";
        const r = pageRect(el), cs = getComputedStyle(el), ml = parseFloat(cs.marginLeft) || 0, mt = parseFloat(cs.marginTop) || 0, mr = parseFloat(cs.marginRight) || 0, mb = parseFloat(cs.marginBottom) || 0;
        const isAutoNow = (p, fromClass) => { const v = el.style.getPropertyValue(p); return v ? v === "auto" : fromClass; };
        const auto = isAutoNow("margin-left", n.auto.l), autoT = isAutoNow("margin-top", n.auto.t);
        const tag = (x, y, text) => { const b = guideLayer.appendChild(mk(`position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);background:${ORANGE};color:#fff;font:600 ${px(10)}px/1 system-ui,sans-serif;padding:${px(2)}px ${px(4)}px;border-radius:${px(3)}px;white-space:nowrap;`)); b.textContent = text; return b; };
        // a margin as a line across its length with a tick at each end, through the middle of the element's side, and its number on it;
        // a negative margin runs over the element's own edge and its number has a minus
        const t = px(1), cap = px(6);
        const measure = (a, from, len, at, v) => {
            const css = (x, y, w, h) => guideLayer.appendChild(mk(`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${ORANGE};`));
            const label = `${v < 0 ? "−" : ""}${Math.round(Math.abs(v))}`;
            if (a === "x") { css(from, at - t / 2, len, t); css(from - t / 2, at - cap / 2, t, cap); css(from + len - t / 2, at - cap / 2, t, cap); tag(from + len / 2, at - px(12), label); }
            else { css(at - t / 2, from, t, len); css(at - cap / 2, from - t / 2, cap, t); css(at - cap / 2, from + len - t / 2, cap, t); tag(at + px(8), from + len / 2, label).style.transform = "translate(0,-50%)"; }
        };
        const real = (p) => { const v = el.style.getPropertyValue(p); return v && v !== "auto"; };
        const cy = r.y + r.h / 2, cx = r.x + r.w / 2;
        if (Math.abs(ml) >= 1 && !auto) measure("x", ml > 0 ? r.x - ml : r.x, Math.abs(ml), cy, ml);
        if (Math.abs(mr) >= 1 && real("margin-right")) measure("x", mr > 0 ? r.x + r.w : r.x + r.w + mr, Math.abs(mr), cy, mr);
        if (Math.abs(mt) >= 1 && !autoT) measure("y", mt > 0 ? r.y - mt : r.y, Math.abs(mt), cx, mt);
        if (Math.abs(mb) >= 1 && real("margin-bottom")) measure("y", mb > 0 ? r.y + r.h : r.y + r.h + mb, Math.abs(mb), cx, mb);
        lines.forEach((l) => guideLayer.appendChild(mk(l.a === "x"
            ? `position:absolute;left:${l.at}px;top:${n.box.y}px;width:${px(1)}px;height:${n.box.h}px;background:${RED};`
            : `position:absolute;top:${l.at}px;left:${n.box.x}px;height:${px(1)}px;width:${n.box.w}px;background:${RED};`)));
        dropHint.style.display = "none"; // the numbers on the lines say it all
        ghostBox.style.display = "none"; dropBox.style.display = "none"; insertLine.style.display = "none";
    }


    // ── Dropping into another slot or container: the element takes on the spacing there ──────────────────
    // Margins and alignment that belonged to its old place are cleaned off, it gets the rhythm its new neighbours use (their
    // margin-top, or margin-bottom), the neighbour it left behind loses the spacing it only had for it, and dropped near the
    // centre or the end of a column it is centred or pushed there. Everything goes through the same pixels-to-classes step as a move.
    const inFlow = (k) => !isAbs(k) && getComputedStyle(k).display !== "none";
    const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
    function dropSmart(g, e, old, wasFirst, wasLast) {
        const el = g.el, par = el.parentElement;
        if (!par || el === document.body) return [];
        const plan = new Map(); // element -> { set: {prop: px | word}, clear: [class groups] }
        const of = (k) => { if (!plan.has(k)) plan.set(k, { set: {}, clear: [] }); return plan.get(k); };
        const f = (v) => parseFloat(v) || 0;
        const has = (k, re) => (k.getAttribute("class") || "").split(/\s+/).some((t) => re.test(t.replace(/^(?:[\w-]+:)*/, "")));
        const flow = (c) => kidsOf(c, null).filter(inFlow);
        const lay = layoutOf(par), moved = par !== old;
        // a margin on one side, as the value it should have: a class that gave it a value is taken off to get 0
        const want = (k, prop, v) => {
            const group = prop === "margin-top" ? "mt" : "mb";
            if (Math.abs(f(getComputedStyle(k)[prop === "margin-top" ? "marginTop" : "marginBottom"]) - v) < 0.5) return;
            if (v === 0 && has(k, new RegExp(`^${group}-`))) { const c = of(k).clear; if (!c.includes(group)) c.push(group); } else of(k).set[prop] = v;
        };
        const noMargins = (k, groups) => groups.forEach((gp) => { if (has(k, new RegExp(`^${gp}-(?!auto$)`)) && !of(k).clear.includes(gp)) of(k).clear.push(gp); });
        // 1. alignment and auto margins only mean something in the layout they were made for
        if (moved && lay !== layoutOf(old)) {
            if (has(el, /^self-/)) of(el).clear.push("self");
            ["mx", "ml", "mr"].forEach((gp) => { if (has(el, new RegExp(`^${gp}-auto$`))) of(el).clear.push(gp); });
        }
        // 2. spacing: a gap already spaces its children, so margins along it would double up; in the flow the neighbours' rhythm is kept
        const sibs = flow(par).filter((k) => k !== el);
        if (lay !== "page flow") {
            const pcs = getComputedStyle(par);
            if (lay !== "flex row" && f(pcs.rowGap) > 0) noMargins(el, ["mt", "mb", "my"]);
            if (lay !== "flex column" && f(pcs.columnGap) > 0) noMargins(el, ["ml", "mr", "mx"]);
            // across the box (a row's top and bottom, a column's sides) a margin only shows as a shift, unless the neighbours use it too
            if (moved && sibs.length) {
                const cross = lay === "flex row" || lay === "grid" ? [["marginTop", ["mt", "my"]], ["marginBottom", ["mb", "my"]]] : lay === "flex column" ? [["marginLeft", ["ml", "mx"]], ["marginRight", ["mr", "mx"]]] : [];
                cross.forEach(([side, groups]) => { if (median(sibs.map((k) => f(getComputedStyle(k)[side]))) === 0) noMargins(el, groups); });
            }
        } else if (sibs.length >= 2) {
            const kids = flow(par), i = kids.indexOf(el), cs = sibs.map((k) => getComputedStyle(k));
            const mt = median(cs.slice(1).map((c) => f(c.marginTop))), mb = median(cs.slice(0, -1).map((c) => f(c.marginBottom)));
            if (mt > 0) {
                want(el, "margin-top", i === 0 ? 0 : mt);
                if (kids[i + 1]) want(kids[i + 1], "margin-top", mt);
                if (mb === 0 && f(getComputedStyle(el).marginBottom) > 0) noMargins(el, ["mb"]);
            } else if (mb > 0) {
                want(el, "margin-bottom", i === kids.length - 1 ? 0 : mb);
                if (kids[i - 1]) want(kids[i - 1], "margin-bottom", mb);
                if (f(getComputedStyle(el).marginTop) > 0) noMargins(el, ["mt"]);
            }
        }
        // 3. the place it left: the neighbour that became first (or last) loses the spacing it only had for the element
        if (moved && layoutOf(old) === "page flow") {
            const kids = flow(old);
            if (kids.length >= 2) {
                const cs = kids.map((k) => getComputedStyle(k));
                if (wasFirst && median(cs.slice(1).map((c) => f(c.marginTop))) > 0) want(kids[0], "margin-top", 0);
                if (wasLast && median(cs.slice(0, -1).map((c) => f(c.marginBottom))) > 0) want(kids[kids.length - 1], "margin-bottom", 0);
            }
        }
        // 4. dropped near the middle or the end of a column: centred, or pushed there
        if (!e.metaKey && (lay === "page flow" || lay === "flex column") && isFinite(g.sx)) {
            const r = pageRect(el), tmp = { el };
            nudgeStart(tmp);
            const n = tmp.nudge;
            if (r.w < n.box.w - 1) {
                const at = g.rect.x + (e.clientX - g.sx), hit = containerLine(n, "x", at, r.w);
                if (hit && (hit.k === "centre" || hit.k === "end")) {
                    const props = lay === "flex column" ? { "align-self": hit.k === "centre" ? "center" : "flex-end" } : hit.k === "centre" ? { "margin-left": "auto", "margin-right": "auto" } : { "margin-left": "auto" };
                    const was = inlineOf(el, Object.keys(props));
                    Object.entries(props).forEach(([k, v]) => el.style.setProperty(k, v));
                    const ok = Math.abs(pageRect(el).x - (at + hit.d)) <= 2;
                    Object.keys(props).forEach((k) => { if (was[k]) el.style.setProperty(k, was[k]); else el.style.removeProperty(k); });
                    tidyStyle(el);
                    if (ok) {
                        Object.assign(of(el).set, props);
                        of(el).clear = of(el).clear.filter((gp) => !["mx", "ml", "mr", "self"].includes(gp));
                    }
                }
            }
        }
        const work = [];
        plan.forEach((p, k) => { const props = Object.keys(p.set); if (props.length || p.clear.length) work.push({ k, p, props, pre: sourcesOf(k, props) }); });
        work.forEach(({ k, p }) => Object.entries(p.set).forEach(([prop, v]) => k.style.setProperty(prop, typeof v === "number" ? `${Math.round(v)}px` : v)));
        return work.map(({ k, p, props, pre }) => gestureItem(k, pre, props, p.clear));
    }

    /**
     * When does a margin drag become a block drag (reorder, or move into another container)? From what the drag looks like:
     *  - area: how much of its original place the dragged box has left (60% or more);
     *  - speed: a fast drag past that point means "put it somewhere else";
     *  - holding still: resting 300ms over another place (beside another child, or in another container) once 60% is left;
     *  - position: the pointer out of the parent, or a quick throw, at any time.
     * Once a block drag it stays one until let go; let go in its own place, nothing changes.
     */
    const BLOCK = { area: 0.6, fast: 1, hold: 300, rest: 80, still: 4, flick: 2, flickMin: 60, out: 8 }; // share, screen px/ms, ms (to switch, and before the outline shows), px, px/ms, px, px
    function wantsBlockDrag(g, e) {
        if (g.block) return true;
        if (!g.nudge) nudgeStart(g);
        const n = g.nudge, now = performance.now(), tr = g.trail || (g.trail = []);
        tr.push({ t: now, x: e.clientX, y: e.clientY });
        while (tr.length > 1 && now - tr[0].t > 100) tr.shift();
        const speed = Math.hypot(e.clientX - tr[0].x, e.clientY - tr[0].y) * zoom / Math.max(1, now - tr[0].t);
        const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
        // how much of its place is left: the box where the pointer would put it against where it was
        const r = n.r0, ox = Math.max(0, Math.min(r.x + r.w, r.x + dx + r.w) - Math.max(r.x, r.x + dx)), oy = Math.max(0, Math.min(r.y + r.h, r.y + dy + r.h) - Math.max(r.y, r.y + dy));
        const left = r.w * r.h > 0 ? 1 - (ox * oy) / (r.w * r.h) : 1;
        const o = n.outer, px0 = e.clientX + window.scrollX, py0 = e.clientY + window.scrollY, m = px(BLOCK.out);
        const outside = px0 < o.x - m || px0 > o.x + o.w + m || py0 < o.y - m || py0 > o.y + o.h + m;
        const thrown = speed > BLOCK.flick && Math.hypot(dx, dy) > BLOCK.flickMin;
        // holding still: from where the pointer came to rest; a timer checks again when the time is up, since a still pointer sends nothing
        if (!g.still || Math.hypot(e.clientX - g.still.x, e.clientY - g.still.y) > BLOCK.still) {
            g.still = { x: e.clientX, y: e.clientY, t: now };
            clearTimeout(g.holdTimer);
            g.holdTimer = setTimeout(() => { if (gesture === g && !g.block && g.lastE) reorderGesture(g, g.lastE); }, BLOCK.rest + 10);
        }
        g.lastE = e;
        let held = false;
        g.holding = null;
        if (left >= BLOCK.area) {
            const t = dropTarget(g.el, e.clientX, e.clientY); // the margins moved only this element, so what is under the pointer is real
            if (!sameSlot(g.el, t) && staysInGroup(g.el, t.container)) {
                const time = now - g.still.t;
                held = time >= BLOCK.hold;
                if (time >= BLOCK.rest) g.holding = { t, share: Math.min(1, time / BLOCK.hold) };
            }
        }
        g.block = outside || thrown || (left >= BLOCK.area && (speed > BLOCK.fast || held));
        clearTimeout(g.tick);
        if (g.block) { clearTimeout(g.holdTimer); g.holding = null; }
        else if (g.holding) g.tick = setTimeout(() => { if (gesture === g && !g.block) reorderGesture(g, g.lastE); }, 60); // the outline fills in
        return g.block;
    }
    /** Resting over another place: its outline fills in over the hold time, so the switch is seen coming (and avoided by moving on). */
    function showHolding(g) {
        const h = g.holding;
        if (!h) return;
        const cr = pageRect(h.t.container), tag = h.t.container === document.body ? "page" : h.t.container.tagName.toLowerCase();
        Object.assign(dropBox.style, { display: "block", left: `${cr.x}px`, top: `${cr.y}px`, width: `${cr.w}px`, height: `${cr.h}px`, borderWidth: `${px(1.5)}px`, opacity: String(0.25 + 0.75 * h.share) });
        dropHint.textContent = `Hold to move into ${tag} · ${Math.round(h.share * 100)}%`;
        Object.assign(dropHint.style, { display: "block", left: `${cr.x}px`, top: `${Math.max(0, cr.y - px(22))}px`, fontSize: `${px(11)}px`, padding: `${px(4)}px ${px(7)}px` });
    }
    function reorderGesture(g, e) {
        if (canNudge(g.el) && !wantsBlockDrag(g, e)) { nudgeGesture(g, e); showHolding(g); redraw(); return; }
        dropBox.style.opacity = "";
        restoreNudge(g); // the drop place is worked out on the layout as it really is, not the one the nudge had shifted
        const t = dropTarget(g.el, e.clientX, e.clientY);
        // an element in a group stays in it: a drop outside the group changes nothing (ungroup to take it out)
        const held = !staysInGroup(g.el, t.container);
        g.same = held || sameSlot(g.el, t);
        g.target = t.ref || t.container;
        g.pos = t.ref ? (t.before ? "before" : "after") : "inside";
        // the box that follows the pointer
        const gx = g.rect.x + (e.clientX - g.sx), gy = g.rect.y + (e.clientY - g.sy);
        Object.assign(ghostBox.style, { display: "block", left: `${gx}px`, top: `${gy}px`, width: `${g.rect.w}px`, height: `${g.rect.h}px` });
        // the container it would land in
        const cr = pageRect(held ? groupAround(g.el) : t.container); // held in a group: the group it stays in is outlined
        Object.assign(dropBox.style, { display: "block", left: `${cr.x}px`, top: `${cr.y}px`, width: `${cr.w}px`, height: `${cr.h}px`, borderWidth: `${px(1.5)}px` });
        const tag = t.container === document.body ? "page" : t.container.tagName.toLowerCase();
        dropHint.textContent = held ? "In a group · ungroup to take it out" : g.same ? "Back where it was" : `${t.ref ? "Insert in" : "Drop into"} ${tag} · ${layoutOf(t.container)}`;
        Object.assign(dropHint.style, { display: "block", left: `${cr.x}px`, top: `${Math.max(0, cr.y - px(22))}px`, fontSize: `${px(11)}px`, padding: `${px(4)}px ${px(7)}px` });
        if (!t.ref || g.same) { insertLine.style.display = "none"; return; } // no line where letting go changes nothing
        // the line sits in the gap between the two children it goes between, and never outside the container
        const r = pageRect(t.ref), th = px(2.5);
        const kids = kidsOf(t.container, g.el).filter(inFlow), i = kids.indexOf(t.ref), nb = kids[t.before ? i - 1 : i + 1];
        const nr = nb ? pageRect(nb) : null;
        let at = t.horizontal ? (t.before ? r.x : r.x + r.w) : (t.before ? r.y : r.y + r.h);
        if (nr) at = (at + (t.horizontal ? (t.before ? nr.x + nr.w : nr.x) : (t.before ? nr.y + nr.h : nr.y))) / 2;
        const line = t.horizontal
            ? { l: Math.min(Math.max(at, cr.x), cr.x + cr.w) - th / 2, t: r.y, w: th, h: r.h }
            : { l: Math.max(r.x, cr.x), t: Math.min(Math.max(at, cr.y), cr.y + cr.h) - th / 2, w: Math.min(r.w, cr.w), h: th };
        Object.assign(insertLine.style, { display: "block", left: `${line.l}px`, top: `${line.t}px`, width: `${line.w}px`, height: `${line.h}px` });
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
        // a flex child that flex sizes along its axis (flex-1, grow) ignores a size there: leave that axis alone, or the margin that
        // keeps the opposite edge in place would push it sideways instead
        const fx = !g.abs && g.fx && g.fx.sized ? g.fx.dir : null;
        if (fx === "row") w = g.g.w;
        if (fx === "column") h = g.g.h;
        // the edges being dragged snap to the edges and centres of the boxes around, like a move does
        let keysX = [], keysY = [];
        if (g.rot === 0 && !e.shiftKey && !e.altKey) {
            if (!g.pr) { g.pr = pageRect(g.el); g.targets = targetsFor([g.el]); }
            const t = px(6), pr = g.pr;
            const edgeX = hd.includes("e") ? pr.x + w : hd.includes("w") ? pr.x + pr.w - w : null;
            const edgeY = hd.includes("s") ? pr.y + h : hd.includes("n") ? pr.y + pr.h - h : null;
            let sx = edgeX === null ? null : nearestLine([edgeX], g.targets.map((r) => three(r.x, r.w)), t);
            let sy = edgeY === null ? null : nearestLine([edgeY], g.targets.map((r) => three(r.y, r.h)), t);
            // sticky, like a move: stay on a line until the edge has been dragged clearly past it
            g.hold = g.hold || { x: null, y: null };
            const release = px(4);
            const hold = (edge, fresh, h) => (h !== null && Math.abs(edge - h) <= release && (fresh === null || Math.abs(fresh) >= Math.abs(edge - h)) ? { s: h - edge, h } : { s: fresh, h: fresh === null ? null : edge + fresh });
            if (edgeX !== null) { const r = hold(edgeX, sx, g.hold.x); sx = r.s; g.hold.x = r.h; }
            if (edgeY !== null) { const r = hold(edgeY, sy, g.hold.y); sy = r.s; g.hold.y = r.h; }
            if (sx !== null) w = Math.max(1, hd.includes("e") ? w + sx : w - sx);
            if (sy !== null) h = Math.max(1, hd.includes("s") ? h + sy : h - sy);
            keysX = edgeX === null ? [] : [hd.includes("e") ? 2 : 0];
            keysY = edgeY === null ? [] : [hd.includes("s") ? 2 : 0];
            g.guide = { want: [hd.includes("e") ? "right" : hd.includes("w") ? "left" : null, hd.includes("s") ? "down" : hd.includes("n") ? "up" : null].filter(Boolean), box: { x: hd.includes("w") ? pr.x + pr.w - w : pr.x, y: hd.includes("n") ? pr.y + pr.h - h : pr.y, w, h }, keysX, keysY };
        } else g.guide = null;
        if (fx !== "row") setPx(g.el, "width", w);
        if (fx !== "column") setPx(g.el, "height", h);
        if (!g.abs) {
            if (g.rot === 0) {
                if (hd.includes("w") && fx !== "row") setPx(g.el, "marginLeft", g.ml - (w - g.g.w));
                if (hd.includes("n") && fx !== "column") setPx(g.el, "marginTop", g.mt - (h - g.g.h));
            }
            return;
        }
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

    // Drag a corner dot toward the middle: every corner gets the same radius, previewed inline until the editor applies it as a class or style.
    function radiusGesture(g, e) {
        const th = -g.rot * Math.PI / 180;
        const px0 = e.clientX + window.scrollX - g.c.x, py0 = e.clientY + window.scrollY - g.c.y;
        const lx = px0 * Math.cos(th) - py0 * Math.sin(th) + g.w / 2;
        const ly = px0 * Math.sin(th) + py0 * Math.cos(th) + g.h / 2;
        const east = g.corner.includes("e"), south = g.corner.includes("s");
        const inset = ((east ? g.w - lx : lx) + (south ? g.h - ly : ly)) / 2;
        g.r = Math.max(0, Math.min(Math.round(inset - px(11)), Math.floor(Math.min(g.w, g.h) / 2)));
        g.el.style.borderRadius = `${g.r}px`;
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

    /** A handle drawn by the editor was pressed. The editor then forwards the pointer (hmove / hend) in this frame's coordinates. */
    function beginHandle(hd, e) {
        const el = primary();
        if (!el || el === document.body) return;
        const g = geomOf(el);
        const br = pageRect(el);
        if (hd.startsWith("rad")) {
            gesture = { type: "radius", el, corner: hd.slice(4), c: { x: br.x + br.w / 2, y: br.y + br.h / 2 }, rot: g.rot, w: el.offsetWidth || br.w, h: el.offsetHeight || br.h, prev: el.style.borderRadius, r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, sx: e.clientX, sy: e.clientY, moved: false };
        } else if (hd.startsWith("rot")) {
            const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
            gesture = { type: "rotate", el, cx, cy, a0: Math.atan2(e.clientY + window.scrollY - cy, e.clientX + window.scrollX - cx) * 180 / Math.PI, start: g.rot, moved: false };
        } else {
            const cs0 = getComputedStyle(el);
            gesture = { type: "resize", el, fx: flexItemOf(el), pre: sourcesOf(el, GESTURE_PROPS), inl0: inlineOf(el, GESTURE_PROPS), h: hd, g, abs: g.abs, rot: g.rot, ml: parseFloat(cs0.marginLeft) || 0, mt: parseFloat(cs0.marginTop) || 0, c: { x: br.x + br.w / 2, y: br.y + br.h / 2 }, o: originOf(el.parentElement || document.body), sx: e.clientX, sy: e.clientY, moved: false };
        }
    }

    document.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        if (converting) { e.preventDefault(); return; } // the last drag is still becoming classes (askConvert)
        if (editing && editing.contains(e.target)) return;
        if (editing) finishEdit();
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
        e.preventDefault();

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

    // the pointer over the empty part of the design: the editor outlines the frame, as it does for a frame that isn't open
    let frameHovered = false;
    const hoverFrame = (on) => { if (on !== frameHovered) { frameHovered = on; post({ type: "hoverFrame", on }); } };
    function onMove(e) {
        const g = gesture;
        if (!g) {
            if (!editing && tool === "move") { hov = targetOf(e); redraw(); }
            hoverFrame(!editing && tool === "move" && hov === document.body);
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
        else if (g.type === "resize") { resizeGesture(g, e); if (g.guide) showGuides(g.guide.box, g.targets, g.guide.keysX, g.guide.keysY, false, g.guide.want); else guideLayer.innerHTML = ""; redraw(); }
        else if (g.type === "rotate") { rotateGesture(g, e); redraw(); }
        else if (g.type === "radius") { g.at = { x: e.clientX, y: e.clientY }; radiusGesture(g, e); redraw(); }
        else if (g.type === "marquee") marqueeSelect(g, e);
        else if (g.type === "pan") { post({ type: "pan", dx: e.clientX - g.sx, dy: e.clientY - g.sy }); g.sx = e.clientX; g.sy = e.clientY; }
    }
    document.addEventListener("pointermove", onMove, true);

    function onUp(e) {
        const g = gesture;
        gesture = null;
        clearGuides();
        marqueeBox.style.display = "none";
        root.style.cursor = CURSOR[tool] || "default";
        if (!g) return;
        if (g.notified) post({ type: "gesture", on: false });
        if (g.type === "radius") {
            if (!g.moved) return;
            if (g.prev) g.el.style.borderRadius = g.prev; else g.el.style.removeProperty("border-radius");
            if (!g.el.getAttribute("style")) g.el.removeAttribute("style");
            redraw();
            return post({ type: "radius", path: pathOf(g.el), value: g.r });
        }
        if (g.type === "draw") return finishDraw(g, e);
        if (g.type === "marquee") {
            if (g.moved) setSelection(g.shift ? [...new Set([...sels, ...g.hits])] : g.hits);
            else if (!g.shift) post({ type: "frameClick" }); // a click on the empty part of the design: the frame itself
            return;
        }
        if (g.type === "reorder") { clearTimeout(g.holdTimer); clearTimeout(g.tick); dropBox.style.opacity = ""; }
        if (g.type === "reorder" && g.moved && g.nudge && g.nudge.active) {
            const el = g.el, n = g.nudge;
            // a value that changes nothing is not kept: each written margin (the far one of a pair across a row that something else sets
            // the height of, a pinned width that was already that) is taken off and kept off if nothing on the page moved
            const look = () => [el, ...n.others.map((o) => o.el), el.parentElement].map(pageRect);
            ["margin-right", "margin-bottom", "width", "height", "margin-left", "margin-top"].forEach((p) => {
                const v = el.style.getPropertyValue(p);
                if (v === n.inl0[p]) return;
                const before = look();
                restoreProp(el, n, p);
                if (!look().every((r, i) => sameRect(r, before[i]))) el.style.setProperty(p, v);
            });
            const props = NUDGE_PROPS.filter((p) => el.style.getPropertyValue(p) !== n.inl0[p]); // what the nudge wrote
            tidyStyle(el);
            if (!props.length) return redraw(); // back where it was
            return askConvert([gestureItem(el, n.pre, props)]);
        }
        if (g.type === "reorder" && g.moved && g.same) { redraw(); return; } // a block drag that ended in its own slot: nothing moves
        if (g.type === "reorder" && g.moved && g.target) {
            const was = g.el.parentElement, wasKids = was ? kidsOf(was, null).filter(inFlow) : [];
            const wasFirst = wasKids[0] === g.el, wasLast = wasKids[wasKids.length - 1] === g.el;
            if (g.pos === "before") g.target.before(g.el); else if (g.pos === "after") g.target.after(g.el); else g.target.appendChild(g.el);
            setSelection([g.el]);
            const items = was ? dropSmart(g, e, was, wasFirst, wasLast) : [];
            return items.length ? askConvert(items) : changed();
        }
        if (g.type === "pan") return;
        if (g.type === "move" && g.freeOnMove) return post({ type: "selected", info: describe(primary()) }); // Alt-click: nothing freed
        if (g.moved && g.type === "move") return askConvert(g.items.map((i) => gestureItem(i.el, i.pre, g.freed ? FREE_PROPS : ["left", "top"])));
        if (g.moved && g.type === "resize") {
            // a size or position the resize rewrote without changing it (a corner dragged sideways, the top-left of a box resized from
            // its bottom-right) is dropped, not saved as a class
            [["width", g.g.w], ["height", g.g.h], ["left", g.g.x], ["top", g.g.y]].forEach(([p, was]) => {
                if (!g.inl0[p] && Math.round(parseFloat(g.el.style.getPropertyValue(p))) === Math.round(was)) g.el.style.removeProperty(p);
            });
            tidyStyle(g.el);
            const props = GESTURE_PROPS.filter((p) => g.el.style.getPropertyValue(p) !== g.inl0[p]); // what the resize wrote
            const item = gestureItem(g.el, g.pre, props);
            // pulled along the axis flex sizes it on: nothing changed there, and the editor says why
            if (!g.abs && g.fx && g.fx.sized && (g.fx.dir === "row" ? /[ew]/.test(g.h) : /[ns]/.test(g.h))) item.blocked = g.fx.dir === "row" ? "width" : "height";
            return askConvert([item]);
        }
        if (g.moved) changed();
        else post({ type: "selected", info: describe(primary()) });
    }
    document.addEventListener("pointerup", onUp, true);
    // leaving the frame must also drop the hover highlight (no pointermove arrives once the pointer is outside)
    const dropHover = () => { hoverFrame(false); if (hov && !gesture) { hov = null; redraw(); } };
    root.addEventListener("pointerleave", dropHover);
    document.addEventListener("mouseleave", dropHover);

    const hitAt = (x, y) => document.elementsFromPoint(x, y).find((n) => !overlay.contains(n) && n !== root) || document.body;
    document.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const el = hitAt(e.clientX, e.clientY);
        if (el === document.body || tool !== "move") return;
        const pick = pickable(el);
        if (pick !== el && pick.hasAttribute("data-wc-group")) { // into the group: what is in it under the pointer is picked
            inside = pick;
            let c = el;
            while (c.parentElement && c.parentElement !== pick) c = c.parentElement;
            setSelection([pickable(c)]);
            return;
        }
        setSelection([el]);
        startEdit(el, false);
    }, true);
    document.addEventListener("selectionchange", () => { if (editing) postEditing(); });
    // while typing, keep the editor's copy of the markup (and so the Code panel) current instead of waiting for the edit to finish
    let typingTimer = null;
    document.addEventListener("input", () => {
        if (!editing) return;
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => { if (editing) post({ type: "typing", html: serialize() }); }, 80);
    }, true);
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
        const items = sels.filter((el) => el !== document.body && el.parentElement && !isLocked(el));
        if (items.length < 2) return;
        const par = items[0].parentElement;
        if (items.some((el) => el.parentElement !== par)) return;
        if (!items.every(isAbs)) return items.some(isAbs) ? undefined : groupInFlow(items, par); // free and flowing mixed: nothing sensible
        const gs = items.map((el) => ({ el, g: geomOf(el) }));
        const x0 = Math.min(...gs.map((i) => i.g.x)), y0 = Math.min(...gs.map((i) => i.g.y));
        const x1 = Math.max(...gs.map((i) => i.g.x + i.g.w)), y1 = Math.max(...gs.map((i) => i.g.y + i.g.h));
        const grp = document.createElement("div");
        grp.className = "absolute";
        grp.style.position = "absolute";
        grp.setAttribute("data-wc-group", "");
        setPx(grp, "left", x0); setPx(grp, "top", y0); setPx(grp, "width", x1 - x0); setPx(grp, "height", y1 - y0);
        par.insertBefore(grp, items[0]);
        gs.forEach(({ el, g }) => { grp.appendChild(el); setPx(el, "left", g.x - x0); setPx(el, "top", g.y - y0); });
        setSelection([grp]);
        changed();
    }

    /** Elements in the page flow, a flex box or a grid: a box around them in their place, laid out as their parent lays them out, so
     *  grouping changes nothing on the page (in a grid the box has none of its own: display: contents keeps every cell where it was). */
    function groupInFlow(items, par) {
        const ordered = Array.prototype.filter.call(par.children, (c) => items.includes(c));
        const lay = layoutOf(par), pcs = getComputedStyle(par);
        const grp = document.createElement("div");
        grp.setAttribute("data-wc-group", "");
        par.insertBefore(grp, ordered[0]);
        ordered.forEach((el) => grp.appendChild(el));
        made.add(grp);
        let props = [];
        if (lay === "grid") grp.className = "contents";
        else if (lay !== "page flow") {
            const want = { display: "flex", "flex-direction": pcs.flexDirection, "align-items": pcs.alignItems, "column-gap": pcs.columnGap, "row-gap": pcs.rowGap };
            const plain = { "flex-direction": ["row"], "align-items": ["normal", "stretch"], "column-gap": ["normal", "0px"], "row-gap": ["normal", "0px"] };
            props = Object.keys(want).filter((k) => !(plain[k] || []).includes(want[k]));
            props.forEach((k) => grp.style.setProperty(k, want[k]));
        }
        setSelection([grp]);
        if (props.length) return askConvert([gestureItem(grp, {}, props)]);
        changed();
    }

    /**
     * Shift+A: several free elements in one parent become a flex row or column (whichever way they are spread), in the order
     * they sit, with the gap they have most often, in a free box where they were. The box is the editor's, so it gets Tailwind
     * classes (askConvert); the elements lose their own position and keep their size.
     */
    function autoLayout() {
        const items = sels.filter((el) => isAbs(el) && el.parentElement);
        if (items.length < 2) return;
        const par = items[0].parentElement;
        if (items.some((el) => el.parentElement !== par)) return;
        const rs = items.map((el) => ({ el, r: pageRect(el) }));
        const x0 = Math.min(...rs.map((i) => i.r.x)), y0 = Math.min(...rs.map((i) => i.r.y));
        const x1 = Math.max(...rs.map((i) => i.r.x + i.r.w)), y1 = Math.max(...rs.map((i) => i.r.y + i.r.h));
        const row = (x1 - x0) - Math.max(...rs.map((i) => i.r.w)) >= (y1 - y0) - Math.max(...rs.map((i) => i.r.h));
        rs.sort((a, b) => (row ? a.r.x - b.r.x : a.r.y - b.r.y));
        const gaps = rs.slice(1).map((b, i) => (row ? b.r.x - (rs[i].r.x + rs[i].r.w) : b.r.y - (rs[i].r.y + rs[i].r.h))).map((g) => Math.max(0, Math.round(g))).sort((a, b) => a - b);
        const gap = gaps[Math.floor(gaps.length / 2)] || 0;
        const o = originOf(par);
        const box = document.createElement("div");
        Object.assign(box.style, { position: "absolute", display: "flex", alignItems: "flex-start", gap: `${gap}px` });
        if (!row) box.style.flexDirection = "column";
        setPx(box, "left", x0 - o.x); setPx(box, "top", y0 - o.y);
        par.insertBefore(box, rs[0].el);
        made.add(box);
        rs.forEach(({ el }) => {
            [...el.classList].filter((t) => POSITION_TOKEN.test(t)).forEach((t) => el.classList.remove(t));
            if (!el.classList.length) el.removeAttribute("class");
            ["position", "left", "top", "right", "bottom", "transform"].forEach((p) => el.style.removeProperty(p));
            tidyStyle(el);
            box.appendChild(el);
        });
        setSelection([box], true);
        askConvert([gestureItem(box, {}, ["position", "left", "top", "display", "flex-direction", "align-items", "gap"])]);
    }

    /**
     * Draws the layout grids the design has in Figma (columns, rows, a square grid) over the page, as guides: pass null to clear.
     * Figma's rules: with STRETCH alignment the columns share the width between the margins (offset) with the gutter between them;
     * otherwise each is sectionSize wide and the set sits at the start, middle or end.
     */
    function drawLayoutGrids(grids) {
        gridLayer.innerHTML = "";
        if (!grids || !grids.length) return;
        const b = document.body.getBoundingClientRect();
        const W = b.width, H = Math.max(b.height, document.body.scrollHeight);
        const o = originOf(document.body);
        for (const g of grids) {
            const c = g.color || { r: 1, g: 0, b: 0, a: 0.1 };
            const colour = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a ?? 0.1})`;
            if (g.pattern === "GRID" && g.sectionSize > 0) {
                gridLayer.appendChild(mk(`position:absolute;left:${o.x}px;top:${o.y}px;width:${W}px;height:${H}px;background-image:linear-gradient(to right,${colour} 1px,transparent 1px),linear-gradient(to bottom,${colour} 1px,transparent 1px);background-size:${g.sectionSize}px ${g.sectionSize}px;`));
                continue;
            }
            const horizontal = g.pattern === "COLUMNS", total = horizontal ? W : H;
            const count = Number.isFinite(g.count) && g.count > 0 ? g.count : 0, gutter = g.gutterSize || 0, offset = g.offset || 0;
            if (!count) continue;
            const stretch = g.alignment === "STRETCH" || !g.sectionSize;
            const size = stretch ? (total - 2 * offset - (count - 1) * gutter) / count : g.sectionSize;
            const used = count * size + (count - 1) * gutter;
            const start = stretch ? offset : g.alignment === "CENTER" ? (total - used) / 2 : g.alignment === "MAX" ? total - offset - used : offset;
            for (let i = 0; i < count; i++) {
                const at = start + i * (size + gutter);
                gridLayer.appendChild(mk(horizontal
                    ? `position:absolute;left:${o.x + at}px;top:${o.y}px;width:${size}px;height:${H}px;background:${colour};`
                    : `position:absolute;left:${o.x}px;top:${o.y + at}px;width:${W}px;height:${size}px;background:${colour};`));
            }
        }
    }

    /**
     * Shift+G: free elements that sit in a matrix (every column in line, every row in line, a cell each) become a grid: columns as wide as
     * their widest cell, the gaps they have most often, in a free box where they were, like Shift+A does for a row or column. Anything that
     * is not a clean matrix is left alone.
     */
    function gridLayout() {
        const items = sels.filter((el) => isAbs(el) && el.parentElement && !isLocked(el));
        if (items.length < 4) return;
        const par = items[0].parentElement;
        if (items.some((el) => el.parentElement !== par)) return;
        const rs = items.map((el) => ({ el, r: pageRect(el) }));
        const T = 3; // pixels of slack
        const cluster = (values) => {
            const out = [];
            [...values].sort((a, b) => a - b).forEach((v) => { const l = out[out.length - 1]; if (l && v - l.max <= T) { l.max = v; l.sum += v; l.n++; } else out.push({ max: v, sum: v, n: 1 }); });
            return out.map((c) => c.sum / c.n);
        };
        const xs = cluster(rs.map((i) => i.r.x)), ys = cluster(rs.map((i) => i.r.y));
        if (xs.length < 2 || ys.length < 2 || xs.length * ys.length !== rs.length) return;
        const cell = Array.from({ length: ys.length }, () => Array(xs.length).fill(null));
        for (const i of rs) {
            const c = xs.findIndex((x) => Math.abs(x - i.r.x) <= T), r = ys.findIndex((y) => Math.abs(y - i.r.y) <= T);
            if (c < 0 || r < 0 || cell[r][c]) return;
            cell[r][c] = i;
        }
        const colW = xs.map((_, c) => Math.max(...cell.map((row) => row[c].r.w)));
        const rowH = ys.map((_, r) => Math.max(...cell[r].map((i) => i.r.h)));
        const median = (list) => { const s = list.map((g) => Math.max(0, Math.round(g))).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
        const gapX = median(xs.slice(1).map((x, c) => x - (xs[c] + colW[c]))), gapY = median(ys.slice(1).map((y, r) => y - (ys[r] + rowH[r])));
        const o = originOf(par);
        const box = document.createElement("div");
        Object.assign(box.style, { position: "absolute", display: "grid", alignItems: "start", justifyItems: "start", columnGap: `${gapX}px`, rowGap: `${gapY}px`, gridTemplateColumns: colW.map((w) => `${Math.round(w)}px`).join(" ") });
        setPx(box, "left", xs[0] - o.x); setPx(box, "top", ys[0] - o.y);
        par.insertBefore(box, rs[0].el);
        made.add(box);
        cell.flat().forEach(({ el }) => {
            [...el.classList].filter((t) => POSITION_TOKEN.test(t)).forEach((t) => el.classList.remove(t));
            if (!el.classList.length) el.removeAttribute("class");
            ["position", "left", "top", "right", "bottom", "transform"].forEach((p) => el.style.removeProperty(p));
            tidyStyle(el);
            box.appendChild(el);
        });
        setSelection([box], true);
        askConvert([gestureItem(box, {}, ["position", "left", "top", "display", "grid-template-columns", "align-items", "justify-items", "column-gap", "row-gap"])]);
    }

    function ungroup() {
        const el = primary();
        if (!el || el === document.body || !el.children.length || !el.parentElement) return;
        if (!isAbs(el)) {
            if (!el.hasAttribute("data-wc-group")) return; // only a box Ctrl+G made is taken apart; any other box is part of the design
            const kids = Array.prototype.slice.call(el.children);
            kids.forEach((k) => el.before(k));
            el.remove();
            setSelection(kids);
            return changed();
        }
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
        const items = sels.filter((el) => isAbs(el) && !isLocked(el));
        if (!items.length) return;
        items.forEach((el) => { const g = geomOf(el); setPx(el, "left", g.x + dx); setPx(el, "top", g.y + dy); });
        changed(false, "nudge");
    }

    const POSITION_TOKEN = /^(?:[\w-]+:)*(?:absolute|fixed|-?(?:left|top|right|bottom|inset(?:-[xy])?)-\S+)$/;
    const FREE_PROPS = ["position", "left", "top", "width", "height"];
    function freePosition(el, on) {
        if (!el || el === document.body) return;
        if (on) {
            if (isAbs(el)) return;
            const par = el.parentElement || document.body;
            ensurePositioned(par);
            const o = originOf(par);
            const r = pageRect(el);
            el.style.position = "absolute"; // as pixels for now: askConvert turns them into classes on a Tailwind element
            // an absolute box's margins still push it, so they come off its left / top: it stays exactly where it was
            const cs = getComputedStyle(el);
            setPx(el, "left", r.x - o.x - (parseFloat(cs.marginLeft) || 0)); setPx(el, "top", r.y - o.y - (parseFloat(cs.marginTop) || 0));
            // keep the size only where being absolute would change it (a full-width block shrinks to its content)
            [["width", "w"], ["height", "h"]].forEach(([p, k]) => { if (Math.abs(pageRect(el)[k] - r[k]) > 0.5) setPx(el, p, r[k]); });
        } else {
            // the position classes too, at any breakpoint (absolute md:left-[..] top-10 ...); a size it was given stays
            [...el.classList].filter((t) => POSITION_TOKEN.test(t)).forEach((t) => el.classList.remove(t));
            if (!el.classList.length) el.removeAttribute("class");
            ["position", "left", "top", "width", "height", "transform"].forEach((p) => el.style.removeProperty(p));
            if (!el.getAttribute("style")) el.removeAttribute("style");
        }
    }

    /**
     * Layer order is the order among siblings in the HTML (a later sibling is drawn over an earlier one; in a flex row or column it is also
     * the order across), as in Figma. mode: front, back (all the way), forward, backward (one step). A selection keeps its own order.
     */
    function reorder(mode) {
        const items = sels.filter((el) => el !== document.body && el.parentElement && !isLocked(el));
        if (!items.length) return;
        for (const par of new Set(items.map((el) => el.parentElement))) {
            const mine = Array.prototype.filter.call(par.children, (c) => items.includes(c)); // in page order
            if (mode === "front") mine.forEach((el) => par.appendChild(el));
            else if (mode === "back") [...mine].reverse().forEach((el) => par.insertBefore(el, par.firstElementChild));
            else if (mode === "forward") [...mine].reverse().forEach((el) => { const n = el.nextElementSibling; if (n && !items.includes(n)) n.after(el); });
            else if (mode === "backward") mine.forEach((el) => { const p = el.previousElementSibling; if (p && !items.includes(p)) p.before(el); });
        }
        changed();
    }

    /** Lock or unlock the selection (all locked when any is not, else all unlocked). */
    function toggleLockSelection() {
        const items = sels.filter((el) => el !== document.body);
        if (!items.length) return;
        const on = !items.every((el) => el.hasAttribute("data-wc-locked"));
        items.forEach((el) => (on ? el.setAttribute("data-wc-locked", "") : el.removeAttribute("data-wc-locked")));
        changed();
    }

    /** Hide or show the selection: Tailwind's `hidden` class, so the code says so too. */
    function toggleHiddenSelection() {
        const items = sels.filter((el) => el !== document.body);
        if (!items.length) return;
        const on = !items.every((el) => el.classList.contains("hidden"));
        items.forEach((el) => { el.classList.toggle("hidden", on); if (!el.getAttribute("class")) el.removeAttribute("class"); });
        changed();
    }

    // ── Keyboard ────────────────────────────────────────────────────────────────────────────
    document.addEventListener("keydown", (e) => {
        // Ctrl/Cmd + = / - / 0 zoom the plane, never this frame's page
        if ((e.metaKey || e.ctrlKey) && !e.altKey && ["=", "+", "-", "_", "0"].includes(e.key)) { e.preventDefault(); post({ type: "zoomKey", key: e.key }); return; }
        if (editing) {
            if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); finishEdit(); }
            return;
        }
        const meta = e.metaKey || e.ctrlKey;
        const k = e.key.toLowerCase();
        if (e.code === "Space") { e.preventDefault(); post({ type: "space", down: true }); return; }
        if (meta && k === "g") { e.preventDefault(); e.shiftKey ? ungroup() : group(); return; }
        if (meta && (e.code === "BracketRight" || e.code === "BracketLeft")) { e.preventDefault(); reorder(e.code === "BracketRight" ? (e.shiftKey ? "front" : "forward") : (e.shiftKey ? "back" : "backward")); return; }
        if (meta && e.shiftKey && k === "l") { e.preventDefault(); toggleLockSelection(); return; }
        if (meta && e.shiftKey && k === "h") { e.preventDefault(); toggleHiddenSelection(); return; }
        if (e.shiftKey && !meta && k === "a") { e.preventDefault(); autoLayout(); return; }
        if (e.shiftKey && !meta && k === "g") { e.preventDefault(); gridLayout(); return; }
        if (meta && k === "d") { e.preventDefault(); duplicate(); return; }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSelection(); return; }
        if (e.key.startsWith("Arrow") && sels.length) {
            e.preventDefault();
            const s = e.shiftKey ? 10 : 1;
            nudge(e.key === "ArrowLeft" ? -s : e.key === "ArrowRight" ? s : 0, e.key === "ArrowUp" ? -s : e.key === "ArrowDown" ? s : 0);
            return;
        }
        if (e.key === "Escape") { e.preventDefault(); if (tool !== "move") setTool("move"); else if (inside && sels.length && sels.every((el) => inside.contains(el))) setSelection([inside]); else setSelection([]); return; }
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
        infoTimer = setTimeout(() => {
            if (gesture) return;
            if (primary() && alive(primary())) post({ type: "info", info: describe(primary()) });
            else post({ type: "body", info: describe(document.body) }); // nothing selected: the page panel's styling of the body
        }, 150);
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
        /** Another tag for the element (div -> section, p -> h2...), if it's one it can validly become: attributes and children move over unchanged. */
        setTag: (el, m) => {
            const tag = String(m.tag || "").toLowerCase();
            if (tag === el.tagName.toLowerCase() || !tagOptions(el).includes(tag)) return;
            const next = document.createElement(tag);
            Array.prototype.forEach.call(el.attributes, (at) => next.setAttribute(at.name, at.value));
            while (el.firstChild) next.appendChild(el.firstChild);
            el.replaceWith(next);
            if (made.has(el)) made.add(next);
            sels = sels.map((x) => (x === el ? next : x));
        },
        setText: (el, m) => { if (el.children.length === 0) el.textContent = m.text; },
        setAttr: (el, m) => { m.value === null ? el.removeAttribute(m.name) : el.setAttribute(m.name, m.value); },
        remove: (el) => { const p = el.parentElement; el.remove(); sels = p && p !== root ? [p] : []; },
        duplicate: (el) => { const c = el.cloneNode(true); el.after(c); if (made.has(el)) markMade(c); sels = [c]; },
        move: (el, m) => {
            if (m.dir < 0 && el.previousElementSibling) el.previousElementSibling.before(el);
            if (m.dir > 0 && el.nextElementSibling) el.nextElementSibling.after(el);
        },
        front: (el) => { if (el.parentElement) el.parentElement.appendChild(el); },
        back: (el) => { const p = el.parentElement; if (p) p.insertBefore(el, p.firstElementChild); },
        toggleLock: (el) => { if (el.hasAttribute("data-wc-locked")) el.removeAttribute("data-wc-locked"); else el.setAttribute("data-wc-locked", ""); },
        toggleHidden: (el) => { el.classList.toggle("hidden"); if (!el.getAttribute("class")) el.removeAttribute("class"); },
        moveTo: (el, m) => {
            const t = elAt(m.targetPath);
            if (!t || el.contains(t) || el === t) return;
            if (!staysInGroup(el, m.position === "inside" ? t : t.parentElement)) return; // in a group: it stays there until ungrouped
            if (m.position === "before") t.before(el);
            else if (m.position === "after") t.after(el);
            else t.appendChild(el);
        },
        replaceOuter: (el, m) => {
            const tpl = document.createElement("template");
            tpl.innerHTML = m.html;
            const n = tpl.content.firstElementChild;
            if (n) { el.replaceWith(n); sels = sels.includes(el) ? sels.map((x) => (x === el ? n : x)) : sels; } // the selection stays where it is
        },
        insert: (el, m) => {
            const tpl = document.createElement("template");
            tpl.innerHTML = m.html;
            const n = tpl.content.firstElementChild;
            if (!n) return;
            if (m.position === "inside") el.appendChild(n); else el.after(n);
            markMade(n);
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

        setStyleProps: (el, m) => {
            Object.keys(m.props).forEach((prop) => { const v = m.props[prop]; if (v === null || v === "") el.style.removeProperty(prop); else el.style.setProperty(prop, v); });
            if (!el.getAttribute("style")) el.removeAttribute("style");
        },
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
        if (m.cmd === "select") { if (Array.isArray(m.paths)) setSelection(m.paths.map(elAt).filter(Boolean)); else select(elAt(m.path)); return; } // paths: several at once
        if (m.cmd === "deselect") { editing = null; setSelection([], true); post({ type: "body", info: describe(document.body) }); return; } // the page's styling, for the page panel
        if (m.cmd === "hover") { hov = m.path ? elAt(m.path) : null; redraw(); return; }
        if (m.cmd === "tool") { setTool(m.tool, true); return; }
        if (m.cmd === "cssProps") { cssProps = m.props || []; return; }
        if (m.cmd === "hstart") { beginHandle(m.hd, m.e); return; }
        if (m.cmd === "hmove") { onMove(m.e); return; }
        if (m.cmd === "hend") { onUp(m.e); return; }
        if (m.cmd === "exec") {
            if (editing && m.name) { editing.focus(); document.execCommand(m.name, false, m.arg || null); postEditing(); }
            return;
        }
        if (m.cmd === "view") { zoom = m.zoom || 1; redraw(); return; }
        if (m.cmd === "scrollTo") { const el = elAt(m.path); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
        if (m.cmd === "align") { align(m.mode); return; }
        if (m.cmd === "order") { reorder(m.mode); return; }
        if (m.cmd === "lockSel") { toggleLockSelection(); return; }
        if (m.cmd === "hideSel") { toggleHiddenSelection(); return; }
        if (m.cmd === "group") { group(); return; }
        if (m.cmd === "ungroup") { ungroup(); return; }
        if (m.cmd === "deleteSel") { removeSelection(); return; }
        if (m.cmd === "duplicateSel") { duplicate(); return; }
        if (m.cmd === "applyGesture") { applyGesture(m); return; }
        if (m.cmd === "freePosition") {
            const el = elAt(m.path);
            if (!el) return;
            if (!m.on) { freePosition(el, false); changed(); return; }
            if (isAbs(el)) return;
            const pre = sourcesOf(el, FREE_PROPS);
            freePosition(el, true);
            askConvert([gestureItem(el, pre, FREE_PROPS)]);
            return;
        }
        if (m.cmd === "autoLayout") { autoLayout(); return; }
        if (m.cmd === "gridLayout") { gridLayout(); return; }
        if (m.cmd === "layoutGrids") { drawLayoutGrids(m.on ? m.grids : null); return; }
        if (m.cmd === "setProp") {
            const el = elAt(m.path);
            if (el) setProp(el, m).then(() => { changed(false, m.key); if (primary() && alive(primary())) post({ type: "selected", info: describe(primary()) }); });
            return;
        }
        if (mutate[m.cmd]) {
            const el = elAt(m.path);
            if (!el) return;
            mutate[m.cmd](el, m);
            changed(false, m.key); // the editor's undo key comes back with the result
            if (primary() && alive(primary())) post({ type: "selected", info: describe(primary()) });
        }
    });

    post({ type: "ready", html: serialize(), tree: tree() });
    // the page panel shows the page's styling from the start: sent again once the styles have loaded, when the values are real
    const postBody = () => { if (!primary()) post({ type: "body", info: describe(document.body) }); };
    postBody();
    if (document.readyState === "complete") setTimeout(postBody, 300); else window.addEventListener("load", () => setTimeout(postBody, 100));
}
