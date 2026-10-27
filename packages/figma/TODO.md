# Figma converter: principles and to-do

## Principles (what every change must keep)

- The output is **editable code**: HTML with Tailwind classes that Windcraft's Properties panel understands. A layer is never replaced by a picture because it is hard to copy (only layers that are pictures in the design, and vectors as inline SVG).
- **No LLM, no paid service.** An LLM is too heavy, costly and slow for this. The conversion runs on the user's computer.
- **Small, fast models are allowed** (for example a decision-tree guess of what a layer is), when they: run inside the plugin with no network, are tiny (kilobytes, no runtime to download), are free to use (open data and licence), give the same answer every time, and only choose between code the converter already writes. They are never loaded from downloaded pickle files: those can run code on load. We train our own and ship them as plain JSON or JS.
- **Nothing leaves the computer** unless the user chooses (save, edit, or ticks "share this design").
- Where code cannot match Figma exactly, we write the closest code and say so in the notes, rather than hide the difference.

## To do (not now)

| Item | Why it waits |
| --- | --- |
| Round-trip practice set: read real web pages' layout in Chrome as layer data, convert it back, compare with the screenshot | A free, unlimited test set with the answers attached; also the training data for small models below |
| Recolourable icons: single-colour inline icons use `currentColor`, the colour a text-colour class | Next up: small, and makes icons editable from the Properties panel |
| Small model: what HTML element a layer is (button, nav, heading, input...), trained on the round-trip set, shipped as JSON | Needs the round-trip set first |
| Font substitutes chosen by real width and shape (open font data) instead of a hand-written table | Better text wrapping when the real font is missing |
| Offline tuning of thresholds (row detection, spacing) on the practice set, shipped as fixed numbers | Needs the practice set |


| Item | Why it waits |
| --- | --- |
| Self-check in the plugin (render the page, compare with Figma's picture, show a match score) | Needs Tailwind bundled into the plugin, since the plugin may only reach Windcraft's domain |
| Fixed and sticky layers (`scrollBehavior`) | `position: fixed` behaves badly inside Windcraft's board previews |
| Image crop (`imageTransform`) and image filters | Needs testing against real Figma files to get the maths right |
| Lists (ordered and unordered) | Needs real examples to get indentation right |
| Responsive output: pin-to-edge rules, finding rows, columns and grids across a whole page | Large and risky: do after the exact-size output is solid |
| Figma variables and styles as Tailwind theme values | Needs a design-system story in Windcraft first |
| Components and variants as Windcraft components, hover and state styles | Same |
| Prototype interactions (hover, click, links between pages) | After components and variants |
| Diamond gradients, gradient strokes, inner shadows on text | CSS has no equal |
| A corpus of 50+ varied frames and a score baseline | Needs frames: debug download and `bench/score.mjs` are ready |
| Safari and Firefox checks (masks, shadows) | After the corpus exists |
| Right-to-left and vertical text, OpenType features | Rare so far |

| Use `meta` on the server: design tokens from variables and styles; components and variants as Windcraft components; hover and state styles from prototype reactions; responsive rules from constraints and layout grids | The data now arrives with every save: each is a server change, no plugin release |
| Capture Figma's own CSS per layer (`getCSSAsync`) as a cross-check | Slow for thousands of layers: needs a depth or size limit |
| Tests that run the upload and update routes against a real database | The routes were written and checked by reading and by the pure parts; an end-to-end test needs a test database |

## Done from earlier lists

Masks, blend modes, centred and outside strokes, angular gradients, vertical text alignment, cut-off lines, links, mirrored layers, min and max sizes, text shadows, underline details, paragraph spacing and indent, real tags and alt text, 5 MB designs, frames up to 12000 layers, the server converts from the sent Figma data, and a design opened with Edit keeps its Figma data when it is first saved in the editor.
