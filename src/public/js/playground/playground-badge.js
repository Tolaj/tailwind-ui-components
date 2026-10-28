import { parseComponentSource } from "@windcraft/editor/playground/component-source.js";

/** The pill above the code: what the pasted source is made of (HTML, CSS, JS, Tailwind). */
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
