import { closeColorPicker } from "../color-picker.js";
import { CSS_PROP_LIST } from "../css-props.js";
import { S, frame, model, send } from "./base.js";
import { docs, scheduleLayout, selectFrame, wraps } from "./designs.js";
import { pathKey, renderLayers } from "./layers.js";
import { FLOAT_ACTIONS, ftb, renderFloat, renderSel } from "./frame-handles.js";
import { handleKey, keyZoom, setSpace, setTool } from "./toolbar.js";
import { applyView, fitTo, handleWheel, layout, positions, view } from "./plane.js";
import { commit, updateChrome } from "./docs.js";
import { convertGesture, renderInspector } from "./inspector.js";
import { updateCodeHighlight } from "./code-panel.js";

let pendingKey = "";
export const cmd = (msg, key = "") => { pendingKey = key; send(key ? { key, ...msg } : msg); };

/** Registers this part's listeners and does its first draw (called once, in order, by editor.js). */
export function init() {

    // ── Messages from the frame ──────────────────────────────────────────────────
    window.addEventListener("message", (e) => {
        const m = e.data || {};
        if (m.type === "preview-height" && e.source !== frame.contentWindow) {
            for (const [key, en] of wraps) {
                if (en.ghost && en.ghost.contentWindow === e.source) { docs.get(key).height = Math.max(120, Math.min(6000, m.height)); scheduleLayout(); return; }
            }
            return;
        }
        if (e.source !== frame.contentWindow) return;
        // a document that was replaced (switching designs reloads the frame) can still have messages in flight
        if (m.load !== undefined && m.load !== S.loadSeq) return;
        if (S.handingOver) return; // the page being left, still in the frame for a moment (activate)
        // Pressing inside the page doesn't take focus from a field in the bar. Let that field commit (to the element it was showing)
        // before the selection moves on, so the bar then rebuilds for the new element instead of keeping a stale field.
        // An edit reports the same element back: that must not blur a field still in use (a colour picker being dragged).
        const otherElement = m.type === "selected" && !(S.selected && m.info && pathKey(S.selected.path) === pathKey(m.info.path));
        if (otherElement || (m.type === "gesture" && m.on)) {
            closeColorPicker(); // its colours belong to the element it was opened for
            const a = document.activeElement;
            if (a && ftb.contains(a) && a.matches("input, select")) a.blur();
        }
        if (m.type === "zoomKey") return keyZoom(m.key);
        if (m.type === "wheel") {
            const pos = positions()[S.curKey] || { x: 0, y: 0 };
            return handleWheel({ dx: m.dx, dy: m.dy, zoomKey: m.zoom, cx: view.x + (pos.x + m.x) * view.z, cy: view.y + (pos.y + m.y) * view.z });
        }
        if (m.type === "ready") {
            if (S.switching) {
                S.switching = false;
                // the frame moves over now (layout below) but shows a moment later, once Tailwind has styled the new design; the
                // snapshot is right in the meantime
                const key = S.curKey, token = S.switchToken;
                setTimeout(() => {
                    if (token !== S.switchToken || key !== S.curKey) return;
                    const en = wraps.get(key);
                    if (en && en.ghost) { en.ghost.remove(); en.ghost = null; }
                    frame.style.visibility = "";
                }, 120);
            }
            if (!S.history.length) { S.history = [m.html]; S.hIndex = 0; model.markup = m.html; if (!S.isNew) S.savedMarkup = m.html; }
            S.tree = m.tree;
            renderLayers();
            updateChrome();
            layout();
            if (!S.viewTouched) fitTo([S.curKey]);
            S.sentZoom = 0;
            applyView();
            send({ cmd: "tool", tool: S.tool });
            send({ cmd: "cssProps", props: CSS_PROP_LIST });
            renderFloat();
        } else if (m.type === "height" || m.type === "preview-height") {
            S.frameHeight = m.height;
            layout();
            if (!S.viewTouched) fitTo([S.curKey]);
        } else if (m.type === "changed") {
            S.tree = m.tree;
            if (m.silent) model.markup = m.html;
            else commit(m.html, m.key || pendingKey);
            pendingKey = "";
            if (m.info) S.selected = m.info;
            renderLayers();
            renderInspector();
            renderFloat();
        } else if (m.type === "radius") {
            // a corner dot was dragged: apply the radius the same way the toolbar does (class in Tailwind mode, style otherwise)
            if (S.selected && pathKey(S.selected.path) === pathKey(m.path)) FLOAT_ACTIONS.radius(m.value);
        } else if (m.type === "info") {
            // the same element with fresh numbers (styles finished loading): update quietly
            if (S.selected && m.info && pathKey(S.selected.path) === pathKey(m.info.path)) {
                S.selected = m.info;
                renderInspector();
                renderFloat();
            }
        } else if (m.type === "typing") {
            model.markup = m.html;
            updateChrome();
        } else if (m.type === "overlay") {
            S.selData = m;
            renderSel();
        } else if (m.type === "editing") {
            S.editingInfo = m;
            renderFloat();
        } else if (m.type === "gesture") {
            S.gestureOn = m.on;
            renderFloat();
        } else if (m.type === "tool") {
            setTool(m.tool, true);
        } else if (m.type === "space") {
            setSpace(m.down);
        } else if (m.type === "selected") {
            // the same element reporting again (after an edit) keeps its open menu; a different one starts fresh
            const newSelection = !(S.selected && m.info && pathKey(S.selected.path) === pathKey(m.info.path));
            if (newSelection) { S.ftMenu = false; S.ftPop = null; S.ftSides = {}; }
            S.selected = m.info;
            S.frameSel = null;
            updateCodeHighlight(newSelection); // find it in the code, and scroll there when it is a different element
            renderLayers();
            renderInspector();
            renderFloat();
        } else if (m.type === "frameClick") {
            selectFrame(); // the empty part of the design was clicked: the frame, with its handles and the page panel
        } else if (m.type === "hoverFrame") {
            const en = wraps.get(S.curKey);
            if (en) en.wrap.classList.toggle("bodyhover", Boolean(m.on));
        } else if (m.type === "convert") {
            convertGesture(m.items || []);
        } else if (m.type === "key") {
            handleKey(m);
        }
    });
}
