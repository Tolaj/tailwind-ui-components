import { handleChangeEditor, clearEditor } from './playground-editor.js';
import {
    makePreviewZoomable,
    handleMovement,
    handleDisplaySize,
    togglePreviewFullscreen,
    updateIcon
} from './playground-preview.js';
import { handleNext, handleBack, handleClose, handleSave } from './playground-dialog.js';
import { handleAIGenerate } from './playground-ai.js';


// ── Expose to inline HTML handlers (onclick="...") ───────────────────────────
window.handleChangeEditor = handleChangeEditor;
window.clearEditor = clearEditor;
window.handleMovement = handleMovement;
window.handleDisplaySize = handleDisplaySize;
window.togglePreviewFullscreen = togglePreviewFullscreen;
window.handleNext = handleNext;
window.handleBack = handleBack;
window.handleClose = handleClose;
window.handleSave = handleSave;
window.handleAIGenerate = handleAIGenerate;

// ── Movement toggle (needs previewController, kept here) ─────────────────────
const previewController = makePreviewZoomable("preview");
previewController.setZoom(0.5);
previewController.setPosition(0, 0);

// ── Fullscreen preview change listener ────────────────────────────────────────────────
document.addEventListener("fullscreenchange", () => {
    const FSTools = document.getElementById("fullScreenTools");
    if (!FSTools) return;
    if (!document.fullscreenElement) {
        FSTools.classList.add("hidden");
    } else {
        FSTools.classList.remove("hidden");
    }
    updateIcon();
});


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