import { updateSourceBadge } from "./playground-badge.js";
import { pushCode } from "./playground-dialog.js";

export const clearEditor = () => {
    if (confirm("Clear all content?")) {
        document.getElementById("htmlEditor").value = "";
        pushCode("");
        updateSourceBadge("");
    }
};

/** The code box changed (typing, paste or the AI): the design editor beside it follows. */
export const handleChangeEditor = (e) => {
    pushCode(e.target.value);
    updateSourceBadge(e.target.value);
};
