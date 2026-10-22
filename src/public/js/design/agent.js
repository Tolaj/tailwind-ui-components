// Runs INSIDE the sandboxed preview iframe (stringified via Function.toString).
// Everything it needs must be defined within agentMain. The sandbox has no same-origin access,
// so all communication with the editor is postMessage.
export function agentMain() {
    const root = document.documentElement;
    const post = (m) => parent.postMessage(m, "*");

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
    const hoverBox = document.createElement("div");
    const selBox = document.createElement("div");
    const tagLabel = document.createElement("div");
    hoverBox.style.cssText = "position:absolute;border:1px solid #3b82f6;background:rgba(59,130,246,.07);pointer-events:none;display:none;box-sizing:border-box;";
    selBox.style.cssText = "position:absolute;border:2px solid #2563eb;pointer-events:none;display:none;box-sizing:border-box;";
    tagLabel.style.cssText = "position:absolute;background:#2563eb;color:#fff;font:600 11px/1 system-ui,sans-serif;padding:3px 6px;border-radius:3px;display:none;white-space:nowrap;pointer-events:none;";
    overlay.append(hoverBox, selBox, tagLabel);
    root.appendChild(overlay);

    let sel = null;
    let hov = null;
    let editing = null;

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
        for (const i of path || []) {
            el = el && el.children[i];
            if (!el) return null;
        }
        return el;
    };

    const place = (box, el) => {
        if (!el || !document.contains(el)) { box.style.display = "none"; return; }
        const r = el.getBoundingClientRect();
        box.style.display = "block";
        box.style.left = r.left + window.scrollX + "px";
        box.style.top = r.top + window.scrollY + "px";
        box.style.width = r.width + "px";
        box.style.height = r.height + "px";
    };
    const redraw = () => {
        place(selBox, sel);
        place(hoverBox, hov && hov !== sel ? hov : null);
        if (sel && document.contains(sel)) {
            const r = sel.getBoundingClientRect();
            tagLabel.textContent = sel.tagName.toLowerCase();
            tagLabel.style.display = "block";
            tagLabel.style.left = r.left + window.scrollX + "px";
            tagLabel.style.top = Math.max(0, r.top + window.scrollY - 20) + "px";
        } else tagLabel.style.display = "none";
    };

    const ATTRS = ["src", "href", "alt", "placeholder", "type", "value", "title", "id", "name", "target", "srcset"];
    const describe = (el) => {
        if (!el) return null;
        const attrs = {};
        ATTRS.forEach((a) => { if (el.hasAttribute(a)) attrs[a] = el.getAttribute(a); });
        const crumbs = [];
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
            crumbs.unshift({ tag: n.tagName.toLowerCase(), path: n === document.body ? [] : pathOf(n) });
        }
        return {
            path: el === document.body ? [] : pathOf(el),
            tag: el.tagName.toLowerCase(),
            classes: el.getAttribute("class") || "",
            leaf: el.children.length === 0,
            text: el.children.length === 0 ? el.textContent : null,
            attrs,
            crumbs,
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

    const changed = (silent) => {
        redraw();
        post({ type: "changed", silent: Boolean(silent), html: serialize(), tree: tree(), info: sel && document.contains(sel) ? describe(sel) : null });
    };

    const select = (el, quiet) => {
        sel = el;
        redraw();
        if (!quiet) post({ type: "selected", info: describe(el) });
    };

    const targetOf = (e) => {
        let t = e.target;
        if (t && t.nodeType !== 1) t = t.parentElement;
        if (!t || overlay.contains(t) || t === document.documentElement) return document.body;
        return t;
    };

    const finishEdit = () => {
        if (!editing) return;
        const el = editing;
        editing = null;
        el.removeAttribute("contenteditable");
        changed();
    };

    document.addEventListener("mouseover", (e) => { if (editing) return; hov = targetOf(e); redraw(); }, true);
    document.addEventListener("mouseleave", () => { hov = null; redraw(); });
    document.addEventListener("mousedown", (e) => { if (!editing || !editing.contains(e.target)) { if (editing) finishEdit(); e.preventDefault(); } }, true);
    document.addEventListener("click", (e) => {
        if (editing && editing.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        select(targetOf(e));
    }, true);
    document.addEventListener("submit", (e) => e.preventDefault(), true);
    document.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const el = targetOf(e);
        if (el === document.body) return;
        select(el);
        editing = el;
        el.setAttribute("contenteditable", "true");
        el.focus();
    }, true);
    document.addEventListener("focusout", (e) => { if (editing && e.target === editing) finishEdit(); }, true);
    document.addEventListener("keydown", (e) => {
        if (editing) {
            if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); finishEdit(); }
            return;
        }
        const meta = e.metaKey || e.ctrlKey;
        const forward = e.key === "Delete" || e.key === "Backspace" || e.key === "Escape" || (meta && ["z", "y", "d", "s"].includes(e.key.toLowerCase()));
        if (forward) { e.preventDefault(); post({ type: "key", key: e.key.toLowerCase(), meta, shift: e.shiftKey }); }
    }, true);
    window.addEventListener("scroll", redraw, { passive: true });
    window.addEventListener("resize", redraw);
    new ResizeObserver(() => { redraw(); post({ type: "height", height: Math.ceil(document.documentElement.getBoundingClientRect().height) }); }).observe(document.documentElement);

    const mutate = {
        setClasses: (el, m) => { m.value ? el.setAttribute("class", m.value) : el.removeAttribute("class"); },
        setText: (el, m) => { if (el.children.length === 0) el.textContent = m.text; },
        setAttr: (el, m) => { m.value === null || m.value === "" ? el.removeAttribute(m.name) : el.setAttribute(m.name, m.value); },
        remove: (el) => { const p = el.parentElement; el.remove(); sel = p && p !== document.documentElement ? p : null; },
        duplicate: (el) => { const c = el.cloneNode(true); el.after(c); sel = c; },
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
            if (n) { el.replaceWith(n); sel = n; }
        },
        insert: (el, m) => {
            const tpl = document.createElement("template");
            tpl.innerHTML = m.html;
            const n = tpl.content.firstElementChild;
            if (!n) return;
            if (m.position === "inside") el.appendChild(n); else el.after(n);
            sel = n;
        },
    };

    window.addEventListener("message", (e) => {
        if (e.source !== parent) return;
        const m = e.data || {};
        if (m.cmd === "load") {
            editing = null;
            document.body.innerHTML = m.html;
            sel = m.selectPath ? elAt(m.selectPath) : null;
            changed(true);
            if (sel) post({ type: "selected", info: describe(sel) });
            return;
        }
        if (m.cmd === "select") { select(elAt(m.path)); return; }
        if (m.cmd === "hover") { hov = m.path ? elAt(m.path) : null; redraw(); return; }
        if (m.cmd === "scrollTo") { const el = elAt(m.path); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
        if (mutate[m.cmd]) {
            const el = elAt(m.path);
            if (!el) return;
            mutate[m.cmd](el, m);
            changed();
            if (sel && document.contains(sel)) post({ type: "selected", info: describe(sel) });
        }
    });

    post({ type: "ready", html: serialize(), tree: tree() });
}
