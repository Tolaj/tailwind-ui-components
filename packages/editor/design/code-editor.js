// The code editor: CodeMirror 6 set up for HTML with Tailwind. Line numbers, undo/redo, auto-closing tags and brackets, auto-indent,
// Tab / Shift+Tab to indent a block, Cmd/Ctrl+/ to comment, find and replace (Cmd/Ctrl+F), code folding, highlighting for HTML, CSS and
// JavaScript, tag/attribute completion, Tailwind class completion inside class="…", and squiggles under what doesn't parse.
// CodeMirror itself is loaded the first time an editor is made (vendor/codemirror.js).
//
//   const ed = await createCodeEditor(el, { value, onChange(text), problems(text) -> [{ from, to, message }], onSave(), wrap, placeholderText });
//   ed.getValue()  ed.setValue(text)  ed.focus()  ed.hasFocus()  ed.setMarks([[from, to, "sel"]])  ed.reveal(index)  ed.select(from, to)
//   ed.format() -> { ok, changed, message }   (Prettier: HTML with its <style> and <script>; also Shift+Alt+F, and with formatOnPaste the first paste into an empty editor)
//   ed.lineCount()  ed.openSearch()  ed.setProblems(list)  ed.destroy()
import { tailwindClasses } from "./tailwind-classes.js";
import { checkTags } from "./code-view.js";

let cmPromise = null;
const load = () => (cmPromise ||= import("../vendor/codemirror.js"));

