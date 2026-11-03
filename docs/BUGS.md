# Bug Tracker

All issues from the initial audit have been resolved. Open items are listed first.

## Open

None.

## Fixed (found while making the demo videos, 2026-10-28)

- In Interact, the page name could still be edited (double-click on the name above a page or in the Pages list, the page's pencil button, the details). Interact now leaves names and details alone (`S.mode` checks in `designs.js`, `pages-panel.js`, `add-menu.js`).
- In Interact (the live preview), Ctrl/Cmd + scroll or a pinch over the page zoomed the whole browser window, because the live page has none of the editor's script. It now stops the browser zoom and zooms the canvas like everywhere else (`previewWheelScript` in `design/editor/docs.js`); plain scrolling stays the page's own.
- A shape drawn with the Rectangle or Frame tool (or any drag) that was released outside the page, or exactly on its edge, never finished: the page is a separate document and gets no pointer events outside itself. The editor window now passes the pointer on to the page while a drag runs (`extPointer` in `frame-messages.js` and `agent.js`).
- A Tailwind colour name for the project's own scale (`brand-700`) typed in a colour field was ignored. `brand` is now one of the colour families (`HUES` in `core/class-groups.js`), with its swatch read from the project's theme; the palette grid still lists only Tailwind's own hues.
- The code panel scrolled sideways to show a changed class, cutting off the start of the lines in a narrow panel. Long lines now wrap.
- The Properties panel showed "Generate with AI" and an AI tab even when the app gave the editor no AI (the demo). `host.generate` is now optional, and without it the box and the tab are not shown.

## Fixed (initial audit)

- Plaintext passwords — Now using bcrypt for hashing and comparison
- Missing `validator.js` — Created with email validation
- Missing `nodemailer`/`googleapis` deps — Installed; sendEmail.js lazily initializes so server doesn't crash without email env vars
- `toggleLike` always increments — Now tracks per-user likes via `likedBy` array
- Session cookie named `SlackOverflowSession` — Renamed to `TailwindUISession`
- `requestLogger` role labels ("professor"/"student") — Now shows user email
- `llama.local.routes.js` dead code — Removed
- `registerHandlebarsHelpers` unused — Removed
- `ensureProfessor` middleware — Removed
- `package.json` main field wrong — Fixed to `src/server.js`
- `dotenv.config()` called multiple times — Consolidated to `server.js`
- `lastSeen` middleware never wired — Now wired in `app.js`
- `sendEmail.js` "SlackOverflow" branding — Renamed to "Tailwind UI"
