import { host } from "../host.js";
import { parseComponentSource } from "../../playground/component-source.js";

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const data = JSON.parse($("designData").textContent);

// Coming from the quick Add Component dialog: pick up the code and details it handed over.
if (!data.id && new URLSearchParams(window.location.search).has("draft")) {
    try {
        const d = JSON.parse(sessionStorage.getItem("wc:draft") || "null");
        if (d) {
            Object.assign(data, {
                htmlCode: d.html || "", title: d.title || "", category: d.category || "", description: d.description || "",
                tags: String(d.tags || "").split(",").map((t) => t.trim()).filter(Boolean), isPublished: d.isPublished !== "false",
            });
            sessionStorage.removeItem("wc:draft");
        }
    } catch { /* ignore a bad draft */ }
    host.showDesign(null);
}

// Back returns to wherever the editor was opened from (the Library link is the fallback).
try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith("/design")) {
        $("backLink").href = ref.href;
        $("backLink").title = "Back";
        $("backLabel").textContent = "Back";
    }
} catch { /* keep the Library link */ }
export const S = {};
S.parsed = parseComponentSource(data.htmlCode);
S.mode = "edit";
S.frameHeight = 600;
S.selected = null;
S.tree = null;
S.history = [];
S.hIndex = -1;
S.isNew = !data.id;
S.savedMarkup = S.isNew ? "" : S.parsed.markup;
S.lastKey = "";
S.lastTime = 0;
S.loadSeq = 0;
S.viewTouched = false;
S.sentZoom = 0;
S.tool = "move";
S.curKey = data.id || "draft-0";
S.switching = false;
S.switchToken = 0;
S.frameAt = null;
S.handingOver = false;
S.lastCustom = null;
S.editingInfo = null;
S.gestureOn = false;
S.frameSel = null;
S.ftMenu = false;
S.ftPop = null;
S.ftSides = {};
S.selData = null;
S.leftOpen = false;

export const model = { markup: S.parsed.markup };
export const isTailwindScript = (s) => s.src && /tailwindcss/i.test(s.src);

// ── State ────────────────────────────────────────────────────────────────────

export const DEFAULT_W = 1280;
export const collapsed = new Set();

export const frame = $("frame");
export const send = (msg) => frame.contentWindow && frame.contentWindow.postMessage(msg, "*");
