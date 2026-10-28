import { handleChangeEditor, clearEditor } from "./playground-editor.js";
import { handleBack, handleClose, handleSave, openFullEditor } from "./playground-dialog.js";
import { handleAIGenerate } from "./playground-ai.js";
import { formatCode } from "./playground-code.js";

// ── Expose to inline HTML handlers (onclick="...") ───────────────────────────
window.handleChangeEditor = handleChangeEditor;
window.clearEditor = clearEditor;
window.handleBack = handleBack;
window.handleClose = handleClose;
window.handleSave = handleSave;
window.openFullEditor = openFullEditor;
window.handleAIGenerate = handleAIGenerate;
window.formatCode = async (btn) => {
    const r = await formatCode();
    const was = btn.dataset.label || btn.textContent;
    btn.dataset.label = was;
    btn.textContent = !r.ok ? "Fix the errors first" : r.changed ? "Formatted" : "Already tidy";
    setTimeout(() => { btn.textContent = was; }, 1400);
};

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
