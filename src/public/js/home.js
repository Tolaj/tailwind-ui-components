
function updatePreview() {
    const html = document.getElementById('htmlEditor').value;
    const preview = document.getElementById('preview');
    const previewDoc = preview.contentDocument || preview.contentWindow.document;

    previewDoc.open();
    previewDoc.write(html);
    previewDoc.close();
}

const clearEditor = () => {
    if (confirm('Clear all content?')) {
        document.getElementById('htmlEditor').value = '';
        document.getElementById('preview').innerHTML = '';
    }
}

const createDescriptionFromElement = (element) => {
    const getAttributes = (element) => {
        const attrs = {};
        Array.from(element.attributes || []).forEach(attr => {
            attrs[attr.name] = attr.value;
        });
        return attrs;
    };

    const getNodeKind = (element) => {
        if (element.tagName === "BUTTON") return "action";
        if (element.tagName === "SVG" || element.tagName === "PATH") return "icon";
        if (element.localName.includes("-")) return "component";
        return "layout";
    };

    const description = {
        type: "element",
        tag: element.localName,
        kind: getNodeKind(element),
        attributes: getAttributes(element),
        classList: Array.from(element.classList),
        children: [],
    };

    // 🔥 PRESERVE ORDER (TEXT + ELEMENTS)
    element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim()) {
                description.children.push({
                    type: "text",
                    content: node.textContent,
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            description.children.push(createDescriptionFromElement(node));
        }
    });

    return description;
};



const createElementFromDescription = (
    description,
    isDraggable = false
) => {

    if (description.type === "text") {
        return document.createTextNode(description.content);
    }

    const SVG_TAGS = new Set(["svg", "path", "circle", "rect", "line", "g"]);

    const createElement = (tag) => {
        if (SVG_TAGS.has(tag)) {
            return document.createElementNS("http://www.w3.org/2000/svg", tag);
        }
        return document.createElement(tag);
    };

    const element = createElement(description.tag);

    /* classes */
    if (description.classList?.length) {
        element.classList.add(...description.classList);
    }

    /* attributes */
    Object.entries(description.attributes || {}).forEach(([k, v]) => {
        element.setAttribute(k, v);
    });

    /* draggable */
    if (isDraggable) {
        element.setAttribute("draggable", "true");
    }

    /* 🔥 PRESERVE ORDER */
    description.children?.forEach(child => {
        element.appendChild(
            createElementFromDescription(child, isDraggable)
        );
    });

    return element;
};




const handleChangeEditor = (e) => {
    const preview = document.getElementById("preview");

    // Clear previous content

    preview.innerHTML = ""

    const parser = new DOMParser();
    const dom = parser.parseFromString(e.target.value, "text/html");

    const elementsDescription = Array.from(dom.body.children).map(child =>
        createDescriptionFromElement(child)
    );

    elementsDescription.forEach(description => {
        const element = createElementFromDescription(description, true);
        preview.appendChild(element);
    });
};



function makePreviewZoomable(previewId, options = {}) {
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


const previewController = makePreviewZoomable("preview");

// programmatically zoom to 150%
previewController.setZoom(0.5);

// programmatically pan
previewController.setPosition(0, 0);

const handleMovement = () => {
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

const handleDisplaySize = (e) => {
    const preview = document.querySelector('#preview');

    // Remove all width classes that start with "w-"
    preview.classList.forEach(cls => {
        if (cls.startsWith('w-')) {
            preview.classList.remove(cls);
        }
    });

    if (e.target.checked === false) {
        preview.classList.add('w-fit');

    } else {
        preview.classList.add('w-screen');
    }

}

document.addEventListener("fullscreenchange", () => {
    const FSTools = document.getElementById("fullScreenTools");

    if (!document.fullscreenElement) {
        // Exited fullscreen (ESC or programmatic)
        FSTools.classList.add("hidden");
    } else {
        // Entered fullscreen
        FSTools.classList.remove("hidden");
    }
});

const togglePreviewFullscreen = () => {
    const wrapper = document.getElementById("preview-wrapper");

    if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};


