import { parseComponentSource, buildPreviewDocument } from "./component-source.js";

let isMobile = false;
let timer = null;

export const MOBILE_WIDTH = 390;

const getFrame = () => {
    const preview = document.getElementById("preview");
    if (!preview) return null;
    let frame = document.getElementById("previewFrame");
    if (!frame) {
        frame = document.createElement("iframe");
        frame.id = "previewFrame";
        frame.title = "Component preview";
        // No allow-same-origin: pasted JS cannot reach the app's cookies or DOM.
        frame.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-modals");
        frame.style.cssText = "display:block;border:0;background:#fff;width:100%;height:200px;";
        preview.innerHTML = "";
        preview.appendChild(frame);
    }
    frame.style.width = isMobile ? `${MOBILE_WIDTH}px` : "100%";
    return frame;
};

window.addEventListener("message", (e) => {
    const frame = document.getElementById("previewFrame");
    if (!frame || e.source !== frame.contentWindow) return;
    if (e.data?.type === "preview-height") {
        frame.style.height = `${Math.max(e.data.height, 80)}px`;
    }
});

export const renderPreviewNow = (code) => {
    const preview = document.getElementById("preview");
    if (!preview) return;
    if (!code || !code.trim()) {
        preview.innerHTML = "";
        return;
    }
    const frame = getFrame();
    frame.srcdoc = buildPreviewDocument(parseComponentSource(code), {
        width: isMobile ? MOBILE_WIDTH : undefined,
    });
};

export const renderPreview = (code) => {
    clearTimeout(timer);
    timer = setTimeout(() => renderPreviewNow(code), 250);
};

export const setMobileMode = (value) => {
    isMobile = value;
    const preview = document.getElementById("preview");
    preview.classList.toggle("w-screen", !value);
    preview.classList.toggle("w-fit", value);
    renderPreviewNow(document.getElementById("htmlEditor").value);
};

export const updateSourceBadge = (code) => {
    const badge = document.getElementById("sourceBadge");
    if (!badge) return;
    const p = parseComponentSource(code);
    const parts = ["HTML"];
    if (p.hasCss) parts.push("CSS");
    if (p.hasJs) parts.push("JS");
    if (/class\s*=|tailwind/i.test(code)) parts.push("Tailwind");
    badge.textContent = parts.join(" + ");
};
