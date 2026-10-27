# @windcraft/figma

The Figma → Windcraft converter, as a free Figma plugin. **No LLM** (too heavy, costly and slow): Figma's properties are mapped to Tailwind with fixed rules, using Windcraft's own class tables (`@windcraft/core`), so the result opens in the editor with every class a property the panel understands. Everything runs inside Figma on your computer: the plugin has no network access.

## What it converts

| Figma | Becomes |
|---|---|
| Auto Layout frame | `flex flex-row/col`, `gap`, padding, `justify-*`, `items-*`, wrap, fill / hug / fixed sizes (`flex-1`, `self-stretch`, `w-[...]`) |
| Frame or group without Auto Layout | `relative` box with each child at its exact place (`absolute left-* top-*`): looks right now; smarter layout comes later |
| Fills, strokes, corner radius, opacity | `bg-[#hex]` (or a gradient), `border`, `rounded-*`, `opacity-*` |
| Shadows and blurs | `shadow-[...]`, `blur-[...]`, `backdrop-blur-[...]` |
| Text | `<p>` with size, weight, family, colour, line height, letter spacing, alignment, case, decoration; runs with different styles become `<span>`s |
| Vectors | inline SVG (exported by Figma) |
| A shape filled with a picture | an `<img>`; a frame with a picture behind its children gets it as a background (`bg-cover bg-center`). Pictures are redrawn at the size they are shown, as WebP, by the plugin window, so a photo is tens of KB, not megabytes. They are inlined in the HTML (Windcraft saves up to 5 MB per design; the plugin warns when a page is over) |
| Fonts | `font-['Name',sans-serif]` with a generic fallback, and one Google Fonts link per family. A font that is not on Google Fonts (a paid or custom font) falls back to the generic family until you load it yourself |
| Rotation | `rotate-[Ndeg]` about the centre, the box kept in place |

Also carried over: masks (the layers after a mask are shown through its shape; not inside Auto Layout frames), blend modes (a layer's own, and between a shape's fills), angular gradients (conic), outside and centred strokes (rings, joined with the shadows into one `box-shadow`), text vertical alignment in a fixed box, text cut with "…" (`line-clamp`), text links (`<a>`), and layers wholly outside a clipping frame are left out. A design may be up to 5 MB (it is sent gzipped).

Real HTML, not only `<div>`s: layers named like a button, link, nav bar, header or footer become `<button>`, `<a>`, `<nav>`, `<header>`, `<footer>` (the last three only when they span half the page); the biggest sizes of real words are `<h1>` to `<h3>`; a picture's `alt` is its layer name unless that says nothing ("Rectangle 12"). Also: mirrored layers, min and max sizes, text shadows that follow the letters, underline style, thickness, offset and colour, first-line indent and space between paragraphs.

Not carried over yet (the plugin lists these as warnings, and `TODO.md` has the plan): diamond gradients (the first colour is used), gradient strokes, constraints (right/bottom anchoring), lists, image crop and filters, fixed and sticky layers.

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

## Making the converter better (no LLM, no cost)

| Step | How |
| --- | --- |
| Collect frames | Build the plugin with `npm run build:dev -w @windcraft/figma`, convert a frame, press **Download debug data**: you get `<name>.snapshot.json` (the layer data, with pictures) and `<name>.reference.png` (Figma's own 1x picture). Put pairs in one folder. |
| Score them | `node packages/figma/bench/score.mjs <folder>`: converts each frame with the current rules, renders it in headless Chrome and prints a table (score, worst horizontal band, size, notes), lowest first. |
| Protect against regressions | `node packages/figma/bench/score.mjs <folder> --baseline <folder>/baseline.json --update` once; before each plugin release run it without `--update`: a frame that dropped by more than 0.5 fails the run. |
| Samples from users | In the save panel a user may tick "Also share this design with Windcraft" (unticked by default; layer names and text can be replaced with dummy text), or press **Report a problem**. They arrive in the `ConversionSample` collection; `node scripts/export-samples.mjs <dir>` writes them as files. A sample has no pictures, so scoring one needs a reference picture. |

Sharing is always the user's choice, and the plugin's publish text must say what is sent.

## Windcraft makes the code from the Figma data

When a frame is saved, the plugin (unless the user unticks "Send the Figma layer data too") uploads the layer data (with pictures, gzipped) in pieces of up to 3 MB (`POST /api/figma/upload/chunk`), then calls `POST /api/figma/convert-save`: **the server converts it with its own converter and rules**, saves the page, and keeps the data next to the page. A host may refuse a bigger request, and its servers share no memory between requests, so the pieces wait in the database (an hour at most). If the data cannot be sent, the plugin saves its own conversion instead (`/send`) and says so. **Edit** works the same way (`/draft`): the server converts for the editor and keeps the data with the draft for a day; when the draft is first saved as a page in the editor, the data moves to the page (the editor sends the draft's id with the save), so that page gets **Update from Figma** too.

Why: the plugin's code changes only with a Figma-reviewed release, the server's changes with a deploy. The plugin's job is to collect everything Figma knows; the server's job is to make the best code from it. Besides what the converter uses, every layer carries `meta`: constraints, scroll behaviour, layout grids, prototype reactions, the names of its styles, the variables its properties follow (with their values), and for an instance its component, set and variant. The plugin's own converter ignores `meta`, except that an instance's component name helps decide it is a button, link, nav...

The data is private to the page's owner, one per page (saving again replaces it), deleted with the page, and **not** used to improve the converter: only a design the user chose to share is (and `meta` is removed when the text is replaced with dummy text).

In the editor, a page with Figma data shows **Update from Figma** (marked "new" when the converter or rules have moved on): it converts the kept data again and saves the result as the page's next version, so the old code stays in the version history. Edits made in Windcraft since the first save are not carried over; the button asks first.
