
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
    console.log(elementsDescription)
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
let isMobileView = false; // track current view globally
const mobileIconS = `<svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>`;
const desktopIconS = `<svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>`;

const mobileIconL = `<svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>`;
const desktopIconL = `<svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>`;


const updateIcon = () => {
    const iconContainer = document.querySelector("#shortScreenTools .size-icon");
    const iconContainerFullScreen = document.querySelector("#fullScreenTools .size-icon");

    if (iconContainer) {
        iconContainer.innerHTML = isMobileView ? desktopIconS : mobileIconS
    }

    if (iconContainerFullScreen) {
        iconContainerFullScreen.innerHTML = isMobileView ? desktopIconL : mobileIconL
    }
};

function handleDisplaySize() {
    const preview = document.getElementById('preview');
    if (!preview) return;

    // toggle mode
    isMobileView = !isMobileView;

    if (isMobileView) {
        preview.classList.remove('w-screen');
        preview.classList.add('w-fit');

        // Create iframe
        let iframe = preview.querySelector('iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.style.width = "390px";
            iframe.style.height = "700px";
            iframe.style.display = "block";
            iframe.style.margin = "0 auto";
            iframe.style.background = "white";
            iframe.style.border = "none";
            preview.appendChild(iframe);
        }

        // Move current preview content into a wrapper div
        const content = document.createElement('div');
        while (preview.firstChild && preview.firstChild !== iframe) {
            content.appendChild(preview.firstChild);
        }

        // Write content into iframe
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=390, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>body{margin:0;padding:0;}<\/style>
            </head>
            <body></body>
            </html>
        `);
        doc.close();

        doc.body.appendChild(content); // append latest content
    } else {
        // Restore desktop view
        const iframe = preview.querySelector('iframe');
        if (iframe) {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            while (doc.body.firstChild) {
                preview.appendChild(doc.body.firstChild);
            }
            iframe.remove();
        }
        preview.classList.remove('w-fit');
        preview.classList.add('w-screen');
    }

    updateIcon(); // update both toolbar icons
}


// Fullscreen handling
document.addEventListener("fullscreenchange", () => {
    const FSTools = document.getElementById("fullScreenTools");
    if (!FSTools) return;

    if (!document.fullscreenElement) {
        FSTools.classList.add("hidden");
    } else {
        FSTools.classList.remove("hidden");
    }

    updateIcon(); // make sure icon is correct in fullscreen
});

const togglePreviewFullscreen = () => {
    const wrapper = document.getElementById("preview-wrapper");

    if (!document.fullscreenElement) {
        wrapper.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};


let isDetailsOpen = false;

const handleNext = () => {

    const componentForm = document.getElementById("componentForm");
    const htmlEditor = document.getElementById("htmlEditor");
    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    if (!componentForm.htmlEditor.checkValidity()) {
        componentForm.htmlEditor.reportValidity();
        return;
    }

    details.classList.remove("hidden");
    cancelBtn.classList.add("hidden")
    backBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden")
    submitBtn.classList.remove("hidden")

}

const handleBack = () => {
    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    details.classList.add("hidden");
    cancelBtn.classList.remove("hidden")
    backBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden")
    submitBtn.classList.add("hidden")
}

const handleClose = () => {
    const dialog = document.getElementById("dialog");
    document.getElementById('htmlEditor').value = '';
    document.getElementById('preview').innerHTML = '';
    dialog.close()
}


const handleSave = async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById("submitBtn");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get html editor value
    const htmlCode = document.getElementById('htmlEditor').value;

    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlCode, "text/html");

    const elementsDescription = Array.from(dom.body.children).map(child =>
        createDescriptionFromElement(child)
    );

    // ✅ Get all form fields automatically
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Add extra values
    data.htmlCode = htmlCode;
    data.elementsDescription = elementsDescription;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const response = await fetch('/api/components', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        alert('Component saved successfully!');
        handleClose();
        window.location.reload();

    } catch (error) {
        console.error('Save error:', error);
        alert(error.message || 'Failed to save component');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
};



// // ─── AI Component Generator ────────────────────────────────────────────────

// const addAIMessage = (text, role = "ai") => {
//     const container = document.getElementById("aiMessages");
//     if (!container) return;

//     container.classList.remove("hidden");

//     const msg = document.createElement("div");
//     msg.className =
//         role === "user"
//             ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
//             : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
//     msg.textContent = text;
//     container.appendChild(msg);
//     container.scrollTop = container.scrollHeight;
// };

// const setAILoading = (loading) => {
//     const btn = document.getElementById("aiGenerateBtn");
//     const sendIcon = document.getElementById("aiSendIcon");
//     const spinner = document.getElementById("aiSpinner");
//     const input = document.getElementById("aiPromptInput");

//     btn.disabled = loading;
//     input.disabled = loading;

//     if (loading) {
//         sendIcon.classList.add("hidden");
//         spinner.classList.remove("hidden");
//         input.classList.add("opacity-50");
//     } else {
//         sendIcon.classList.remove("hidden");
//         spinner.classList.add("hidden");
//         input.classList.remove("opacity-50");
//     }
// };

// const handleAIGenerate = async () => {
//     const input = document.getElementById("aiPromptInput");
//     const prompt = input?.value?.trim();

//     if (!prompt) {
//         input?.focus();
//         return;
//     }

//     // Get current HTML from editor (pass it so Claude can modify existing code)
//     const currentHtml = document.getElementById("htmlEditor")?.value?.trim() || "";

//     addAIMessage(prompt, "user");
//     input.value = "";
//     setAILoading(true);

//     try {
//         const response = await fetch("/api/ai/generate", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ prompt, currentHtml }),
//         });

//         const result = await response.json();

//         if (!result.success) {
//             addAIMessage(`Error: ${result.message}`, "ai");
//             return;
//         }

//         // Inject the returned HTML into the editor textarea
//         const editor = document.getElementById("htmlEditor");
//         if (editor) {
//             editor.value = result.html;
//             // Trigger the live preview update
//             editor.dispatchEvent(new Event("input", { bubbles: true }));
//         }

//         addAIMessage("✓ Component generated — review it in the editor above.", "ai");

//     } catch (err) {
//         console.error("AI generate error:", err);
//         addAIMessage("Server error. Please try again.", "ai");
//     } finally {
//         setAILoading(false);
//     }
// };

// // Allow pressing Enter in the AI prompt input to trigger generation
// document.addEventListener("DOMContentLoaded", () => {
//     const input = document.getElementById("aiPromptInput");
//     if (input) {
//         input.addEventListener("keydown", (e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleAIGenerate();
//             }
//         });
//     }
// });


// // ─── AI Component Generator (Streaming) ────────────────────────────────────

// const addAIMessage = (text, role = "ai") => {
//     const container = document.getElementById("aiMessages");
//     if (!container) return;
//     container.classList.remove("hidden");
//     const msg = document.createElement("div");
//     msg.className = role === "user"
//         ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
//         : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
//     msg.textContent = text;
//     container.appendChild(msg);
//     container.scrollTop = container.scrollHeight;
// };

// const showAISkeleton = (visible) => {
//     const skeleton = document.getElementById("aiSkeleton");
//     if (!skeleton) return;
//     skeleton.classList.toggle("hidden", !visible);
//     skeleton.classList.toggle("flex", visible);
// };

// const setAILoading = (loading) => {
//     const btn = document.getElementById("aiGenerateBtn");
//     const send = document.getElementById("aiSendIcon");
//     const spin = document.getElementById("aiSpinner");
//     const input = document.getElementById("aiPromptInput");

//     if (!btn) return;
//     btn.disabled = loading;
//     input.disabled = loading;
//     send.classList.toggle("hidden", loading);
//     spin.classList.toggle("hidden", !loading);
//     input.classList.toggle("opacity-50", loading);
// };

// /**
//  * Streams delta text into the editor character-by-character (typewriter effect).
//  * Fires an "input" event after every chunk so the live preview stays in sync.
//  */
// const streamIntoEditor = (() => {
//     let queue = [];
//     let running = false;
//     let editor = null;

//     const flush = () => {
//         if (!queue.length) { running = false; return; }
//         running = true;
//         const chunk = queue.shift();
//         if (editor) {
//             editor.value += chunk;
//             editor.dispatchEvent(new Event("input", { bubbles: true }));
//             // Scroll the textarea to the bottom so the user sees new lines appear
//             editor.scrollTop = editor.scrollHeight;
//         }
//         // ~16ms per chunk ≈ 60fps feel; adjust lower for faster typing
//         setTimeout(flush, 16);
//     };

//     return {
//         init() { editor = document.getElementById("htmlEditor"); queue = []; running = false; },
//         push(t) { queue.push(t); if (!running) flush(); },
//         clear() { if (editor) editor.value = ""; queue = []; running = false; }
//     };
// })();

// const handleAIGenerate = async () => {
//     const input = document.getElementById("aiPromptInput");
//     const prompt = input?.value?.trim();
//     if (!prompt) { input?.focus(); return; }

//     const currentHtml = document.getElementById("htmlEditor")?.value?.trim() || "";

//     addAIMessage(prompt, "user");
//     input.value = "";

//     setAILoading(true);
//     showAISkeleton(true);

//     // Clear the editor before streaming begins
//     streamIntoEditor.init();
//     streamIntoEditor.clear();
//     // Also clear the live preview immediately
//     const preview = document.getElementById("preview");
//     if (preview) preview.innerHTML = "";

//     let firstChunkReceived = false;

//     try {
//         const response = await fetch("/api/ai/generate-stream", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ prompt, currentHtml }),
//         });

//         if (!response.ok) {
//             const err = await response.json().catch(() => ({ message: "Unknown error" }));
//             addAIMessage(`Error: ${err.message}`, "ai");
//             return;
//         }

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();
//         let leftover = "";

//         while (true) {
//             const { done, value } = await reader.read();
//             if (done) break;

//             leftover += decoder.decode(value, { stream: true });

//             // SSE lines are separated by "\n\n"
//             const parts = leftover.split("\n\n");
//             leftover = parts.pop(); // keep incomplete last chunk

//             for (const part of parts) {
//                 const line = part.trim();
//                 if (!line.startsWith("data:")) continue;

//                 let parsed;
//                 try { parsed = JSON.parse(line.slice(5).trim()); }
//                 catch { continue; }

//                 if (parsed.type === "delta") {
//                     // Hide skeleton on first real content
//                     if (!firstChunkReceived) {
//                         firstChunkReceived = true;
//                         showAISkeleton(false);
//                         setAILoading(false);
//                     }
//                     // Strip accidental markdown fences that may appear in first chunk
//                     const clean = parsed.text.replace(/^```[\w]*\n?/g, "").replace(/```/g, "");
//                     streamIntoEditor.push(clean);
//                 }

//                 if (parsed.type === "done") {
//                     addAIMessage("✓ Component generated — review it in the editor.", "ai");
//                 }

//                 if (parsed.type === "error") {
//                     addAIMessage(`Error: ${parsed.message}`, "ai");
//                     showAISkeleton(false);
//                     setAILoading(false);
//                 }
//             }
//         }
//     } catch (err) {
//         console.error("AI stream error:", err);
//         addAIMessage("Server error. Please try again.", "ai");
//     } finally {
//         showAISkeleton(false);
//         setAILoading(false);
//     }
// };

// // Press Enter to generate
// document.addEventListener("DOMContentLoaded", () => {
//     const input = document.getElementById("aiPromptInput");
//     if (input) {
//         input.addEventListener("keydown", (e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleAIGenerate();
//             }
//         });
//     }
// });


// // ─── AI Component Generator (Streaming + Cursor Edit Animation) good ────────────

// const addAIMessage = (text, role = "ai") => {
//     const container = document.getElementById("aiMessages");
//     if (!container) return;
//     container.classList.remove("hidden");
//     const msg = document.createElement("div");
//     msg.className = role === "user"
//         ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
//         : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
//     msg.textContent = text;
//     container.appendChild(msg);
//     container.scrollTop = container.scrollHeight;
// };

// const showAISkeleton = (visible) => {
//     const skeleton = document.getElementById("aiSkeleton");
//     if (!skeleton) return;
//     skeleton.classList.toggle("hidden", !visible);
//     skeleton.classList.toggle("flex", visible);
// };

// const setAILoading = (loading) => {
//     const btn = document.getElementById("aiGenerateBtn");
//     const send = document.getElementById("aiSendIcon");
//     const spin = document.getElementById("aiSpinner");
//     const input = document.getElementById("aiPromptInput");
//     if (!btn) return;
//     btn.disabled = loading;
//     input.disabled = loading;
//     send.classList.toggle("hidden", loading);
//     spin.classList.toggle("hidden", !loading);
//     input.classList.toggle("opacity-50", loading);
// };

// const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// const scrollToIndex = (textarea, index) => {
//     textarea.focus();
//     textarea.setSelectionRange(index, index);
// };

// // ── LCS line differ ──────────────────────────────────────────────────────────
// const diffLines = (oldText, newText) => {
//     const a = oldText === "" ? [] : oldText.split("\n");
//     const b = newText === "" ? [] : newText.split("\n");
//     const m = a.length, n = b.length;
//     const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
//     for (let i = m - 1; i >= 0; i--)
//         for (let j = n - 1; j >= 0; j--)
//             dp[i][j] = a[i] === b[j]
//                 ? dp[i + 1][j + 1] + 1
//                 : Math.max(dp[i + 1][j], dp[i][j + 1]);

//     const ops = [];
//     let i = 0, j = 0;
//     while (i < m || j < n) {
//         if (i < m && j < n && a[i] === b[j]) {
//             ops.push({ type: "keep", lineA: a[i], lineB: b[j] }); i++; j++;
//         } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
//             ops.push({ type: "add", lineB: b[j] }); j++;
//         } else {
//             ops.push({ type: "remove", lineA: a[i] }); i++;
//         }
//     }
//     return ops;
// };

// // ── Group ops into hunks: consecutive removes/adds batched together ──────────
// // Each hunk = { keeps_before, removes[], adds[] }
// // This guarantees we always delete first, then insert, for every changed region.
// const groupIntoHunks = (ops) => {
//     const hunks = [];
//     let i = 0;
//     while (i < ops.length) {
//         if (ops[i].type === "keep") {
//             hunks.push({ type: "keep", line: ops[i].lineA });
//             i++;
//         } else {
//             // Collect all consecutive removes and adds
//             const removes = [];
//             const adds = [];
//             while (i < ops.length && ops[i].type === "remove") { removes.push(ops[i].lineA); i++; }
//             while (i < ops.length && ops[i].type === "add") { adds.push(ops[i].lineB); i++; }
//             // If they were interleaved (add before remove), keep collecting
//             while (i < ops.length && (ops[i].type === "remove" || ops[i].type === "add")) {
//                 if (ops[i].type === "remove") removes.push(ops[i].lineA);
//                 else adds.push(ops[i].lineB);
//                 i++;
//             }
//             hunks.push({ type: "change", removes, adds });
//         }
//     }
//     return hunks;
// };

// // ── Core animation ───────────────────────────────────────────────────────────
// const animateEdits = async (oldHtml, newHtml) => {
//     const editor = document.getElementById("htmlEditor");
//     if (!editor) return;

//     const ops = diffLines(oldHtml, newHtml);
//     const hunks = groupIntoHunks(ops);

//     let current = oldHtml;
//     let charOffset = 0;

//     for (const hunk of hunks) {
//         if (hunk.type === "keep") {
//             charOffset += hunk.line.length + 1; // +1 for \n
//             continue;
//         }

//         // ── STEP 1: delete all removed lines first ───────────────────────
//         for (const removedLine of hunk.removes) {
//             const lineLen = removedLine.length;
//             const hasNewline = current[charOffset + lineLen] === "\n";
//             const deleteLen = lineLen + (hasNewline ? 1 : 0);

//             scrollToIndex(editor, charOffset);
//             await sleep(40);

//             for (let k = 0; k < deleteLen; k++) {
//                 current = current.slice(0, charOffset) + current.slice(charOffset + 1);
//                 editor.value = current;
//                 editor.setSelectionRange(charOffset, charOffset);
//                 editor.dispatchEvent(new Event("input", { bubbles: true }));
//                 await sleep(6);
//             }
//             // charOffset stays — next line is now at same position
//         }

//         // ── STEP 2: type all added lines after ───────────────────────────
//         for (const addedLine of hunk.adds) {
//             const toInsert = addedLine + "\n";

//             scrollToIndex(editor, charOffset);
//             await sleep(30);

//             for (const ch of toInsert) {
//                 current = current.slice(0, charOffset) + ch + current.slice(charOffset);
//                 charOffset++;
//                 editor.value = current;
//                 editor.setSelectionRange(charOffset, charOffset);
//                 editor.dispatchEvent(new Event("input", { bubbles: true }));
//                 await sleep(10);
//             }
//         }
//     }

//     // Final write to guarantee correctness
//     editor.value = newHtml;
//     editor.dispatchEvent(new Event("input", { bubbles: true }));
// };

// // ── Main handler ─────────────────────────────────────────────────────────────
// const handleAIGenerate = async () => {
//     const input = document.getElementById("aiPromptInput");
//     const prompt = input?.value?.trim();
//     if (!prompt) { input?.focus(); return; }

//     const editor = document.getElementById("htmlEditor");
//     const currentHtml = editor?.value ?? "";
//     const isModify = currentHtml.trim().length > 0;

//     addAIMessage(prompt, "user");
//     input.value = "";

//     setAILoading(true);
//     showAISkeleton(true);

//     let accumulated = "";
//     let firstChunkReceived = false;

//     try {
//         const response = await fetch("/api/ai/generate-stream", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ prompt, currentHtml }),
//         });

//         if (!response.ok) {
//             const err = await response.json().catch(() => ({ message: "Unknown error" }));
//             addAIMessage(`Error: ${err.message}`, "ai");
//             return;
//         }

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();
//         let leftover = "";

//         while (true) {
//             const { done, value } = await reader.read();
//             if (done) break;

//             leftover += decoder.decode(value, { stream: true });
//             const parts = leftover.split("\n\n");
//             leftover = parts.pop();

//             for (const part of parts) {
//                 const line = part.trim();
//                 if (!line.startsWith("data:")) continue;
//                 let parsed;
//                 try { parsed = JSON.parse(line.slice(5).trim()); } catch { continue; }

//                 if (parsed.type === "delta") {
//                     if (!firstChunkReceived) {
//                         firstChunkReceived = true;
//                         showAISkeleton(false);
//                         setAILoading(false);

//                         if (!isModify) {
//                             if (editor) editor.value = "";
//                             const preview = document.getElementById("preview");
//                             if (preview) preview.innerHTML = "";
//                         }
//                     }

//                     const clean = parsed.text
//                         .replace(/^```[\w]*\n?/g, "")
//                         .replace(/```/g, "");

//                     accumulated += clean;

//                     // Fresh generate: show live as it streams
//                     if (!isModify && editor) {
//                         editor.value = accumulated;
//                         editor.scrollTop = editor.scrollHeight;
//                         editor.dispatchEvent(new Event("input", { bubbles: true }));
//                     }
//                 }

//                 if (parsed.type === "done") {
//                     const finalHtml = accumulated
//                         .replace(/^```[\w]*\n?/gm, "")
//                         .replace(/```$/gm, "")
//                         .trim();

//                     if (isModify) {
//                         await animateEdits(currentHtml, finalHtml);
//                     } else {
//                         if (editor) {
//                             editor.value = finalHtml;
//                             editor.dispatchEvent(new Event("input", { bubbles: true }));
//                         }
//                     }

//                     addAIMessage(
//                         isModify ? "✓ Changes applied." : "✓ Component generated.",
//                         "ai"
//                     );
//                 }

//                 if (parsed.type === "error") {
//                     addAIMessage(`Error: ${parsed.message}`, "ai");
//                     showAISkeleton(false);
//                     setAILoading(false);
//                 }
//             }
//         }
//     } catch (err) {
//         console.error("AI stream error:", err);
//         addAIMessage("Server error. Please try again.", "ai");
//     } finally {
//         showAISkeleton(false);
//         setAILoading(false);
//     }
// };

// // Enter to submit
// document.addEventListener("DOMContentLoaded", () => {
//     const input = document.getElementById("aiPromptInput");
//     if (input) {
//         input.addEventListener("keydown", (e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleAIGenerate();
//             }
//         });
//     }
// });

// ─── AI Component Generator (Streaming + Cursor Edit Animation) ────────────

const addAIMessage = (text, role = "ai") => {
    const container = document.getElementById("aiMessages");
    if (!container) return;
    container.classList.remove("hidden");
    const msg = document.createElement("div");
    msg.className = role === "user"
        ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
        : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
};

const showAISkeleton = (visible) => {
    const skeleton = document.getElementById("aiSkeleton");
    if (!skeleton) return;
    skeleton.classList.toggle("hidden", !visible);
    skeleton.classList.toggle("flex", visible);
};

const setAILoading = (loading) => {
    const btn = document.getElementById("aiGenerateBtn");
    const send = document.getElementById("aiSendIcon");
    const spin = document.getElementById("aiSpinner");
    const input = document.getElementById("aiPromptInput");
    if (!btn) return;
    btn.disabled = loading;
    input.disabled = loading;
    send.classList.toggle("hidden", loading);
    spin.classList.toggle("hidden", !loading);
    input.classList.toggle("opacity-50", loading);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Skeleton blink on the editor ────────────────────────────────────────────
// Code stays fully visible but pulses opacity like a skeleton loader,
// signalling "thinking" without hiding what's already there.
const SKELETON_STYLE_ID = "ai-editor-skeleton-style";

const setEditorSkeleton = (active) => {
    const editor = document.getElementById("htmlEditor");
    if (!editor) return;

    let styleEl = document.getElementById(SKELETON_STYLE_ID);

    if (active) {
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = SKELETON_STYLE_ID;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            @keyframes ai-blink {
                0%, 100% { opacity: 1;   }
                50%       { opacity: 0.5; }
            }
            #htmlEditor.ai-skeleton {
                animation: ai-blink 1.4s ease-in-out infinite !important;
                pointer-events: none;
            }
        `;
        editor.classList.add("ai-skeleton");
    } else {
        editor.classList.remove("ai-skeleton");
        setTimeout(() => {
            styleEl = document.getElementById(SKELETON_STYLE_ID);
            if (styleEl) styleEl.textContent = "";
        }, 300);
    }
};

// ── Scroll so the line at charIndex is vertically centred ───────────────────
// Uses a hidden mirror div that exactly clones the textarea's layout so we
// can measure the real pixel offset of any character, then centre it.
let _scrollMirror = null;
const scrollToChar = (textarea, charIndex) => {
    if (!_scrollMirror) {
        _scrollMirror = document.createElement("div");
        _scrollMirror.setAttribute("aria-hidden", "true");
        Object.assign(_scrollMirror.style, {
            position: "absolute",
            top: "-9999px",
            left: "-9999px",
            visibility: "hidden",
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            boxSizing: "border-box",
        });
        document.body.appendChild(_scrollMirror);
    }

    // Clone every layout-affecting style from the textarea
    const cs = window.getComputedStyle(textarea);
    [
        "width", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
        "borderTopWidth", "borderBottomWidth", "fontFamily", "fontSize",
        "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "tabSize"
    ].forEach(p => _scrollMirror.style[p] = cs[p]);

    // Fill mirror with the text up to charIndex then a marker span
    const before = document.createTextNode(textarea.value.slice(0, charIndex));
    const marker = document.createElement("span");
    marker.textContent = "\u200b"; // zero-width space — just a measurement anchor
    _scrollMirror.innerHTML = "";
    _scrollMirror.appendChild(before);
    _scrollMirror.appendChild(marker);

    // offsetTop of the marker = exact pixel top of our target line
    const lineTop = marker.offsetTop;
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
    const centred = lineTop - (textarea.clientHeight / 2) + (lineHeight / 2);
    textarea.scrollTop = Math.max(0, centred);
};

// ── LCS line differ ──────────────────────────────────────────────────────────
const diffLines = (oldText, newText) => {
    const a = oldText === "" ? [] : oldText.split("\n");
    const b = newText === "" ? [] : newText.split("\n");
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = m - 1; i >= 0; i--)
        for (let j = n - 1; j >= 0; j--)
            dp[i][j] = a[i] === b[j]
                ? dp[i + 1][j + 1] + 1
                : Math.max(dp[i + 1][j], dp[i][j + 1]);

    const ops = [];
    let i = 0, j = 0;
    while (i < m || j < n) {
        if (i < m && j < n && a[i] === b[j]) {
            ops.push({ type: "keep", lineA: a[i] }); i++; j++;
        } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
            ops.push({ type: "add", lineB: b[j] }); j++;
        } else {
            ops.push({ type: "remove", lineA: a[i] }); i++;
        }
    }
    return ops;
};

// Group so removes always come before adds per changed region
const groupIntoHunks = (ops) => {
    const hunks = [];
    let i = 0;
    while (i < ops.length) {
        if (ops[i].type === "keep") {
            hunks.push({ type: "keep", line: ops[i].lineA }); i++;
        } else {
            const removes = [], adds = [];
            while (i < ops.length && ops[i].type !== "keep") {
                if (ops[i].type === "remove") removes.push(ops[i].lineA);
                else adds.push(ops[i].lineB);
                i++;
            }
            hunks.push({ type: "change", removes, adds });
        }
    }
    return hunks;
};

// ── Core animation ───────────────────────────────────────────────────────────
const animateEdits = async (oldHtml, newHtml) => {
    const editor = document.getElementById("htmlEditor");
    if (!editor) return;

    const hunks = groupIntoHunks(diffLines(oldHtml, newHtml));

    let current = oldHtml;
    let charOffset = 0;

    for (const hunk of hunks) {
        if (hunk.type === "keep") {
            charOffset += hunk.line.length + 1; // +1 for \n
            continue;
        }

        // Centre the textarea on this hunk's start line
        scrollToChar(editor, charOffset);
        editor.focus();
        editor.setSelectionRange(charOffset, charOffset);
        await sleep(120); // pause so user can see where we are

        // ── STEP 1: backspace removed lines ───────────────────────────────
        for (const removedLine of hunk.removes) {
            const hasNewline = current[charOffset + removedLine.length] === "\n";
            const deleteLen = removedLine.length + (hasNewline ? 1 : 0);

            for (let k = 0; k < deleteLen; k++) {
                current = current.slice(0, charOffset) + current.slice(charOffset + 1);
                editor.value = current;
                editor.setSelectionRange(charOffset, charOffset);
                editor.dispatchEvent(new Event("input", { bubbles: true }));
                await sleep(5);
            }
        }

        // ── STEP 2: type added lines ──────────────────────────────────────
        for (const addedLine of hunk.adds) {
            for (const ch of addedLine + "\n") {
                current = current.slice(0, charOffset) + ch + current.slice(charOffset);
                charOffset++;
                editor.value = current;
                editor.setSelectionRange(charOffset, charOffset);
                scrollToChar(editor, charOffset);
                editor.dispatchEvent(new Event("input", { bubbles: true }));
                await sleep(9);
            }
        }
    }

    // Guarantee final correctness
    editor.value = newHtml;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
};

// ── Main handler ─────────────────────────────────────────────────────────────
const handleAIGenerate = async () => {
    const input = document.getElementById("aiPromptInput");
    const prompt = input?.value?.trim();
    if (!prompt) { input?.focus(); return; }

    const editor = document.getElementById("htmlEditor");
    const currentHtml = editor?.value ?? "";
    const isModify = currentHtml.trim().length > 0;

    addAIMessage(prompt, "user");
    input.value = "";

    setAILoading(true);
    showAISkeleton(true);

    // Start skeleton blink immediately while Claude thinks
    if (isModify) setEditorSkeleton(true);

    let accumulated = "";
    let firstChunkReceived = false;

    try {
        const response = await fetch("/api/ai/generate-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, currentHtml }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: "Unknown error" }));
            addAIMessage(`Error: ${err.message}`, "ai");
            setEditorSkeleton(false);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let leftover = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            leftover += decoder.decode(value, { stream: true });
            const parts = leftover.split("\n\n");
            leftover = parts.pop();

            for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith("data:")) continue;
                let parsed;
                try { parsed = JSON.parse(line.slice(5).trim()); } catch { continue; }

                if (parsed.type === "delta") {
                    if (!firstChunkReceived) {
                        firstChunkReceived = true;
                        showAISkeleton(false);
                        setAILoading(false);

                        if (!isModify) {
                            if (editor) editor.value = "";
                            const preview = document.getElementById("preview");
                            if (preview) preview.innerHTML = "";
                        }
                    }

                    const clean = parsed.text
                        .replace(/^```[\w]*\n?/g, "")
                        .replace(/```/g, "");
                    accumulated += clean;

                    // Fresh generate: stream live into editor
                    if (!isModify && editor) {
                        editor.value = accumulated;
                        editor.scrollTop = editor.scrollHeight;
                        editor.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                    // Modify: skeleton stays on while we silently accumulate
                }

                if (parsed.type === "done") {
                    const finalHtml = accumulated
                        .replace(/^```[\w]*\n?/gm, "")
                        .replace(/```$/gm, "")
                        .trim();

                    if (isModify) {
                        // Remove skeleton → brief pause → start cursor animation
                        setEditorSkeleton(false);
                        await sleep(300);
                        await animateEdits(currentHtml, finalHtml);
                    } else {
                        if (editor) {
                            editor.value = finalHtml;
                            editor.dispatchEvent(new Event("input", { bubbles: true }));
                        }
                    }

                    addAIMessage(
                        isModify ? "✓ Changes applied." : "✓ Component generated.",
                        "ai"
                    );
                }

                if (parsed.type === "error") {
                    addAIMessage(`Error: ${parsed.message}`, "ai");
                    showAISkeleton(false);
                    setAILoading(false);
                    setEditorSkeleton(false);
                }
            }
        }
    } catch (err) {
        console.error("AI stream error:", err);
        addAIMessage("Server error. Please try again.", "ai");
        setEditorSkeleton(false);
    } finally {
        showAISkeleton(false);
        setAILoading(false);
    }
};

// Enter to submit
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