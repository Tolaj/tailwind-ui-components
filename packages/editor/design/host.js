// @ts-check
// Everything the editor needs from the app around it: saving, projects, board positions, the AI and the page address.
// The editor only calls `host`; the page that mounts it fills it in with setHost() before loading editor.js (the app's own
// version is app-host.js). An editor used elsewhere supplies its own.
/**
 * @typedef {object} Host
 * @property {(fields: object) => Promise<any>} createComponent    saves a new design (a design opened from a Figma draft sends `draftId`, and the answer may carry `figmaSource`); resolves to the saved record ({ _id, version, ... }), rejects with the reason
 * @property {(id: string, fields: object) => Promise<any>} updateComponent   changes a saved design (a new version when its code changes)
 * @property {(name: string) => Promise<{ id: string, name: string }>} createProject   a project is the canvas that designs share
 * @property {(projectId: string, positions: object[]) => Promise<void>} saveLayout   where each design sits on the project's canvas
 * @property {(projectId: string, positions: object[]) => void} saveLayoutOnExit   the same, while the page is closing
 * @property {(body: object, onText?: (text: string) => void) => Promise<string>} generate   the AI drafts a page; resolves to its HTML
 * @property {(id: string | null) => void} showDesign   the address now shows this saved design (null: an unsaved one)
 * @property {(projectId: string) => string} [projectUrl]   where a project's own page is (the project name links there); omit for none
 * @property {(id: string) => void} openDesign   go to this design (loads the page again)
 * @property {(id: string) => Promise<{ changed?: boolean }>} [updateFromFigma]   converts a design again from the Figma data kept with it (a new version when the code changed); omit for no such button
 */
export const host = /** @type {Host} */ ({});
/** @param {Host} h */
export const setHost = (h) => { Object.assign(host, h); };
