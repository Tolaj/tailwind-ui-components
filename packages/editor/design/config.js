// What mountEditor() hands the editor before its code loads: the design and what surrounds it (see index.js).
//   data   the design to open
//   ui     what of the editor is shown (see index.js): { panels, nav, tools }
//   hooks  what the editor tells the app around it: { chrome() after every change, details(fields) when a first save needs a name }
export const config = /** @type {{ data: any, ui: { panels?: boolean, nav?: boolean, tools?: string[] | null }, hooks: { chrome?: () => void, details?: (fields: object) => void }, leaving?: boolean }} */ ({ ui: {}, hooks: {} });
