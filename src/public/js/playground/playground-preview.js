
export function makePreviewZoomable(previewId, options = {}) {
    const preview = document.getElementById(previewId);
    const previewParentId = document.getElementById("preview-wrapper");

    let zoom = 1;
    let position = { x: 0, y: 0 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let activeTool = options.activeTool || "HAND";

    preview.style.transformOrigin = "0 0";
    preview.style.cursor = "grab";

    function updateTransform() {
        preview.style.transform =
            `translate(${position.x}px, ${position.y}px) scale(${zoom})`;
    }

    function zoomAtPoint(newZoom, clientX, clientY) {
        const rect = preview.getBoundingClientRect();

        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const scaleFactor = newZoom / zoom;

        position.x -= mouseX * (scaleFactor - 1);
        position.y -= mouseY * (scaleFactor - 1);

        zoom = newZoom;
        updateTransform();
    }

    function handleWheel(e) {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.max(0.02, Math.min(10, zoom * delta));

            zoomAtPoint(newZoom, e.clientX, e.clientY);
        } else {
            position.x -= e.deltaX;
            position.y -= e.deltaY;
            updateTransform();
        }
    }

    function handleMouseDown(e) {
        if (activeTool === "HAND") {
            isDragging = true;
            dragStart = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            };
            preview.style.cursor = "grabbing";
        }
    }

    function handleMouseMove(e) {
        if (!isDragging) return;
        position.x = e.clientX - dragStart.x;
        position.y = e.clientY - dragStart.y;
        updateTransform();
    }

    function handleMouseUp() {
        if (activeTool === "HAND") {
            isDragging = false;
            preview.style.cursor = "grab";
        }
    }

    function handleKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "-")) {
            e.preventDefault();
            const delta = e.key === "=" ? 1.1 : 0.9;
            const newZoom = Math.max(0.02, Math.min(10, zoom * delta));

            zoomAtPoint(newZoom, window.innerWidth / 2, window.innerHeight / 2);
        }
    }

    preview.addEventListener("wheel", handleWheel, { passive: false });
    previewParentId.addEventListener("wheel", handleWheel, { passive: false });
    preview.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return {
        setZoom: (value, cx = 0, cy = 0) => zoomAtPoint(value, cx, cy),
        setPosition: (x, y) => {
            position = { x, y };
            updateTransform();
        },
        getZoom: () => zoom,
        getPosition: () => ({ ...position }),
        setActiveTool: (tool) => {
            activeTool = tool;
            preview.style.cursor = tool === "HAND" ? "grab" : "default";
        }
    };
}

export const handleMovement = () => {
    const movementButton = document.getElementById("movementButton")
    const movementButton2 = document.getElementById("movementButton2")
    const preview = document.getElementById("preview");
    const styleId = "previewPointerStyle";
    const existingStyle = document.getElementById(styleId);

    if (existingStyle) {
        // Remove if exists
        existingStyle.remove();
        movementButton.classList.remove("bg-slate-200")
        movementButton.classList.add("text-white")
        movementButton2.classList.remove("bg-slate-200")
        movementButton2.classList.add("text-white")
        previewController.setActiveTool("SELECT");

    } else {
        movementButton.classList.add("bg-slate-200")
        movementButton.classList.remove("text-white")
        movementButton2.classList.add("bg-slate-200")
        movementButton2.classList.remove("text-white")
        // Add if not exists
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            #preview:hover * {
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
        previewController.setActiveTool("HAND");
    }

}

let isMobileView = false;

const mobileIconS = `<svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>`;
const desktopIconS = `<svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>`;
const mobileIconL = `<svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>`;
const desktopIconL = `<svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>`;

export const updateIcon = () => {
    const iconContainer = document.querySelector("#shortScreenTools .size-icon");
    const iconContainerFullScreen = document.querySelector("#fullScreenTools .size-icon");
    if (iconContainer) iconContainer.innerHTML = isMobileView ? desktopIconS : mobileIconS;
    if (iconContainerFullScreen) iconContainerFullScreen.innerHTML = isMobileView ? desktopIconL : mobileIconL;
};

export function handleDisplaySize() {
    const preview = document.getElementById('preview');
    if (!preview) return;

    isMobileView = !isMobileView;

    if (isMobileView) {
        // Snapshot the current HTML content from the editor
        const htmlEditor = document.getElementById('htmlEditor');
        const currentHTML = htmlEditor ? htmlEditor.value : preview.innerHTML;

        // Clear preview and switch to fit width
        preview.classList.remove('w-screen');
        preview.classList.add('w-fit');

        // Create the iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'mobilePreviewFrame';
        iframe.style.width = '390px';
        iframe.style.height = '700px';
        iframe.style.display = 'block';
        iframe.style.margin = '0 auto';
        iframe.style.border = 'none';
        iframe.style.background = 'white';

        // Clear preview and add iframe
        preview.innerHTML = '';
        preview.appendChild(iframe);

        // Write the full HTML into the iframe
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=390, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>body { margin: 0; padding: 0; }<\/style>
</head>
<body>${currentHTML}</body>
</html>`);
        doc.close();

    } else {
        // Restore desktop view — re-render from the editor content
        const iframe = document.getElementById('mobilePreviewFrame');
        if (iframe) iframe.remove();

        preview.classList.remove('w-fit');
        preview.classList.add('w-screen');

        // Re-render from editor value
        const htmlEditor = document.getElementById('htmlEditor');
        if (htmlEditor) {
            preview.innerHTML = htmlEditor.value;
        }
    }

    updateIcon();
}

export const togglePreviewFullscreen = () => {
    const wrapper = document.getElementById("preview-wrapper");
    if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};

