// What the Properties panel remembers: its tab, the breakpoint and state new classes are written for, which sections are
// open, which colour palette is open, and whether the open design uses Tailwind. One store; the editor changes it through
// the functions below and redraws the panel when it changes (editor.js), and the components read it through useUi().
import { createContext, useContext } from "../vendor/preact-htm.js";
import { createStore } from "./store.js";

/** Sections that start open (the rest start closed). */
const OPEN_AT_START = ["geom", "css-layout", "css-size", "css-spacing", "css-type", "css-fill", "css-border", "layout", "size", "spacing", "typography", "fill", "border"];

/**
 * tab: "design" | "classes" (the Code tab) | "ai". bp, st: the breakpoint and state ("" is none) new classes are written for.
 * open, closed: section ids as the panel remembers them (a section can also open by itself). palette: the colour group whose
 * palette is open. docTailwind: whether the open design uses Tailwind (what a value nothing sets yet is written as).
 */
export const panelStore = createStore({
    tab: "design",
    bp: "",
    st: "",
    open: new Set(OPEN_AT_START),
    closed: /** @type {Set<string>} */ (new Set()),
    palette: /** @type {string | null} */ (null),
    docTailwind: true,
});

/** The state the panel is drawn from: the store's, plus what is worked out at the time of drawing (the frame's width). */
export const UiContext = createContext({ ...panelStore.get(), frameW: 0 });
export const useUi = () => useContext(UiContext);

/** Opens or closes a section: `wasOpen` is what was shown (a section can open by itself), so a click always flips what you see. */
export function toggleSection(id, wasOpen) {
    panelStore.set(({ open, closed }) => {
        const nextOpen = new Set(open), nextClosed = new Set(closed);
        if (wasOpen) { nextOpen.delete(id); nextClosed.add(id); } else { nextOpen.add(id); nextClosed.delete(id); }
        return { open: nextOpen, closed: nextClosed };
    });
}

/** Opens a colour group's palette, or closes it when it is the one open. */
export const togglePalette = (key) => panelStore.set(({ palette }) => ({ palette: palette === key ? null : key }));
