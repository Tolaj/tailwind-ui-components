// The code box of the Add component dialog: the design editor's code editor (CodeMirror), with the old textarea kept hidden as the value
// the rest of the page reads and writes (the AI writes into it; saving and the editor on the right read from it).
import { createCodeEditor, tagProblems } from "@windcraft/editor/design/code-editor.js";

const ta = document.getElementById("htmlEditor");
const mount = document.getElementById("htmlMount");
let ed = null;

/** Sets the code from outside (a draft coming back, a reset): the box and the textarea. */
export function setCode(text) {
    ta.value = text;
    if (ed) ed.setValue(text);
}
export const focusCode = () => ed && ed.focus();
/** Tidies the code (the Format button); says what happened, for the button's label. */
export async function formatCode() { return ed ? ed.format() : { ok: false }; }
export const codeHasFocus = () => Boolean(ed && ed.hasFocus());

if (ta && mount) {
    ta.reveal = (index) => ed && ed.reveal(index); // the AI's typing animation scrolls to where it works
    createCodeEditor(mount, {
        value: ta.value, problems: tagProblems, wrap: true, formatOnPaste: true,
        placeholderText: '<div class="p-8">\n  <h1 class="text-3xl font-bold">Hello world</h1>\n</div>',
        onChange(text) { ta.value = text; ta.dispatchEvent(new Event("input", { bubbles: true })); },
    }).then((e) => { ed = e; if (ta.value) ed.setValue(ta.value); });
    // written to by the page (the AI): the box follows
    ta.addEventListener("input", () => { if (ed && ed.getValue() !== ta.value) ed.setValue(ta.value); });
}
