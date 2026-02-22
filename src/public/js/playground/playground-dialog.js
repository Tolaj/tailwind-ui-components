import { createDescriptionFromElement } from "../element-description/index.js"

let isDetailsOpen = false;

export const handleNext = () => {

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

export const handleBack = () => {
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

export const handleClose = () => {
    const dialog = document.getElementById("dialog");
    document.getElementById('htmlEditor').value = '';
    document.getElementById('preview').innerHTML = '';
    dialog.close()
}


export const handleSave = async (e) => {
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