/** Completion for class names: while the cursor is inside class="…", offers Tailwind's (with variants such as md:hover:). */
function classCompletion(context) {
    const { state, pos } = context;
    const from = Math.max(0, pos - 1500);
    const before = state.doc.sliceString(from, pos);
    const lt = before.lastIndexOf("<");
    const tag = before.slice(lt < 0 ? 0 : lt);
    const m = /\sclass\s*=\s*(["'])([^"']*)$/.exec(tag);
    if (!m) return null;
    const token = /[^\s"']*$/.exec(m[2])[0];
    if (!token && !context.explicit) return null;
    const start = pos - token.length;
    const colon = token.lastIndexOf(":");
    const prefix = colon >= 0 ? token.slice(0, colon + 1) : "";
    const rest = token.slice(prefix.length);
    const all = tailwindClasses();
    const options = prefix
        ? all.filter((c) => !c.endsWith(":")).map((c) => ({ label: prefix + c, type: "class" }))
        : all.map((c) => ({ label: c, type: c.endsWith(":") ? "keyword" : "class", boost: c.endsWith(":") ? -1 : 0 }));
    if (!rest && !prefix && !context.explicit) return null;
    return { from: start, options, validFor: /^[\w:\-/.\[\]%#!]*$/ };
}

const ICONS = {
    down: '<path d="M8 3v9.5M4 8.5l4 4 4-4"/>', up: '<path d="M8 13V3.5M4 7.5l4-4 4 4"/>', lines: '<path d="M3 4h10M3 8h10M3 12h10"/>',
    close: '<path d="M4 4l8 8M12 4l-8 8"/>', right: '<path d="M6 3.5l4.5 4.5L6 12.5"/>', openDown: '<path d="M3.5 6l4.5 4.5L12.5 6"/>',
    replace: '<path d="M2.5 4.5h7M2.5 8h4M9 6.5l2.5 1.5L9 9.5M2.5 11.5h7"/>', replaceAll: '<path d="M2.5 3.5h6M2.5 6.5h4M2.5 9.5h6M2.5 12.5h4M9.5 8l2.5 1.5L9.5 11"/>',
};
const icon = (name) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
/** The fold gutter's markers: a chevron pointing down for an open block, right for a folded one (VS Code's). */
function foldMarker(open) {
    const el = document.createElement("span");
    el.className = `wc-fold${open ? "" : " shut"}`;
    el.innerHTML = icon(open ? "openDown" : "right");
    el.title = open ? "Fold" : "Unfold";
    return el;
}

/** Find and replace as VS Code lays it out: Find with its Aa / .* / ab toggles inside the field and "n of N" beside it, previous / next /
 *  select all, close; the chevron on the left opens the Replace row. */
function searchPanel(view, cm) {
    const { SearchQuery, setSearchQuery, getSearchQuery } = cm;
    const dom = document.createElement("div");
    dom.className = "wcs";
    dom.innerHTML = `<button type="button" class="wcs-toggle" title="Toggle replace" aria-label="Toggle replace">${icon("right")}</button>
        <div class="wcs-rows">
            <div class="wcs-row">
                <div class="wcs-field find"><input name="search" placeholder="Find" aria-label="Find" main-field="true" autocomplete="off" spellcheck="false">
                    <span class="wcs-opts"><button type="button" class="wcs-btn" data-opt="caseSensitive" title="Match case">Aa</button><button type="button" class="wcs-btn" data-opt="wholeWord" title="Match whole word"><u>ab</u></button><button type="button" class="wcs-btn" data-opt="regexp" title="Use regular expression">.*</button></span></div>
                <span class="wcs-count"></span>
                <button type="button" class="wcs-btn" data-act="prev" title="Previous match (Shift+Enter)">${icon("up")}</button>
                <button type="button" class="wcs-btn" data-act="next" title="Next match (Enter)">${icon("down")}</button>
                <button type="button" class="wcs-btn" data-act="all" title="Select all matches">${icon("lines")}</button>
                <button type="button" class="wcs-btn" data-act="close" title="Close (Escape)">${icon("close")}</button>
            </div>
            <div class="wcs-row" data-replace hidden>
                <div class="wcs-field"><input name="replace" placeholder="Replace" aria-label="Replace" autocomplete="off" spellcheck="false"></div>
                <button type="button" class="wcs-btn" data-act="replace" title="Replace (Enter)">${icon("replace")}</button>
                <button type="button" class="wcs-btn" data-act="replaceAll" title="Replace all">${icon("replaceAll")}</button>
            </div>
        </div>`;
    const $ = (sel) => dom.querySelector(sel);
    const find = $("input[name=search]"), rep = $("input[name=replace]"), count = $(".wcs-count"), toggle = $(".wcs-toggle"), repRow = $("[data-replace]");
    const opts = { caseSensitive: false, wholeWord: false, regexp: false };
    const queryOf = () => new SearchQuery({ search: find.value, replace: rep.value, ...opts });
    const commit = () => { const q = queryOf(); if (!q.eq(getSearchQuery(view.state))) view.dispatch({ effects: setSearchQuery.of(q) }); };
    const paint = () => {
        const q = getSearchQuery(view.state);
        dom.querySelectorAll("[data-opt]").forEach((b) => b.classList.toggle("on", q[b.dataset.opt]));
        let n = 0, at = 0;
        if (q.search && q.valid) {
            const sel = view.state.selection.main.from;
            for (const cur = q.getCursor(view.state); n < 5000; ) { const m = cur.next(); if (m.done) break; n++; if (!at && m.value.from >= sel) at = n; }
            if (!at && n) at = 1;
        }
        count.textContent = n ? `${at} of ${n}${n >= 5000 ? "+" : ""}` : "No results"; // (as in VS Code, also while the field is empty)
        count.classList.toggle("bad", Boolean(q.search) && !n);
        $(".wcs-field.find").classList.toggle("bad", Boolean(q.search) && !n);
    };
    const showReplace = (on) => { repRow.hidden = !on; toggle.innerHTML = icon(on ? "openDown" : "right"); };
    find.addEventListener("input", () => { commit(); });
    rep.addEventListener("input", commit);
    find.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.shiftKey ? cm.findPrevious : cm.findNext)(view); }
        else if (e.key === "Escape") { e.preventDefault(); cm.closeSearchPanel(view); view.focus(); }
    });
    rep.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.ctrlKey || e.metaKey ? cm.replaceAll : cm.replaceNext)(view); }
        else if (e.key === "Escape") { e.preventDefault(); cm.closeSearchPanel(view); view.focus(); }
    });
    toggle.addEventListener("click", () => showReplace(repRow.hidden));
    dom.addEventListener("click", (e) => {
        const o = e.target.closest("[data-opt]"), a = e.target.closest("[data-act]");
        if (o) { opts[o.dataset.opt] = !opts[o.dataset.opt]; commit(); find.focus(); return; }
        if (!a) return;
        const run = { next: cm.findNext, prev: cm.findPrevious, all: cm.selectMatches, replace: cm.replaceNext, replaceAll: cm.replaceAll, close: cm.closeSearchPanel }[a.dataset.act];
        run(view);
        if (a.dataset.act === "close") view.focus();
    });
    const sync = () => {
        const q = getSearchQuery(view.state);
        if (q.search !== find.value) find.value = q.search;
        if (q.replace !== rep.value) rep.value = q.replace;
        Object.assign(opts, { caseSensitive: q.caseSensitive, wholeWord: q.wholeWord, regexp: q.regexp });
        paint();
    };
    sync();
    return {
        dom, top: true,
        mount() { find.select(); },
        update(u) { if (u.docChanged || u.selectionSet || u.transactions.some((t) => t.effects.some((e) => e.is(setSearchQuery)))) sync(); },
    };
}

