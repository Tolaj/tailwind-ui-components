<p align="center">
  <a href="https://github.com/Tolaj/windcraft"><img src="https://raw.githubusercontent.com/Tolaj/windcraft/main/docs/media/logo-card.png" alt="Windcraft" width="320"></a>
</p>

# windcraft-editor

A visual editor for **HTML + Tailwind** that you can put in any web page. Select, drag and style like Figma, and every change is real Tailwind code. No backend, no build step.

## Try it in one file

Save this as `index.html`, run `npx serve` next to it, and open the address it prints:

```html
<div id="root"></div>
<script type="module">
  import { startEditor } from "https://unpkg.com/windcraft-editor/editor/index.js";
  startEditor(document.getElementById("root"), {
    html: '<h1 class="p-10 text-4xl font-bold">Hello</h1>',
  });
</script>
```

That is all. Designs are saved in the browser (localStorage).

## Use it from npm

```bash
npm install windcraft-editor
```

Serve the `node_modules/windcraft-editor` folder as static files (for example `app.use("/windcraft", express.static("node_modules/windcraft-editor"))`) and import from it:

```js
import { startEditor } from "/windcraft/editor/index.js";
startEditor(document.getElementById("root"), { html: "<h1>Hello</h1>" });
```

### `startEditor(root, options)`

| Option | What it does |
|---|---|
| `html` | The HTML a new design starts with |
| `title` | The design's name (default `My design`) |
| `key` | The localStorage key, so two editors on one site do not share designs |
| `theme` | `{ brand: "#e11d48", gray: "stone", font: "Poppins", radius: "xl" }` |

## Save to your own server

`startEditor` keeps designs in the browser. To load and save somewhere else, use `mountEditor` and give it a **host**: a few functions (`createComponent`, `updateComponent`, ...) that talk to your backend. The list is in [`editor/design/host.js`](design/host.js), and [`local-host.js`](local-host.js) is a complete one to copy.

```js
import { mountEditor } from "/windcraft/editor/index.js";

await mountEditor(document.getElementById("root"), {
    host,                              // your load and save functions
    data: { id, title, htmlCode },     // the design to open
});
```

## Put it inside a part of a page

`startEditor` and `mountEditor` take over the whole page. To place the editor in one box, use `embedEditor`. It runs in an iframe, so several can share a page.

```js
import { embedEditor } from "/windcraft/editor/index.js";

const ed = embedEditor(document.getElementById("box"), {
    host,
    data: { htmlCode: "<h1>Hello</h1>" },
    ui: { panels: false, nav: false },   // hide parts you do not need
});

ed.onChange(({ html }) => console.log(html));
ed.setHtml("<p>New</p>");   // ed.getHtml(), ed.isDirty(), ed.save(), ed.destroy()
```

| `ui` | Effect |
|---|---|
| `panels: false` | no Layers, Properties or Code panels |
| `nav: false` | no Back, page list or project |
| `tools: [...]` | only these tools (`move hand interact frame shape text add`); `null` keeps all |

## Notes

- The editor loads Tailwind's play CDN (v3) unless you pass `tailwind: false` because your page already has it.
- One full-page editor per page. It takes over the page's size and keyboard.
- Source, demo and issues: https://github.com/Tolaj/windcraft
- MIT licensed.
