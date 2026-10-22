export const HUES = ["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
export const SHADES = [100, 300, 500, 700, 900];

const COLOR = `(?:(?:${HUES.join("|")})-\\d{2,3}|black|white|transparent|current)(?:\\/\\d+)?`;
const STEP = "\\d+(?:\\.5)?";

// Each group is a set of mutually exclusive Tailwind classes (without variants like md: or hover:).
export const GROUPS = {
    fontSize: /^text-(xs|sm|base|lg|xl|[2-9]xl)$/,
    fontWeight: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
    textAlign: /^text-(left|center|right|justify)$/,
    textColor: new RegExp(`^text-${COLOR}$`),
    bgColor: new RegExp(`^bg-${COLOR}$`),
    borderWidth: /^border(?:-[0248])?$/,
    borderColor: new RegExp(`^border-${COLOR}$`),
    radius: /^rounded(?:-(none|sm|md|lg|xl|2xl|3xl|full))?$/,
    shadow: /^shadow(?:-(sm|md|lg|xl|2xl|inner|none))?$/,
    p: new RegExp(`^p-${STEP}$`),
    px: new RegExp(`^px-${STEP}$`),
    py: new RegExp(`^py-${STEP}$`),
    mt: new RegExp(`^mt-${STEP}$`),
    mb: new RegExp(`^mb-${STEP}$`),
    gap: new RegExp(`^gap-${STEP}$`),
    display: /^(block|inline-block|inline|flex|inline-flex|grid|hidden)$/,
    flexDir: /^flex-(row|col|row-reverse|col-reverse)$/,
    justify: /^justify-(start|center|end|between|around|evenly)$/,
    items: /^items-(start|center|end|stretch|baseline)$/,
    width: /^w-(full|auto|screen|fit|\d+\/\d+)$/,
};

const split = (str) => String(str || "").split(/\s+/).filter(Boolean);

/** The current class from a group (ignores responsive/state variants). */
export function getGroup(classes, key) {
    return split(classes).find((t) => !t.includes(":") && GROUPS[key].test(t)) || "";
}

/** Replaces whatever the group had with `value` (empty value just clears the group). */
export function setGroup(classes, key, value) {
    const kept = split(classes).filter((t) => t.includes(":") || !GROUPS[key].test(t));
    if (value) kept.push(value);
    return kept.join(" ");
}
