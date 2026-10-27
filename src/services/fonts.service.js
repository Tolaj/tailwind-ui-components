import Font from "../models/font.model.js";

export const MAX_FONT_BYTES = 1024 * 1024;
const MAX_FONTS_PER_USER = 60;
const MIME = { woff2: "font/woff2", woff: "font/woff", truetype: "font/ttf", opentype: "font/otf" };
export const mimeOf = (format) => MIME[format];

/** The font format from the file's first bytes (not its name), or null when it is not a font. */
export function formatOf(buf) {
    if (buf.length < 12) return null;
    const tag = buf.toString("latin1", 0, 4);
    if (tag === "wOF2") return "woff2";
    if (tag === "wOFF") return "woff";
    if (tag === "OTTO") return "opentype";
    if (tag === "\u0000\u0001\u0000\u0000" || tag === "true") return "truetype";
    return null;
}

/** Adds a font to the shared library. A family, weight and style that is already there is kept as it is (the first upload stays), and says so. */
export async function saveFont(uploader, { family, weight = 400, style = "normal", base64, shareConfirmed }) {
    family = String(family || "").trim();
    if (!family || family.length > 80 || /[{};<>"'\\]/.test(family)) throw new Error("Give the font's family name, for example Gilroy");
    if (shareConfirmed !== true) throw new Error("Confirm that you have the right to share this font with other Windcraft users.");
    weight = Math.round(Number(weight)) || 400;
    style = style === "italic" ? "italic" : "normal";
    const there = await Font.findOne({ family, weight, style }).select("_id").lean();
    if (there) return { id: String(there._id), family, weight, style, existing: true };
    const data = Buffer.from(String(base64 || ""), "base64");
    if (data.length > MAX_FONT_BYTES) throw new Error(`That font file is ${Math.round(data.length / 1024)} KB; the limit is 1 MB. A .woff2 file is much smaller.`);
    const format = formatOf(data);
    if (!format) throw new Error("That is not a font file. Use .woff2, .woff, .ttf or .otf.");
    if ((await Font.countDocuments({ uploader })) >= MAX_FONTS_PER_USER) throw new Error(`You can add up to ${MAX_FONTS_PER_USER} font files.`);
    try {
        const doc = await Font.create({ uploader, family, weight, style, format, data, shareConfirmed: true });
        return { id: String(doc._id), family, weight, style, format, existing: false };
    } catch (e) {
        if (e.code === 11000) { const won = await Font.findOne({ family, weight, style }).select("_id").lean(); return { id: String(won._id), family, weight, style, existing: true }; } // two uploads at once: the first stays
        throw e;
    }
}

/** Removes a font the user added. */
export async function removeFont(uploader, id) {
    return (await Font.deleteOne({ _id: id, uploader })).deletedCount === 1;
}

/** A design's html with an @font-face for each library font it uses. A style added earlier is replaced, so it stays current. */
export async function withFonts(html, base) {
    html = html.replace(/<style id="windcraft-fonts">[\s\S]*?<\/style>\s*/, "");
    const names = [...new Set([...html.matchAll(/font-\[['"]([^'",\]]+)['"]/g)].map((m) => m[1].replace(/_/g, " ")))];
    if (!names.length) return html;
    const used = await Font.find({ family: { $in: names } }).select("family weight style format").lean();
    if (!used.length) return html;
    const css = used.map((f) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:${f.style};font-display:swap;src:url(${base}/fonts/${f._id}) format('${f.format}')}`).join("");
    const tag = `<style id="windcraft-fonts">${css}</style>\n`;
    return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${tag}</head>`) : tag + html;
}

/** Which of these families (with weight and style) the library already has, so nobody uploads what exists. */
export async function haveFamilies(families) {
    const rows = await Font.find({ family: { $in: families } }).select("family weight style").lean();
    return rows.map((r) => ({ family: r.family, weight: r.weight, style: r.style }));
}
