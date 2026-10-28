// Catalog family: Input. A single-line field in four types; sizes and states are generated. A bare input needs a name for assistive
// technology, so every one carries aria-label; put it in a Form field (label, hint, error) for the visible label.
export const slug = "input";
export const name = "Input";
export const description = "A single-line field. Text, password with show and hide, search, and a field with a prefix and suffix.";
export const tags = ["input", "text field", "form", "search", "password"];
export const styleLabel = "Type";
export const previewClass = "w-64";

export const styles = [
    { slug: "text", name: "Text", description: "Names, emails, anything short." },
    { slug: "password", name: "Password", description: "With a button to show or hide what is typed." },
    { slug: "search", name: "Search", description: "With a search icon; type=search gives a clear button in some browsers." },
    { slug: "affix", name: "Prefix and suffix", description: "A unit or a fixed part (a currency, a domain) kept next to the value." },
];
export const axes = {
    size: ["sm", "md", "lg"],
    state: ["default", "hover", "focus", "error", "success", "disabled"],
};

const SIZE = {
    sm: { h: "h-8", px: "px-2.5", text: "text-sm", icon: "size-4", padL: "pl-8", padR: "pr-8", iconPos: "left-2.5" },
    md: { h: "h-10", px: "px-3", text: "text-sm", icon: "size-4", padL: "pl-9", padR: "pr-10", iconPos: "left-3" },
    lg: { h: "h-11", px: "px-4", text: "text-base", icon: "size-5", padL: "pl-11", padR: "pr-11", iconPos: "left-3.5" },
};
const BASE = "block w-full rounded-md border bg-white text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";
const TONE = {
    default: "border-gray-300 hover:border-gray-400 focus:border-brand-600 focus:ring-brand-600 dark:border-gray-700 dark:hover:border-gray-600",
    hover: "border-gray-400 focus:border-brand-600 focus:ring-brand-600 dark:border-gray-600",
    focus: "border-brand-600 ring-2 ring-brand-600 dark:border-brand-500",
    error: "border-red-500 focus:border-red-500 focus:ring-red-500",
    success: "border-green-600 focus:border-green-600 focus:ring-green-600",
    disabled: "border-gray-300 dark:border-gray-700",
};
const ICON = (cls, path) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const SEARCH = '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>';
const EYE = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
const TOGGLE = "var i=this.previousElementSibling,s=i.type==='password';i.type=s?'text':'password';this.setAttribute('aria-pressed',s);this.setAttribute('aria-label',s?'Hide password':'Show password')";

/** One input as HTML. A state other than "default" shows that state (hover, focus, error, success, disabled) as it looks. */
export function render({ style = "text", size = "md", state = "default", label } = {}) {
    const z = SIZE[size];
    if (!z || !styles.some((s) => s.slug === style)) throw new Error(`Unknown input type or size: ${style} ${size}`);
    const tone = TONE[state] || TONE.default;
    const attrs = (extra) => [extra, state === "disabled" ? "disabled" : "", state === "error" ? 'aria-invalid="true"' : ""].filter(Boolean).join(" ");
    const field = (type, aria, placeholder, pad) => `<input type="${type}" aria-label="${label || aria}" placeholder="${placeholder}" ${attrs("")} class="${BASE} ${z.h} ${z.text} ${pad} ${tone}">`.replace(/ +>/, ">").replace(/ {2,}/g, " ");
    if (style === "text") return field("text", "Name", "Your name", z.px);
    if (style === "search") {
        return `<div class="relative">${ICON(`pointer-events-none absolute inset-y-0 ${z.iconPos} my-auto ${z.icon} text-gray-400`, SEARCH)}${field("search", "Search", "Search", `${z.padL} pr-3`)}</div>`;
    }
    if (style === "password") {
        return `<div class="relative">${field("password", "Password", "Password", `pl-3 ${z.padR}`)}<button type="button" aria-label="Show password" aria-pressed="false" ${state === "disabled" ? "disabled" : ""} onclick="${TOGGLE}" class="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200">${ICON(z.icon, EYE)}</button></div>`;
    }
    const part = "flex items-center bg-gray-50 px-3 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    const edge = state === "error" ? "border-red-500" : state === "success" ? "border-green-600" : "border-gray-300 dark:border-gray-700";
    return `<div class="flex rounded-md ${z.text}"><span class="${part} rounded-l-md border border-r-0 ${edge}">$</span><input type="text" inputmode="decimal" aria-label="${label || "Amount"}" placeholder="0.00" ${attrs("")} class="${BASE.replace("rounded-md ", "")} ${z.h} ${z.text} ${z.px} rounded-none ${tone}"><span class="${part} rounded-r-md border border-l-0 ${edge}">USD</span></div>`.replace(/ +>/g, ">").replace(/ {2,}/g, " ");
}
