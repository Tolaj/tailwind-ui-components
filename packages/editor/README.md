# @windcraft/editor

The Windcraft visual editor (HTML + Tailwind): canvas, layers, Properties panel, code panel and pages. It has no backend of its own: the page that mounts it gives it a **host** that loads and saves.

```js
import { mountEditor } from "@windcraft/editor";

await mountEditor(document.getElementById("root"), {
    host,   // saving, projects, AI and the address: see design/host.js
    data,   // the design to open: { id, title, htmlCode, ... }
});
```

| Piece | Where |
|---|---|
| What the app must provide | `design/host.js` (the `Host` type) |
| A host with no backend (localStorage) | `demo/demo.js` |
| Run the demo | `npm run demo`, then open http://localhost:4000/editor/demo/ |
| Windcraft's own host | `src/public/js/app-host.js` |

The page must map `@windcraft/core/` and `@windcraft/editor/` to where they are served (an import map, as in `demo/index.html`, or a bundler). `mountEditor` loads Tailwind's play CDN (v3) unless you pass `tailwind: false`. One editor per page; it takes over the page's size, keys and zoom.

The AI panel and "Generate" need `host.generate`; without a working one they show its error.

## Embedding in a container

`embedEditor` puts the editor in an element of your page, isolated in an iframe (its own keys, zoom and styles), so several can share a page and it fills whatever size you give it. Leave out the parts you don't need with `ui`; keep the code box and the details form in your own page.

```js
import { embedEditor } from "@windcraft/editor";

const ed = embedEditor(el, {
    host,                                    // saving, as above
    data: { htmlCode },                      // what to open
    ui: { panels: false, nav: false, tools: ["move", "hand", "interact", "frame", "shape", "text", "add"] },
    onDetails: (fields) => showMyForm(fields), // the first save of a new design needs a name: you ask, then call saveDetails
});
ed.onChange(({ html, dirty, status, source }) => {});  // source: "host" (your setHtml), "editor" (a change there), "status" (save state only)
ed.setHtml(html);  ed.getHtml();  ed.isDirty();  ed.save();
await ed.saveDetails({ title, category, description, tags, isPublished, project });
ed.destroy();
```

| `ui` | Effect |
|---|---|
| `panels: false` | no Layers, Properties or Code panels |
| `nav: false` | no Back, page list or project |
| `tools: [...]` | only these tools (`move hand interact frame shape text add`); `null` keeps all |

The iframe loads `embed.html` (next to `embed.js`; pass `src` if you serve it elsewhere). It needs the same import map as any editor page. Run `npm run demo` and open `/editor/demo/embed.html` for a working example: a code box and the editor following each other.
