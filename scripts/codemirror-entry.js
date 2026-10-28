// What the code editor (packages/editor/design/code-editor.js) uses of CodeMirror 6, bundled into packages/editor/vendor/codemirror.js
// by scripts/build-codemirror.mjs.
export { EditorState, StateEffect, StateField, Compartment, Annotation } from "@codemirror/state";
export { EditorView, Decoration, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, placeholder } from "@codemirror/view";
export { history, historyKeymap, defaultKeymap, indentWithTab, toggleComment } from "@codemirror/commands";
export { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from "@codemirror/language";
export { html } from "@codemirror/lang-html";
export { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, completionStatus } from "@codemirror/autocomplete";
export { search, searchKeymap, highlightSelectionMatches, openSearchPanel, closeSearchPanel, SearchQuery, setSearchQuery, getSearchQuery, findNext, findPrevious, selectMatches, replaceNext, replaceAll } from "@codemirror/search";
export { linter, lintGutter, lintKeymap, setDiagnostics, forceLinting } from "@codemirror/lint";
export { tags } from "@lezer/highlight";
