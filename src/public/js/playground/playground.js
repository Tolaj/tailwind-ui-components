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
        window.__hideFullscreenCode();
        previewController.setZoom(0.5, 0, 0);
        previewController.setPosition(0, 0);
    } else {
        FSTools.classList.remove("hidden");
        window.__showFullscreenCode();
        setTimeout(layoutFullscreenPreview, 150);
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

// ── Editor: Tab inserts two spaces instead of leaving the field ──────────────
document.getElementById("htmlEditor")?.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const t = e.target;
    t.setRangeText("  ", t.selectionStart, t.selectionEnd, "end");
    t.dispatchEvent(new Event("input", { bubbles: true }));
});


// ── Fullscreen: floating code dialog kept in sync with the main editor ───────
const fsPanel = () => document.getElementById("fsCodePanel");
const fsEditor = () => document.getElementById("fsCodeEditor");
let fsMinimized = false;
let fsFullHeight = null;

function setFsMinimized(min) {
    const panel = fsPanel();
    if (!panel) return;
    if (min && !fsMinimized) fsFullHeight = panel.style.height || `${panel.offsetHeight}px`;
    fsMinimized = min;
    fsEditor().classList.toggle("hidden", min);
    document.getElementById("fsMinIcon").classList.toggle("hidden", min);
    document.getElementById("fsMaxIcon").classList.toggle("hidden", !min);
    document.getElementById("fsMinBtn").title = min ? "Expand" : "Minimize";
    panel.style.resize = min ? "none" : "";
    panel.style.minHeight = min ? "0" : "";
    panel.style.height = min ? "36px" : fsFullHeight || "";
}

function showFullscreenCode() {
    const panel = fsPanel();
    if (!panel) return;
    fsEditor().value = document.getElementById("htmlEditor").value;
    panel.style.height = "";
    fsFullHeight = null;
    panel.classList.remove("hidden");
    panel.classList.add("flex");
    setFsMinimized(false);
    const r = panel.getBoundingClientRect();
    const top = 72;
    const height = Math.max(200, window.innerHeight - top - 16);
    panel.style.left = "16px";
    panel.style.top = `${top}px`;
    panel.style.height = `${height}px`;
    fsFullHeight = `${height}px`;
}

// Centre the design in the space to the right of the code dialog.
function layoutFullscreenPreview() {
    const preview = document.getElementById("preview");
    const panel = fsPanel();
    const areaLeft = panel && !panel.classList.contains("hidden") ? panel.getBoundingClientRect().right + 16 : 0;
    const areaW = window.innerWidth - areaLeft;
    const zoom = Math.min(1, Math.max(0.3, (areaW - 48) / preview.offsetWidth));
    previewController.setZoom(zoom, 0, 0);
    const x = areaLeft + (areaW - preview.offsetWidth * zoom) / 2;
    const y = (window.innerHeight - preview.offsetHeight * zoom) / 2;
    previewController.setPosition(x, Math.max(72, y));
}

function hideFullscreenCode() {
    fsPanel()?.classList.add("hidden");
    fsPanel()?.classList.remove("flex");
}

window.toggleFullscreenCode = () => setFsMinimized(!fsMinimized);
window.__showFullscreenCode = showFullscreenCode;
window.__hideFullscreenCode = hideFullscreenCode;

// drag by header
(() => {
    const header = document.getElementById("fsCodeHeader");
    if (!header) return;
    let drag = null;
    header.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button")) return;
        const r = fsPanel().getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        header.setPointerCapture(e.pointerId);
    });
    header.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const p = fsPanel();
        p.style.left = `${Math.min(Math.max(0, e.clientX - drag.dx), window.innerWidth - 80)}px`;
        p.style.top = `${Math.min(Math.max(0, e.clientY - drag.dy), window.innerHeight - 36)}px`;
    });
    header.addEventListener("pointerup", () => (drag = null));
})();

fsEditor()?.addEventListener("input", (e) => {
    const main = document.getElementById("htmlEditor");
    main.value = e.target.value;
    main.dispatchEvent(new Event("input", { bubbles: true }));
});
fsEditor()?.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key !== "Tab") return;
    e.preventDefault();
    const t = e.target;
    t.setRangeText("  ", t.selectionStart, t.selectionEnd, "end");
    t.dispatchEvent(new Event("input", { bubbles: true }));
});
["wheel", "mousedown"].forEach((ev) =>
    fsPanel()?.addEventListener(ev, (e) => e.stopPropagation(), { passive: true })
);
document.getElementById("htmlEditor")?.addEventListener("input", (e) => {
    const f = fsEditor();
    if (f && document.activeElement !== f) f.value = e.target.value;
});
