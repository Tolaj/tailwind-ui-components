import { handleChangeEditor, clearEditor } from "./playground-editor.js";
import { handleBack, handleClose, handleSave, openFullEditor } from "./playground-dialog.js";
import { handleAIGenerate } from "./playground-ai.js";

// ── Expose to inline HTML handlers (onclick="...") ───────────────────────────
window.handleChangeEditor = handleChangeEditor;
window.clearEditor = clearEditor;
window.handleBack = handleBack;
window.handleClose = handleClose;
window.handleSave = handleSave;
window.openFullEditor = openFullEditor;
window.handleAIGenerate = handleAIGenerate;

// ── AI prompt: Enter key to submit ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("aiPromptInput");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAIGenerate();
            }
        });
    }
});

// ── Editor: Tab inserts two spaces instead of leaving the field ──────────────
document.getElementById("htmlEditor")?.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const t = e.target;
    t.setRangeText("  ", t.selectionStart, t.selectionEnd, "end");
    t.dispatchEvent(new Event("input", { bubbles: true }));
});
