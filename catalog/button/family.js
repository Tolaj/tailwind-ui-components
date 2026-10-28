// Catalog family: Button. One template; the styles are the things a person picks, the axes (size, state, icon) are generated from it.
// Plain Tailwind on the theme's tokens (brand-*, gray-*, rounded-md), with dark: styles, focus-visible rings, a disabled look and,
// for the icon-only and loading forms, the ARIA they need. `render()` with no state is the code to copy; a forced state (hover,
// focus, active) is only for showing that state in the catalog.
export const slug = "button";
export const name = "Button";
export const description = "An action. Six styles, five sizes, with an icon on either side or alone, and every state.";
export const tags = ["button", "action", "cta", "form"];

export const styles = [
    { slug: "primary", name: "Primary", description: "The one main action on a screen." },
    { slug: "secondary", name: "Secondary", description: "A quieter action next to the primary." },
    { slug: "outline", name: "Outline", description: "A bordered action that stays out of the way." },
    { slug: "ghost", name: "Ghost", description: "A text-only action for toolbars and tables." },
    { slug: "destructive", name: "Destructive", description: "Deletes or discards something. Confirm first." },
    { slug: "link", name: "Link", description: "An action that reads as text." },
];
export const axes = {
    size: ["xs", "sm", "md", "lg", "xl"],
    state: ["default", "hover", "focus", "active", "disabled", "loading"],
    icon: ["none", "left", "right", "only"],
};

// colour classes per style: the resting look, then what hover and active change (light, then dark)
const COLOR = {
    primary: { base: "bg-brand-600 text-white", hover: "bg-brand-700", active: "bg-brand-800", ring: "focus-visible:ring-brand-600" },
    secondary: { base: "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100", hover: "bg-gray-200", active: "bg-gray-300", dHover: "bg-gray-700", dActive: "bg-gray-600", ring: "focus-visible:ring-gray-400" },
    outline: { base: "border border-gray-300 bg-transparent text-gray-900 dark:border-gray-700 dark:text-gray-100", hover: "bg-gray-50", active: "bg-gray-100", dHover: "bg-gray-800", dActive: "bg-gray-700", ring: "focus-visible:ring-gray-400" },
    ghost: { base: "bg-transparent text-gray-700 dark:text-gray-200", hover: "bg-gray-100", active: "bg-gray-200", dHover: "bg-gray-800", dActive: "bg-gray-700", ring: "focus-visible:ring-gray-400" },
    destructive: { base: "bg-red-600 text-white", hover: "bg-red-700", active: "bg-red-800", ring: "focus-visible:ring-red-600" },
    link: { base: "bg-transparent text-brand-600 dark:text-brand-400", hover: "underline", active: "text-brand-800", ring: "focus-visible:ring-brand-600" },
};
const SIZE = {
    xs: { h: "h-7", w: "w-7", px: "px-2.5", text: "text-xs", icon: "size-3.5" },
    sm: { h: "h-8", w: "w-8", px: "px-3", text: "text-sm", icon: "size-4" },
    md: { h: "h-10", w: "w-10", px: "px-4", text: "text-sm", icon: "size-4" },
    lg: { h: "h-11", w: "w-11", px: "px-5", text: "text-base", icon: "size-5" },
    xl: { h: "h-12", w: "w-12", px: "px-6", text: "text-base", icon: "size-5" },
};
const BASE = "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50";

const PLUS = (cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const SPIN = (cls) => `<svg class="${cls} animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.55"/></svg>`;
const words = (s) => (s || "").split(/\s+/).filter(Boolean);
const prefix = (s, p) => words(s).map((c) => `${p}${c}`).join(" ");

/** One button as HTML. A state other than "default" shows that state (hover, focus, active) as it looks, for the catalog's matrix. */
export function render({ style = "primary", size = "md", state = "default", icon = "none", label = "Button" } = {}) {
    const c = COLOR[style], z = SIZE[size];
    if (!c || !z) throw new Error(`Unknown button style or size: ${style} ${size}`);
    const dHover = c.dHover || "", dActive = c.dActive || "";
    const isLink = style === "link";
    const colour = [c.base];
    if (state === "hover") colour.push(c.hover, prefix(dHover, "dark:"));
    else if (state === "active") colour.push(c.active, prefix(dActive, "dark:"));
    else colour.push(prefix(c.hover, "hover:"), prefix(dHover, "dark:hover:"), prefix(c.active, "active:"), prefix(dActive, "dark:active:"));
    const focus = state === "focus" ? `ring-2 ring-offset-2 ${c.ring.replace("focus-visible:", "")}` : c.ring;
    const only = icon === "only";
    const size_ = isLink ? `${z.text}` : only ? `${z.h} ${z.w} ${z.text}` : `${z.h} ${z.px} ${z.text}`;
    const cls = [BASE, size_, colour.filter(Boolean).join(" "), focus, isLink ? "underline-offset-4" : ""].filter(Boolean).join(" ");
    const loading = state === "loading", disabled = state === "disabled" || loading;
    const glyph = (cls_) => (loading ? SPIN(cls_) : PLUS(cls_));
    const inner = only ? glyph(z.icon) : [icon === "left" || loading ? glyph(z.icon) : "", label, icon === "right" && !loading ? glyph(z.icon) : ""].filter(Boolean).join("");
    const attrs = ['type="button"', `class="${cls}"`, disabled ? "disabled" : "", loading ? 'aria-busy="true"' : "", only ? `aria-label="${label}"` : ""].filter(Boolean).join(" ");
    return `<button ${attrs}>${inner}</button>`;
}

/** Things made of buttons that belong to the family. */
export const compositions = [
    {
        slug: "group", name: "Button group", description: "Related actions joined into one control.",
        html: `<div class="inline-flex rounded-md shadow-sm" role="group" aria-label="View">
  <button type="button" class="inline-flex h-10 items-center rounded-l-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">Day</button>
  <button type="button" class="-ml-px inline-flex h-10 items-center border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">Week</button>
  <button type="button" class="-ml-px inline-flex h-10 items-center rounded-r-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">Month</button>
</div>`,
    },
];
