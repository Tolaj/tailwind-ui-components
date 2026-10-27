# Figma converter: principles and to-do

## Principles (what every change must keep)

- The output is **editable code**: HTML with Tailwind classes that Windcraft's Properties panel understands. A layer is never replaced by a picture because it is hard to copy (only layers that are pictures in the design, and vectors as inline SVG).
- **No AI, no paid service.** The conversion runs on the user's computer, with fixed rules.
- **Nothing leaves the computer** unless the user chooses (save, edit, or ticks "share this design").
- Where code cannot match Figma exactly, we write the closest code and say so in the notes, rather than hide the difference.

## To do (not now)

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

## Done from earlier lists

Masks, blend modes, centred and outside strokes, angular gradients, vertical text alignment, cut-off lines, links, mirrored layers, min and max sizes, text shadows, underline details, paragraph spacing and indent, real tags and alt text, 5 MB designs, frames up to 12000 layers.
