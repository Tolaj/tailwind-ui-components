
let isDetailsOpen = false;

function updateStepIndicators(step) {
    const s1Dot = document.querySelector('#stepIndicator1 div');
    const s1Text = document.querySelector('#stepIndicator1 span');
    const s2Dot = document.querySelector('#stepIndicator2 div');
    const s2Text = document.querySelector('#stepIndicator2 span');
    if (!s1Dot) return;

    const on = 'h-2 w-2 rounded-full bg-neutral-900';
    const off = 'h-2 w-2 rounded-full bg-neutral-300';
    const done = 'h-2 w-2 rounded-full bg-[#0b7a3e]';
    const textOn = 'font-medium text-neutral-900';
    const textOff = 'font-medium text-neutral-400';

    s1Dot.className = step === 1 ? on : done;
    s1Text.className = textOn;
    s2Dot.className = step === 1 ? off : on;
    s2Text.className = step === 1 ? textOff : textOn;
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

    document.getElementById("componentForm").reset();
    setEditingComponent(null);
    dialog.close()
}

let editingId = null;

function setEditingComponent(item) {
    editingId = item ? item.id : null;
    document.getElementById("editorTitle").textContent = item ? "Edit component" : "New component";
}

export const openForNew = () => {
    setEditingComponent(null);
    document.getElementById("dialog").showModal();
};

export const openForEdit = (item) => {
    setEditingComponent(item);
    const editor = document.getElementById("htmlEditor");
    editor.value = item.htmlCode;
    document.getElementById("title").value = item.title;
    document.getElementById("category").value = item.category;
    document.getElementById("description").value = item.description;
    document.getElementById("tags").value = (item.tags || []).join(", ");
    document.getElementById("isPublished").value = String(item.isPublished);
    document.getElementById("dialog").showModal();
    editor.dispatchEvent(new Event("input", { bubbles: true }));
};


export const handleSave = async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById("submitBtn");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const htmlCode = document.getElementById('htmlEditor').value;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.htmlCode = htmlCode;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    try {
        const response = await fetch(editingId ? `/api/components/${editingId}` : '/api/components', {
            method: editingId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        alert(editingId ? 'Component updated' : 'Component published successfully!');
        handleClose();
        window.location.reload();

    } catch (error) {
        console.error('Save error:', error);
        alert(error.message || 'Failed to publish component');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish';
    }
};


// Hands the current code and details to the full visual editor.
export const openFullEditor = () => {
    const get = (id) => (document.getElementById(id) ? document.getElementById(id).value : "");
    const draft = {
        html: get("htmlEditor"), title: get("title"), category: get("category"),
        description: get("description"), tags: get("tags"), isPublished: get("isPublished"),
    };
    try { sessionStorage.setItem("wc:draft", JSON.stringify(draft)); } catch { /* storage unavailable: open empty */ }
    window.location.href = "/design/new?draft=1";
};
