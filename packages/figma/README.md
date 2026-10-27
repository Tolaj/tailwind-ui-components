# @windcraft/figma

The Figma → Windcraft converter, as a free Figma plugin. No AI: Figma's properties are mapped to Tailwind with fixed rules (reusing `@windcraft/core`), and anything the rules cannot place stays at its exact position. Only the spike below exists so far.

## The Auto Layout spike

One question: for a frame drawn **without** Auto Layout, does Figma's own `inferredAutoLayout` give us rows, columns, gaps and padding we can trust? If yes, the converter reads layout from Figma and our own layout rules are only a fallback. If no, we write those rules ourselves.

It reads only your selection, sends nothing anywhere (the manifest allows no network), and changes nothing in the file.

### Run it

1. Open **Figma desktop** and a file in **Design mode** (not Dev Mode).
2. Menu: **Plugins → Development → Import plugin from manifest…** and pick `packages/figma/spike/manifest.json`.
3. Select one or more frames, then **Plugins → Development → Windcraft Auto Layout spike**. Press **Run** after changing the selection.
4. The top line says what it found. **Copy report** and send me the text.

### Which files to try (the more different, the better)

| File | Why |
|---|---|
| A frame you draw by hand: a few boxes in a row and a column, **no** Auto Layout | The clean case: should match |
| A Community file, or a UI kit page, that was not built with Auto Layout | A real mess |
| One of your own real designs | What it will be used on |

### What the report means

| Field | Meaning |
|---|---|
| `nativeAutoLayout` | Containers already using Auto Layout (we read these exactly; nothing to infer) |
| `noAutoLayout` | Containers with 2+ children and no Auto Layout: what the spike is about |
| `inferredAvailable` | Of those, how many Figma gave an inferred layout for |
| `inferredNull`, `inferredMissing`, `inferredThrew` | Figma found no layout, the property is not on the node, or reading it failed (with the reason in `samples`) |
| `inferredMatchesReality` / `inferredOffReality` | Laying the children out the inferred way (gap, padding, alignment, within 1 px) does / does not put them where they really are; `offReasons` says why |
| `samples` | The first few containers with the inferred layout in full |

## Layout of this package

| Path | What |
|---|---|
| `spike/` | The spike plugin: `manifest.json`, `code.js` (one plain file: a plugin cannot import), `ui.html` |
| `test/spike.test.js` | The spike's analysis tested on made-up Figma nodes |
