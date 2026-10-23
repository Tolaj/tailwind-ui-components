// The editor's own colour picker. The browser's picker opens wherever it likes, often on top of the element being coloured;
// this one is placed beside the selection, so the change can be watched as it happens. It only reports colours: the caller
// decides where they go (editor.js feeds them to the same colour fields, so live updates and undo work as before).

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function hsvToHex(h, s, v) {
    const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}
function hexToHsv(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    const n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

const W = 232, H = 268, GAP = 12;
let box = null, state = null;

function build() {
    box = document.createElement("div");
    box.className = "cpick";
    box.innerHTML = `<div class="cp-sv"><div class="cp-white"></div><div class="cp-black"></div><i class="cp-dot"></i></div>
        <div class="cp-hue"><i class="cp-knob"></i></div>
        <div class="cp-row"><span class="cp-prev"></span><input class="cp-hex" spellcheck="false" maxlength="7" aria-label="Hex colour">${window.EyeDropper ? '<button type="button" class="cp-drop" title="Pick a colour from the screen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9M3 21v-3l9-9m3-3 3-3 3 3-3 3 1 1-2 2-6-6 2-2Z"/></svg></button>' : ""}</div>`;
    document.body.appendChild(box);
    // presses inside keep focus where it is (the colour field it feeds stays the active one), except in the hex field
    box.addEventListener("mousedown", (e) => { if (!e.target.closest(".cp-hex")) e.preventDefault(); });
    const drag = (sel, move) => {
        const area = box.querySelector(sel);
        area.addEventListener("pointerdown", (e) => {
            area.setPointerCapture(e.pointerId);
            move(e, area.getBoundingClientRect());
            const mv = (ev) => move(ev, area.getBoundingClientRect());
            const up = () => { area.removeEventListener("pointermove", mv); area.removeEventListener("pointerup", up); };
            area.addEventListener("pointermove", mv);
            area.addEventListener("pointerup", up);
        });
    };
    drag(".cp-sv", (e, r) => { state.s = clamp((e.clientX - r.left) / r.width, 0, 1); state.v = 1 - clamp((e.clientY - r.top) / r.height, 0, 1); emit(); });
    drag(".cp-hue", (e, r) => { state.h = clamp((e.clientX - r.left) / r.width, 0, 1) * 359.9; emit(); });
    const hex = box.querySelector(".cp-hex");
    const typed = () => { const v = hexToHsv(hex.value.startsWith("#") ? hex.value : "#" + hex.value); if (v) { Object.assign(state, v); emit(); } else paint(); };
    hex.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); typed(); close(); } if (e.key === "Escape") { e.preventDefault(); close(); } });
    hex.addEventListener("change", typed);
    const drop = box.querySelector(".cp-drop");
    if (drop) drop.addEventListener("click", async () => { try { const r = await new window.EyeDropper().open(); const v = hexToHsv(r.sRGBHex); if (v) { Object.assign(state, v); emit(); } } catch { /* cancelled */ } });
    // a press anywhere else, or Escape, closes it
    document.addEventListener("pointerdown", (e) => { if (state && !box.contains(e.target) && !(state.opener && state.opener.contains(e.target))) close(); }, true);
    document.addEventListener("keydown", (e) => { if (state && e.key === "Escape" && !box.contains(document.activeElement)) close(); }, true);
    // a click inside the design happens in its own frame and never reaches this document: the frame taking focus closes it too
    window.addEventListener("blur", () => setTimeout(() => { if (state && document.activeElement && document.activeElement.tagName === "IFRAME") close(); }, 0));
}

function paint() {
    const { h, s, v } = state, hex = hsvToHex(h, s, v);
    box.querySelector(".cp-sv").style.background = `hsl(${h} 100% 50%)`;
    Object.assign(box.querySelector(".cp-dot").style, { left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hex });
    Object.assign(box.querySelector(".cp-knob").style, { left: `${(h / 360) * 100}%`, background: `hsl(${h} 100% 50%)` });
    box.querySelector(".cp-prev").style.background = hex;
    const field = box.querySelector(".cp-hex");
    if (document.activeElement !== field) field.value = hex.toUpperCase();
    return hex;
}
function emit() { const hex = paint(); if (hex !== state.last) { state.last = hex; state.onInput(hex); } }

/** Beside `near` (the selection), on whichever side has room inside `bounds`; failing that, where it covers the least of it. */
function place(near, bounds, from) {
    const fits = (x, y) => x >= bounds.left && y >= bounds.top && x + W <= bounds.right && y + H <= bounds.bottom;
    const midY = clamp(near.top, bounds.top, bounds.bottom - H), midX = clamp(near.left, bounds.left, bounds.right - W);
    const spots = [[near.right + GAP, midY], [near.left - GAP - W, midY], [midX, near.bottom + GAP], [midX, near.top - GAP - H]];
    const ok = spots.find(([x, y]) => fits(x, y));
    if (ok) return ok;
    // the element fills the view: the corner of the view farthest from the swatch that opened it
    const x = from && from.left > (bounds.left + bounds.right) / 2 ? bounds.left + GAP : bounds.right - W - GAP;
    return [clamp(x, 0, innerWidth - W), clamp(bounds.top + GAP, 0, innerHeight - H)];
}

/**
 * Opens the picker. value: "#rrggbb"; near: the selected element's rect on screen; bounds: the area to stay in; opener: the
 * swatch pressed (pressing it again doesn't close it underneath); onInput(hex) while picking; onClose(hex) once it closes.
 */
export function openColorPicker({ value, near, bounds, opener, onInput, onClose }) {
    if (!box) build();
    if (state) close();
    state = { ...(hexToHsv(value) || { h: 0, s: 0, v: 0 }), last: null, opener, onInput, onClose };
    state.last = hsvToHex(state.h, state.s, state.v);
    paint();
    const [x, y] = place(near || opener.getBoundingClientRect(), bounds || { left: 0, top: 0, right: innerWidth, bottom: innerHeight }, opener && opener.getBoundingClientRect());
    Object.assign(box.style, { left: `${x}px`, top: `${y}px`, display: "block" });
}

export function closeColorPicker() { if (state) close(); }

function close() {
    const s = state;
    state = null;
    box.style.display = "none";
    s.onClose(s.last);
}

/** The swatch the open picker belongs to, or null. */
export const colorPickerOpener = () => (state ? state.opener : null);
