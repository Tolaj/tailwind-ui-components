import zlib from "zlib";
import FigmaSource from "../models/figmaSource.model.js";
import FigmaDraftSource from "../models/figmaDraftSource.model.js";
import FigmaDraft from "../models/figmaDraft.model.js";
import Component from "../models/component.model.js";
import { importDesign } from "./import.service.js";
import { withFonts } from "./fonts.service.js";
import { convertDesign, CONVERTER_VERSION } from "../../packages/figma/src/convert.js";
import { DEFAULT_RULES } from "../../packages/figma/src/rules.js";

/** What is kept for a page, and whether the converter has moved on since, or null when nothing is kept. */
export async function figmaSourceInfo(componentId) {
    const s = await FigmaSource.findOne({ component: componentId }).select("converter rulesVersion").lean();
    if (!s) return null;
    return { converter: s.converter, rulesVersion: s.rulesVersion, latest: CONVERTER_VERSION, outdated: s.converter !== CONVERTER_VERSION || s.rulesVersion !== DEFAULT_RULES.version };
}

/**
 * A design opened with Edit was a draft; saving it in the editor made it a page. The Figma data kept for the draft moves to the page,
 * so the page gets "Update from Figma" like one saved from the plugin. Resolves to the page's Figma info, or null (nothing was kept).
 */
export async function adoptDraftSource(userId, draftId, componentId) {
    if (!/^[a-f0-9]{24}$/i.test(String(draftId || ""))) return null;
    // the page opens on the board at the width the frame has in Figma (a page with no saved width is drawn 1280 wide, and a wider design is cut off)
    const draft = await FigmaDraft.findOne({ _id: draftId, userId }).select("width").lean();
    if (draft && Number.isFinite(draft.width)) await Component.updateOne({ _id: componentId, createdBy: userId }, { frameW: Math.round(draft.width) });
    const kept = await FigmaDraftSource.findOneAndDelete({ draft: draftId, userId });
    if (!kept) return null;
    await FigmaSource.findOneAndUpdate({ component: componentId }, { userId, converter: kept.converter, rulesVersion: kept.rulesVersion, width: kept.width, height: kept.height, snapshotGz: kept.snapshotGz }, { upsert: true });
    return figmaSourceInfo(componentId);
}

/**
 * Converts the Figma data kept for a page again with the converter and rules this server has, and saves the result as the page's next
 * version (the code it replaces stays in its version history). Edits made in Windcraft after the first save are not carried over.
 */
export async function updateFromFigma(userId, componentId, base) {
    const page = await Component.findOne({ _id: componentId, createdBy: userId }).select("title project").lean();
    if (!page) throw Object.assign(new Error("That page is not in your library."), { status: 404 });
    const source = await FigmaSource.findOne({ component: componentId, userId });
    if (!source) throw Object.assign(new Error("No Figma data is kept for this page."), { status: 404 });
    const snapshot = JSON.parse(zlib.gunzipSync(source.snapshotGz).toString("utf8"));
    const result = convertDesign(snapshot, { title: page.title, rules: DEFAULT_RULES });
    const html = await withFonts(result.html, base);
    const saved = await importDesign(userId, {
        title: page.title, html, id: String(componentId), force: true, split: false, summarize: false, project: page.project || null,
        frameW: snapshot.width, note: `Updated from the kept Figma data (converter ${result.converter})`,
    });
    source.converter = result.converter; source.rulesVersion = result.rulesVersion;
    await source.save();
    return { changed: Boolean(saved.page.updated), version: saved.page.version, converter: result.converter, rulesVersion: result.rulesVersion, warnings: result.warnings };
}
