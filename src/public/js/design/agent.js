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
    overlay.append(hoverBox, guideLayer, draftBox, marqueeBox, ghostBox, dropBox, insertLine, dropHint);
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
        const handles = Boolean(el && sels.length === 1 && el !== document.body && tool === "move" && !editing);
        let label = "", at = null;
        if (el && el !== document.body && gesture && gesture.moved) {
            const g = geomOf(el);
            if (gesture.type === "radius") { label = `Radius ${gesture.r}`; at = gesture.at; }
            else label = sels.length > 1 ? `${sels.length} selected` : `${g.w} × ${g.h}`;
        }
        const bbox = el && el !== document.body && alive(el) ? pageRect(el) : null;
        const data = JSON.stringify({ items, handles, label, bbox, at });
        if (data !== lastOverlay) { lastOverlay = data; post({ type: "overlay", items, handles, label, bbox, at }); }
        place(hoverBox, tool === "move" && hov && !sels.includes(hov) ? hov : null);
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
    const GESTURE_PROPS = ["width", "height", "left", "top", "margin-left", "margin-top"];
    const inlineOf = (el, props) => { const o = {}; props.forEach((p) => { o[p] = el.style.getPropertyValue(p); }); return o; };
    /** What the editor needs to turn an element's new inline pixels into classes: the values, its classes, and where each value came from before. */
    function gestureItem(el, pre, props) {
        const values = {};
        props.forEach((p) => { const v = el.style.getPropertyValue(p); if (v && !el.style.getPropertyPriority(p)) values[p] = v; });
        return { path: pathOf(el), classes: el.getAttribute("class") || "", made: made.has(el), pre: pre || {}, values };
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
        const work = (m.items || []).map((it) => ({ it, el: elAt(it.path), props: Object.keys(it.tokens || {}) })).filter((w) => w.el && w.props.length);
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
            sources: sourcesOf(el, cssProps),
            flexItem: flexItemOf(el),
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
    function startMove(e, items) {
        const abs = items.filter(isAbs);
        if (abs.length) {
            gesture = { type: "move", items: abs.map((el) => ({ el, g: geomOf(el), pre: sourcesOf(el, ["left", "top"]) })), sx: e.clientX, sy: e.clientY, moved: false, container: abs[0].parentElement || document.body };
        } else {
            gesture = { type: "reorder", el: items[0], rect: pageRect(items[0]), sx: e.clientX, sy: e.clientY, moved: false, before: null };
        }
    }

    function moveGesture(g, e) {
        let dx = e.clientX - g.sx, dy = e.clientY - g.sy;
        if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        const o = originOf(g.container);
        if (!g.targets) g.targets = targetsFor(g.items.map((i) => i.el));
        const x0 = Math.min(...g.items.map((i) => i.g.x)) + dx, y0 = Math.min(...g.items.map((i) => i.g.y)) + dy;
        const x1 = Math.max(...g.items.map((i) => i.g.x + i.g.w)) + dx, y1 = Math.max(...g.items.map((i) => i.g.y + i.g.h)) + dy;
        const box = { x: x0 + o.x, y: y0 + o.y, w: x1 - x0, h: y1 - y0 };
        const measure = e.altKey || e.metaKey; // Alt: no snapping, just the distances to what is around
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
        let c = hit;
        while (c && c !== document.body && !CONTAINERS.has(c.tagName.toLowerCase())) c = c.parentElement;
        c = c || document.body;
        const px0 = x + window.scrollX, py0 = y + window.scrollY;
        // near the edge of a container, "before / after it" in its own parent wins over "inside it"
        if (c !== document.body && c.parentElement) {
            const r = pageRect(c), band = Math.min(14, Math.min(r.w, r.h) / 4);
            const parentLayout = layoutOf(c.parentElement);
            const horizontalParent = parentLayout === "flex row" || parentLayout === "grid";
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

    function reorderGesture(g, e) {
        const t = dropTarget(g.el, e.clientX, e.clientY);
        g.target = t.ref || t.container;
        g.pos = t.ref ? (t.before ? "before" : "after") : "inside";
        // the box that follows the pointer
        const gx = g.rect.x + (e.clientX - g.sx), gy = g.rect.y + (e.clientY - g.sy);
        Object.assign(ghostBox.style, { display: "block", left: `${gx}px`, top: `${gy}px`, width: `${g.rect.w}px`, height: `${g.rect.h}px` });
        // the container it would land in
        const cr = pageRect(t.container);
        Object.assign(dropBox.style, { display: "block", left: `${cr.x}px`, top: `${cr.y}px`, width: `${cr.w}px`, height: `${cr.h}px`, borderWidth: `${px(1.5)}px` });
        const tag = t.container === document.body ? "page" : t.container.tagName.toLowerCase();
        dropHint.textContent = `${t.ref ? "Insert in" : "Drop into"} ${tag} · ${layoutOf(t.container)}`;
        Object.assign(dropHint.style, { display: "block", left: `${cr.x}px`, top: `${Math.max(0, cr.y - px(22))}px`, fontSize: `${px(11)}px`, padding: `${px(4)}px ${px(7)}px` });
        if (!t.ref) { insertLine.style.display = "none"; return; }
        const r = pageRect(t.ref), th = px(2.5);
        const line = t.horizontal ? { l: (t.before ? r.x : r.x + r.w) - th / 2, t: r.y, w: th, h: r.h } : { l: r.x, t: (t.before ? r.y : r.y + r.h) - th / 2, w: r.w, h: th };
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

    function onMove(e) {
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
        if (g.type === "marquee") { if (g.moved) setSelection(g.shift ? [...new Set([...sels, ...g.hits])] : g.hits); return; }
        if (g.type === "reorder" && g.moved && g.target) {
            if (g.pos === "before") g.target.before(g.el); else if (g.pos === "after") g.target.after(g.el); else g.target.appendChild(g.el);
            setSelection([g.el]);
            return changed();
        }
        if (g.type === "pan") return;
        if (g.moved && g.type === "move") return askConvert(g.items.map((i) => gestureItem(i.el, i.pre, ["left", "top"])));
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
    const dropHover = () => { if (hov && !gesture) { hov = null; redraw(); } };
    root.addEventListener("pointerleave", dropHover);
    document.addEventListener("mouseleave", dropHover);

    const hitAt = (x, y) => document.elementsFromPoint(x, y).find((n) => !overlay.contains(n) && n !== root) || document.body;
    document.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const el = hitAt(e.clientX, e.clientY);
        if (el === document.body || tool !== "move") return;
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
        duplicate: (el) => { const c = el.cloneNode(true); el.after(c); if (made.has(el)) markMade(c); sels = [c]; },
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
        freePosition: (el, m) => freePosition(el, m.on),
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
        if (m.cmd === "select") { select(elAt(m.path)); return; }
        if (m.cmd === "deselect") { editing = null; setSelection([], true); return; }
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
        if (m.cmd === "group") { group(); return; }
        if (m.cmd === "ungroup") { ungroup(); return; }
        if (m.cmd === "deleteSel") { removeSelection(); return; }
        if (m.cmd === "duplicateSel") { duplicate(); return; }
        if (m.cmd === "applyGesture") { applyGesture(m); return; }
        if (m.cmd === "setProp") {
            const el = elAt(m.path);
            if (el) setProp(el, m).then(() => { changed(); if (primary() && alive(primary())) post({ type: "selected", info: describe(primary()) }); });
            return;
        }
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
