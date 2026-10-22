import { renderPreview, updateSourceBadge } from "./playground-render.js";


export const clearEditor = () => {
    if (confirm('Clear all content?')) {
        document.getElementById('htmlEditor').value = '';
        document.getElementById('preview').innerHTML = '';
        updateSourceBadge('');
    }
}

export const handleChangeEditor = (e) => {
    renderPreview(e.target.value);
    updateSourceBadge(e.target.value);
};