/** Where the tags first stop matching up, as a range in the code (for the squiggle), or none. */
export function tagProblems(text) {
    const bad = checkTags(text);
    if (!bad) return [];
    const lines = text.split("\n");
    const from = lines.slice(0, bad.line - 1).reduce((s, l) => s + l.length + 1, 0);
    const line = lines[bad.line - 1] || "";
    const lead = line.length - line.trimStart().length;
    return [{ from: from + lead, to: from + Math.max(line.length, lead + 1), message: bad.message }];
}

export async function createCodeEditor(parent, { value = "", onChange, problems, onSave, placeholderText, wrap = false, formatOnPaste = false } = {}) {
    const cm = await load();
    const { EditorState, EditorView, Decoration, StateEffect, StateField, keymap } = cm;
    let quiet = 0;

    const setMarksEffect = StateEffect.define();
    // the selected element's source, shaded (its opening tag darker): set from outside with setMarks()
    const marksField = StateField.define({
        create: () => Decoration.none,
        update(deco, tr) {
            deco = deco.map(tr.changes);
            for (const e of tr.effects) if (e.is(setMarksEffect)) {
                const len = tr.newDoc.length;
                deco = Decoration.set(e.value.filter(([a, b]) => a < b && b <= len).map(([a, b, cls]) => Decoration.mark({ class: `cm-${cls}` }).range(a, b)), true);
            }
            return deco;
        },
        provide: (f) => EditorView.decorations.from(f),
    });

    const { tags: t } = cm;
    const style = cm.HighlightStyle.define([
        { tag: t.tagName, color: "#116329" }, { tag: t.angleBracket, color: "#6e7781" }, { tag: t.attributeName, color: "#8250df" },
        { tag: [t.attributeValue, t.string], color: "#0a3069" }, { tag: [t.comment, t.blockComment, t.lineComment], color: "#6e7781", fontStyle: "italic" },
        { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: "#cf222e" }, { tag: [t.number, t.bool, t.null], color: "#0550ae" },
        { tag: [t.propertyName, t.className], color: "#0550ae" }, { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#8250df" },
        { tag: t.regexp, color: "#116329" }, { tag: t.invalid, color: "#cf222e" },
    ]);
    const theme = EditorView.theme({
        "&": { height: "100%", fontSize: "12px", backgroundColor: "#fff", color: "#24292f" },
        "&.cm-focused": { outline: "none" },
        ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: "20px", overflow: "auto" },
        ".cm-content": { padding: "12px 0", caretColor: "#111" },
        ".cm-gutters": { backgroundColor: "#fff", color: "#9a9a9a", border: "none" },
        ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#222" },
        ".cm-activeLine": { backgroundColor: "rgba(0,0,0,.025)" },
        ".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 14px", minWidth: "34px", fontSize: "12.5px" },
        ".cm-foldGutter .cm-gutterElement": { cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" },
        ".wc-fold": { display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "20px", color: "#8a8a8a", opacity: 0, transition: "opacity .12s" },
        ".wc-fold.shut": { opacity: 1 },
        ".wc-fold svg": { width: "15px", height: "15px" },
        ".cm-gutters:hover .wc-fold": { opacity: 1 },
        ".cm-foldGutter .cm-gutterElement:hover .wc-fold": { color: "#111" },
        ".cm-foldPlaceholder": { backgroundColor: "#eee", border: "1px solid #ddd", color: "#666", borderRadius: "3px", padding: "0 5px", margin: "0 2px" },
        ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": { backgroundColor: "rgba(10,132,224,.22) !important" },
        ".cm-sel": { backgroundColor: "rgba(10,132,224,.07)" },
        ".cm-selt": { backgroundColor: "rgba(10,132,224,.16)" },
        ".cm-matchingBracket": { backgroundColor: "rgba(10,132,224,.18)", outline: "none" },
        ".cm-tooltip": { border: "1px solid #e5e5e5", borderRadius: "8px", backgroundColor: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,.12)", overflow: "hidden" },
        ".cm-tooltip-autocomplete > ul": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "12px", maxHeight: "220px" },
        ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "#111", color: "#fff" },
        // find and replace, laid out like VS Code's: a small widget in the corner of the editor
        ".cm-panels": { position: "absolute", top: 0, right: 0, left: "auto", background: "transparent", border: "none", zIndex: 10, pointerEvents: "none", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
        ".cm-panels-top": { borderBottom: "none" },
        ".wcs": { pointerEvents: "auto", display: "flex", alignItems: "flex-start", gap: "2px", margin: "0 14px 0 0", padding: "4px 6px 4px 2px", background: "#fff", border: "1px solid #e6e6e6", borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "0 4px 14px rgba(0,0,0,.08)", fontSize: "13px", color: "#3b3b3b" },
        ".wcs-toggle": { alignSelf: "stretch", width: "16px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "#9a9a9a", borderRadius: "3px", cursor: "pointer", padding: 0, outline: "none" },
        ".wcs-toggle svg": { width: "12px", height: "12px" },
        ".wcs-toggle:focus-visible": { boxShadow: "inset 0 0 0 1px #0090f1" },
        ".wcs-toggle:hover": { background: "#f0f0f0", color: "#555" },
        ".wcs-row[hidden]": { display: "none" },
        ".wcs-rows": { display: "flex", flexDirection: "column", gap: "4px" },
        ".wcs-row": { display: "flex", alignItems: "center", gap: "2px", height: "24px" },
        ".wcs-field": { position: "relative", width: "216px", height: "24px", display: "flex", alignItems: "center" },
        ".wcs-field input": { width: "100%", height: "24px", boxSizing: "border-box", border: "1px solid transparent", borderRadius: "2px", background: "#fff", color: "#222", fontSize: "13px", padding: "0 6px", outline: "1px solid #dcdcdc", outlineOffset: "-1px", fontFamily: "inherit" },
        ".wcs-field.find input": { paddingRight: "76px" },
        ".wcs-field input:focus": { outline: "1px solid #0090f1" },
        ".wcs-field.bad input": { outline: "1px solid #d1242f" },
        ".wcs-opts": { position: "absolute", right: "2px", top: "1px", display: "flex", gap: "1px" },
        ".wcs-btn": { width: "22px", height: "22px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "3px", background: "transparent", color: "#8a8a8a", cursor: "pointer", padding: 0, fontSize: "11.5px", fontWeight: 600, outline: "none", fontFamily: "inherit" },
        ".wcs-btn:hover": { background: "#f0f0f0", color: "#444" },
        ".wcs-btn:focus-visible": { boxShadow: "inset 0 0 0 1px #0090f1" },
        ".wcs-btn.on": { background: "#bfdcf7", boxShadow: "inset 0 0 0 1px #0090f1", color: "#0b4f8a" },
        ".wcs-btn svg": { width: "14px", height: "14px" },
        ".wcs-count": { minWidth: "70px", padding: "0 6px", textAlign: "center", fontSize: "12px", color: "#616161", whiteSpace: "nowrap" },
        ".wcs-count.bad": { color: "#d1242f" },
        ".wcs-sep": { width: "1px", height: "16px", background: "#d4d4d4", margin: "0 3px" },
        ".cm-diagnostic": { fontFamily: "system-ui, sans-serif", fontSize: "12px", padding: "4px 8px" },
        ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy #d1242f", textUnderlineOffset: "3px" },
    }, { dark: false });

    const htmlSupport = cm.html({ matchClosingTags: true, autoCloseTags: true, selfClosingTags: true });
    const extensions = [
        cm.lineNumbers(), cm.highlightActiveLineGutter(), cm.foldGutter({ markerDOM: foldMarker }), cm.history(), cm.drawSelection(), cm.dropCursor(),
        EditorState.allowMultipleSelections.of(true), cm.indentOnInput(), cm.indentUnit.of("  "), EditorState.tabSize.of(2),
        cm.bracketMatching(), cm.closeBrackets(), cm.rectangularSelection(), cm.crosshairCursor(), cm.highlightActiveLine(), cm.highlightSelectionMatches(),
        cm.search({ top: true, createPanel: (view) => searchPanel(view, cm) }), cm.syntaxHighlighting(style), htmlSupport, htmlSupport.language.data.of({ autocomplete: classCompletion }),
        cm.autocompletion({ activateOnTyping: true, icons: false, maxRenderedOptions: 60 }),
        keymap.of([
            ...(onSave ? [{ key: "Mod-s", preventDefault: true, run: () => { onSave(); return true; } }] : []),
            { key: "Mod-/", run: cm.toggleComment }, ...cm.closeBracketsKeymap, ...cm.defaultKeymap, ...cm.searchKeymap, ...cm.historyKeymap,
            ...cm.foldKeymap, ...cm.completionKeymap, ...cm.lintKeymap, cm.indentWithTab,
        ]),
        ...(problems ? [cm.linter((view) => problems(view.state.doc.toString()).map((p) => ({ from: p.from, to: p.to, severity: "error", message: p.message })), { delay: 350 })] : []),
        ...(wrap ? [EditorView.lineWrapping] : []),
        ...(placeholderText ? [cm.placeholder(placeholderText)] : []),
        marksField, theme,
        EditorView.updateListener.of((u) => { if (u.docChanged && !quiet && onChange) onChange(u.state.doc.toString()); }),
    ];
    let view = null;
    /** Tidies the whole text with Prettier, as one undo step; the cursor stays about where it was. */
    async function format() {
        const text = view.state.doc.toString();
        if (!text.trim()) return { ok: true, changed: false };
        let out;
        try {
            const { formatSource } = await import("../vendor/prettier.js");
            out = await formatSource(text);
        } catch (err) {
            return { ok: false, changed: false, message: String(err && err.message ? err.message : err).split("\n")[0] };
        }
        if (view.state.doc.toString() !== text) return { ok: false, changed: false, message: "The code changed while formatting" };
        if (out === text) return { ok: true, changed: false };
        let a = 0;
        while (a < text.length && a < out.length && text[a] === out[a]) a++;
        let b = 0;
        while (b < text.length - a && b < out.length - a && text[text.length - 1 - b] === out[out.length - 1 - b]) b++;
        view.dispatch({ changes: { from: a, to: text.length - b, insert: out.slice(a, out.length - b) }, userEvent: "input.format" });
        return { ok: true, changed: true };
    }
    extensions.push(
        keymap.of([{ key: "Shift-Alt-f", preventDefault: true, run: () => { format(); return true; } }]),
        ...(formatOnPaste ? [EditorView.domEventHandlers({ paste(_e, v) { if (v.state.doc.length === 0) setTimeout(() => format(), 0); return false; } })] : []),
    );
    view = new EditorView({ state: EditorState.create({ doc: value, extensions }), parent });

    return {
        view,
        getValue: () => view.state.doc.toString(),
        /** Replaces the text (not reported through onChange), keeping the scroll position and the cursor where it can. */
        setValue(text) {
            const cur = view.state.doc.toString();
            if (text === cur) return;
            let a = 0;
            while (a < cur.length && a < text.length && cur[a] === text[a]) a++;
            let b = 0;
            while (b < cur.length - a && b < text.length - a && cur[cur.length - 1 - b] === text[text.length - 1 - b]) b++;
            quiet++;
            try { view.dispatch({ changes: { from: a, to: cur.length - b, insert: text.slice(a, text.length - b) } }); } finally { quiet--; }
        },
        format,
        focus: () => view.focus(),
        hasFocus: () => view.hasFocus,
        lineCount: () => view.state.doc.lines,
        setMarks: (marks) => view.dispatch({ effects: setMarksEffect.of(marks) }),
        /** Scrolls so the character at `index` is in view (centred when it was out of sight). */
        reveal: (index) => view.dispatch({ effects: EditorView.scrollIntoView(Math.min(index, view.state.doc.length), { y: "center" }) }),
        select(from, to) { view.dispatch({ selection: { anchor: from, head: to }, effects: EditorView.scrollIntoView(from, { y: "center" }) }); view.focus(); },
        lineRange(line) { const l = view.state.doc.line(Math.min(Math.max(1, line), view.state.doc.lines)); return [l.from, l.to]; },
        openSearch: () => { view.focus(); cm.openSearchPanel(view); },
        setProblems: (list) => view.dispatch(cm.setDiagnostics(view.state, list.map((p) => ({ from: p.from, to: p.to, severity: "error", message: p.message })))),
        destroy: () => view.destroy(),
    };
}
