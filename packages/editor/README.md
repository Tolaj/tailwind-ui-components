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
