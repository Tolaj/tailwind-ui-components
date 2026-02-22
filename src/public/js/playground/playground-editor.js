import { createDescriptionFromElement, createElementFromDescription } from "../element-description/index.js"


function sanitizePreviewInputs(previewDiv) {
    previewDiv.querySelectorAll('input, textarea, select').forEach(el => {
        el.setAttribute('form', 'none');
    });
}

export const clearEditor = () => {
    if (confirm('Clear all content?')) {
        document.getElementById('htmlEditor').value = '';
        document.getElementById('preview').innerHTML = '';
    }
}

export const handleChangeEditor = (e) => {
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
        sanitizePreviewInputs(element)
        preview.appendChild(element);
    });
};