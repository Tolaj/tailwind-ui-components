// The Tailwind class names the code editor offers while typing inside class="…": the utilities people use every day (spacing, sizing,
// layout, type, colour, borders, effects, motion) and the variants that go in front of them (hover:, md:, dark:…). Built once, on first use.
const SPACING = ["0", "px", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96"];
const FRACTIONS = ["1/2", "1/3", "2/3", "1/4", "2/4", "3/4", "1/5", "2/5", "3/5", "4/5", "1/6", "5/6", "1/12", "11/12"];
const SIZE_WORDS = ["auto", "full", "screen", "min", "max", "fit", "svw", "dvh", "lvh", "svh"];
const PALETTES = ["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const COLOR_WORDS = ["white", "black", "transparent", "current", "inherit"];
const SCALE = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];

const STATIC = `block inline-block inline flex inline-flex grid inline-grid contents hidden table flow-root
static fixed absolute relative sticky visible invisible collapse
flex-row flex-row-reverse flex-col flex-col-reverse flex-wrap flex-wrap-reverse flex-nowrap flex-1 flex-auto flex-initial flex-none grow grow-0 shrink shrink-0
justify-start justify-end justify-center justify-between justify-around justify-evenly justify-stretch
items-start items-end items-center items-baseline items-stretch content-start content-end content-center content-between content-around
self-auto self-start self-end self-center self-stretch place-content-center place-items-center
overflow-auto overflow-hidden overflow-clip overflow-visible overflow-scroll overflow-x-auto overflow-y-auto overflow-x-hidden overflow-y-hidden
truncate text-ellipsis text-clip whitespace-normal whitespace-nowrap whitespace-pre whitespace-pre-line whitespace-pre-wrap break-normal break-words break-all
text-left text-center text-right text-justify text-start text-end uppercase lowercase capitalize normal-case italic not-italic underline overline line-through no-underline
font-thin font-extralight font-light font-normal font-medium font-semibold font-bold font-extrabold font-black font-sans font-serif font-mono
leading-none leading-tight leading-snug leading-normal leading-relaxed leading-loose tracking-tighter tracking-tight tracking-normal tracking-wide tracking-wider tracking-widest
border border-0 border-2 border-4 border-8 border-t border-r border-b border-l border-x border-y border-solid border-dashed border-dotted border-double border-none border-collapse border-separate
rounded rounded-none rounded-sm rounded-md rounded-lg rounded-xl rounded-2xl rounded-3xl rounded-full rounded-t rounded-b rounded-l rounded-r rounded-t-lg rounded-b-lg rounded-l-lg rounded-r-lg
shadow shadow-sm shadow-md shadow-lg shadow-xl shadow-2xl shadow-inner shadow-none ring ring-0 ring-1 ring-2 ring-4 ring-8 ring-inset outline outline-none outline-dashed outline-2
blur blur-none blur-sm blur-md blur-lg blur-xl backdrop-blur backdrop-blur-sm backdrop-blur-md backdrop-blur-lg backdrop-blur-xl grayscale invert sepia
transition transition-all transition-colors transition-opacity transition-shadow transition-transform transition-none ease-linear ease-in ease-out ease-in-out
duration-75 duration-100 duration-150 duration-200 duration-300 duration-500 duration-700 duration-1000 delay-75 delay-100 delay-150 delay-200 delay-300 delay-500
transform scale-0 scale-50 scale-75 scale-90 scale-95 scale-100 scale-105 scale-110 scale-125 scale-150 rotate-0 rotate-1 rotate-2 rotate-3 rotate-6 rotate-12 rotate-45 rotate-90 rotate-180
-rotate-1 -rotate-2 -rotate-3 -rotate-6 -rotate-12 -rotate-45 -rotate-90 -rotate-180
animate-none animate-spin animate-ping animate-pulse animate-bounce
cursor-auto cursor-default cursor-pointer cursor-wait cursor-text cursor-move cursor-not-allowed cursor-grab cursor-grabbing select-none select-text select-all pointer-events-none pointer-events-auto resize resize-none resize-x resize-y
object-contain object-cover object-fill object-none object-scale-down object-center object-top object-bottom object-left object-right
aspect-auto aspect-square aspect-video list-none list-disc list-decimal list-inside list-outside
opacity-0 opacity-5 opacity-10 opacity-20 opacity-25 opacity-30 opacity-40 opacity-50 opacity-60 opacity-70 opacity-75 opacity-80 opacity-90 opacity-95 opacity-100
z-0 z-10 z-20 z-30 z-40 z-50 z-auto sr-only not-sr-only container mx-auto my-auto
bg-fixed bg-local bg-scroll bg-cover bg-contain bg-center bg-top bg-bottom bg-left bg-right bg-no-repeat bg-repeat bg-clip-text bg-none
bg-gradient-to-t bg-gradient-to-tr bg-gradient-to-r bg-gradient-to-br bg-gradient-to-b bg-gradient-to-bl bg-gradient-to-l bg-gradient-to-tl
grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5 grid-cols-6 grid-cols-12 grid-rows-1 grid-rows-2 grid-rows-3 grid-rows-4 col-span-1 col-span-2 col-span-3 col-span-4 col-span-6 col-span-full row-span-1 row-span-2 row-span-3
isolate mix-blend-multiply mix-blend-screen mix-blend-overlay`.split(/\s+/);

const VARIANTS = ["hover", "focus", "focus-visible", "focus-within", "active", "visited", "disabled", "checked", "required", "invalid", "placeholder-shown", "read-only", "first", "last", "odd", "even", "only", "empty", "group-hover", "group-focus", "peer-hover", "peer-focus", "peer-checked", "placeholder", "before", "after", "selection", "marker", "file", "dark", "print", "motion-reduce", "sm", "md", "lg", "xl", "2xl", "max-sm", "max-md", "max-lg", "max-xl"];

let all = null;
/** Every class name offered, with the variants as `hover:` entries on their own. */
export function tailwindClasses() {
    if (all) return all;
    const out = new Set(STATIC);
    const sizes = [...SPACING, ...FRACTIONS, ...SIZE_WORDS];
    for (const p of ["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"]) SPACING.forEach((v) => out.add(`${p}-${v}`));
    for (const p of ["m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me"]) { SPACING.forEach((v) => { out.add(`${p}-${v}`); if (v !== "0") out.add(`-${p}-${v}`); }); out.add(`${p}-auto`); }
    for (const p of ["gap", "gap-x", "gap-y", "space-x", "space-y"]) SPACING.forEach((v) => out.add(`${p}-${v}`));
    for (const p of ["w", "h", "size", "min-w", "min-h"]) sizes.forEach((v) => out.add(`${p}-${v}`));
    for (const p of ["inset", "inset-x", "inset-y", "top", "right", "bottom", "left"]) [...SPACING, ...FRACTIONS, "auto", "full"].forEach((v) => { out.add(`${p}-${v}`); if (v !== "0" && v !== "auto") out.add(`-${p}-${v}`); });
    ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "full", "screen", "prose", "min", "max", "fit"].forEach((v) => { out.add(`max-w-${v}`); out.add(`max-h-${v}`); });
    SCALE.forEach((v) => out.add(`text-${v}`));
    ["text", "bg", "border", "ring", "from", "via", "to", "fill", "stroke", "divide", "outline", "decoration", "accent", "caret", "shadow", "placeholder"].forEach((p) => {
        COLOR_WORDS.forEach((c) => out.add(`${p}-${c}`));
        PALETTES.forEach((c) => SHADES.forEach((s) => out.add(`${p}-${c}-${s}`)));
    });
    for (const side of ["t", "r", "b", "l", "x", "y"]) PALETTES.forEach((c) => SHADES.forEach((s) => out.add(`border-${side}-${c}-${s}`)));
    VARIANTS.forEach((v) => out.add(`${v}:`));
    all = [...out];
    return all;
}
export const TAILWIND_VARIANTS = VARIANTS;
