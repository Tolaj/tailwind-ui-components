# @windcraft/figma

The Figma → Windcraft converter, as a free Figma plugin. **No AI**: Figma's properties are mapped to Tailwind with fixed rules, using Windcraft's own class tables (`@windcraft/core`), so the result opens in the editor with every class a property the panel understands. Everything runs inside Figma on your computer: the plugin has no network access.

## What it converts

| Figma | Becomes |
|---|---|
| Auto Layout frame | `flex flex-row/col`, `gap`, padding, `justify-*`, `items-*`, wrap, fill / hug / fixed sizes (`flex-1`, `self-stretch`, `w-[...]`) |
| Frame or group without Auto Layout | `relative` box with each child at its exact place (`absolute left-* top-*`): looks right now; smarter layout comes later |
| Fills, strokes, corner radius, opacity | `bg-[#hex]` (or a gradient), `border`, `rounded-*`, `opacity-*` |
| Shadows and blurs | `shadow-[...]`, `blur-[...]`, `backdrop-blur-[...]` |
| Text | `<p>` with size, weight, family, colour, line height, letter spacing, alignment, case, decoration; runs with different styles become `<span>`s |
| Vectors | inline SVG (exported by Figma) |
| A shape filled with a picture | an `<img>`; a frame with a picture behind its children gets it as a background (`bg-cover bg-center`). Pictures are redrawn at the size they are shown, as WebP, by the plugin window, so a photo is tens of KB, not megabytes. They are inlined in the HTML (Windcraft saves up to 1 MB per design; the plugin warns when a page is over) |
| Fonts | `font-['Name',sans-serif]` with a generic fallback, and one Google Fonts link per family. A font that is not on Google Fonts (a paid or custom font) falls back to the generic family until you load it yourself |
| Rotation | `rotate-[Ndeg]` about the centre, the box kept in place |

Not carried over yet (the plugin lists these as warnings): masks, angular and diamond gradients, flips, blend modes, centred strokes (drawn inside), vertical text alignment, constraints (right/bottom anchoring).

## Build and run the plugin

```bash
npm run build -w @windcraft/figma
```

Then in **Figma desktop**: open a file, **Plugins → Development → Import plugin from manifest…**, pick `packages/figma/dist/manifest.json`. Select frames, run **Windcraft**, and **Copy HTML** (or Download). Paste it into Windcraft (Add component, or a design's code panel).

## Layout of this package

| Path | What |
|---|---|
| `src/convert.js` | `convertDesign(snapshot)`: the whole conversion, pure functions (also `paint.js`, `text.js`, `color.js`, `classes.js`) |
| `plugin/` | The plugin: `snapshot.js` reads Figma nodes into plain JSON (the only code that touches Figma's API), `code.js`, `ui.html`, `manifest.json` |
| `build.mjs` | Bundles the plugin into `dist/` (a Figma plugin is a single file) |
| `spike/` | The earlier Auto Layout test plugin (see below) |
| `test/` | Converter tests on made-up Figma nodes; a test that builds the plugin and runs it against a pretend Figma |

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
