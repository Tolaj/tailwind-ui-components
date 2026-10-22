import { createDescriptionFromElement } from "../element-description/index.js"

let isDetailsOpen = false;

function updateStepIndicators(step) {
    const s1Dot = document.querySelector('#stepIndicator1 div');
    const s1Text = document.querySelector('#stepIndicator1 span');
    const s2Dot = document.querySelector('#stepIndicator2 div');
    const s2Text = document.querySelector('#stepIndicator2 span');
    if (!s1Dot) return;

    if (step === 1) {
        s1Dot.className = 'w-2 h-2 rounded-full bg-white';
        s1Text.className = 'text-xs text-white font-medium';
        s2Dot.className = 'w-2 h-2 rounded-full bg-gray-600';
        s2Text.className = 'text-xs text-gray-500 font-medium';
    } else {
        s1Dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        s1Text.className = 'text-xs text-emerald-400 font-medium';
        s2Dot.className = 'w-2 h-2 rounded-full bg-white';
        s2Text.className = 'text-xs text-white font-medium';
    }
}

export const handleNext = () => {
    const componentForm = document.getElementById("componentForm");
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
    details.classList.add("flex");
    cancelBtn.classList.add("hidden")
    backBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden")
    submitBtn.classList.remove("hidden")
    isDetailsOpen = true;
    updateStepIndicators(2);
}

export const handleBack = () => {
    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    details.classList.add("hidden");
    details.classList.remove("flex");
    cancelBtn.classList.remove("hidden")
    backBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden")
    submitBtn.classList.add("hidden")
    isDetailsOpen = false;
    updateStepIndicators(1);
}

export const handleClose = () => {
    const dialog = document.getElementById("dialog");
    document.getElementById('htmlEditor').value = '';
    document.getElementById('preview').innerHTML = '';

    const details = document.getElementById("detailsPanel");
    const cancelBtn = document.getElementById("cancelBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    details.classList.add("hidden");
    details.classList.remove("flex");
    cancelBtn.classList.remove("hidden");
    backBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
    submitBtn.classList.add("hidden");
    isDetailsOpen = false;
    updateStepIndicators(1);

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

    const htmlCode = document.getElementById('htmlEditor').value;

    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlCode, "text/html");

    const elementsDescription = Array.from(dom.body.children).map(child =>
        createDescriptionFromElement(child)
    );

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.htmlCode = htmlCode;
    data.elementsDescription = elementsDescription;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

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

        alert('Component published successfully!');
        handleClose();
        window.location.reload();

    } catch (error) {
        console.error('Save error:', error);
        alert(error.message || 'Failed to publish component');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish';
    }
};
