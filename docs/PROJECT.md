# Tailwind UI Components

## Overview
A web app for browsing, creating, and editing Tailwind CSS UI components. Users can browse categorized components, view live previews, edit HTML in a playground with AI assistance (Anthropic Claude or a local LLM), and manage their own component library.

## Tech Stack
- **Runtime**: Node.js (ESM modules)
- **Framework**: Express 5
- **Templating**: Handlebars (express-handlebars)
- **Database**: MongoDB via Mongoose 7
- **Sessions**: express-session + connect-mongo
- **AI**: @anthropic-ai/sdk for Claude, OpenAI-compatible API for local LLMs
- **Deployment**: Vercel (vercel.json)

## Project Structure
```
src/
├── app.js                  # Express app setup, middleware, handlebars config
├── server.js               # Entry point, starts server + DB connection
├── config/
│   ├── mongoConnection.js  # Mongoose connection singleton
│   └── settings.js         # MongoDB config (reads MONGO_URI)
├── controllers/
│   ├── component.controller.js  # CRUD + like for components (JSON API)
│   └── user.controller.js       # User signup, signin, LLM settings
├── middlewares/
│   ├── auth.js             # ensureAuth, ensureAuthAPI, redirectIfAuthenticated, etc.
│   ├── lastSeen.js         # Updates session lastSeen (NOT currently wired in app.js)
│   ├── requestLogger.js    # Logs method/path/auth status
│   └── sessionConfig.js    # express-session with MongoStore
├── models/
│   ├── component.model.js  # title, category, description, htmlCode, elementsDescription, views, likes
│   └── user.model.js       # name, email, password (plaintext!), llmSettings
├── routes/
│   ├── index.js            # Route mounting, 404 catch-all
│   ├── ai.routes.js        # POST /api/ai/generate-stream (multi-provider SSE streaming)
│   ├── auth.routes.js      # GET sign-in/sign-up/sign-out/verify-otp pages
│   ├── component.routes.js # REST /api/components
│   ├── home.routes.js      # Home page, /category/:category, /component/:id
│   ├── llama.local.routes.js  # Unused legacy local LLM route (superseded by ai.routes.js)
│   └── user.routes.js      # POST /users, /users/sign-in, GET/PUT /users/settings/llm
├── services/
│   └── user.service.js     # User CRUD wrappers around Mongoose
├── processes/
│   ├── generateOTP.js      # OTP email sender (imports missing validator.js)
│   └── sendEmail.js        # Gmail OAuth2 email (requires nodemailer + googleapis, NOT in deps)
├── utils/
│   └── handlebars-helpers.js  # formatDate, substring helpers
├── views/                  # Handlebars templates
│   ├── layouts/            # main.handlebars, auth.handlebars
│   ├── main/               # home, category-detail, component-detail
│   ├── auth/               # signin, signup, verification
│   ├── partials/           # header, sidebar, settings-modal, component-playground/*
│   └── error.handlebars
└── public/                 # Static assets
    ├── css/                # style.css, ag-grid.css, quill.css
    ├── js/                 # Client-side JS (auth, home, category, playground/*, settings, theme)
    └── images/             # logo.png, logoName.png
```

## Key Routes
- `GET /` — Home page with category cards
- `GET /category/:category` — Components in a category
- `GET /component/:id` — Component detail/playground
- `GET /auth/sign-in|sign-up|sign-out` — Auth pages
- `POST /users` — Create user
- `POST /users/sign-in` — Sign in
- `GET|PUT /users/settings/llm` — LLM settings
- `GET|POST|PUT|DELETE /api/components` — Component CRUD
- `POST /api/ai/generate-stream` — AI streaming endpoint (SSE)

## Library (primary focus)
A personal component library that AI can read and write; the public gallery stays as-is.
- `GET /library` (auth) — your components: search, tags, preview, export, history, edit. `/my-components` redirects here.
- Components have `tags`, `version`, and `versions[]` snapshots (taken on every htmlCode change). Restore: `POST /api/components/:id/versions/:v/restore`.
- Export: `GET /api/components/:id/export?format=html|react|vue|svelte` (`utils/exporters.js`).
- AI grounding: `routes/ai.routes.js` adds the 3 best-matching library components (keyword score, `services/library.service.js`) to the system prompt; the client shows "Using your library: ...".
- MCP: `POST /mcp` (stateless JSON-RPC, Bearer token). Tools: `search_components`, `get_component`, `save_component`, `list_tags`. Token from `POST /users/api-token` (stored as sha256 hash on the user, shown once).
- Editor preview is a sandboxed iframe that supports HTML + Tailwind, `<style>`, `<link>`, `<script>` (`public/js/playground/component-source.js`).
- Spec cards: `services/spec.service.js` `extractSpec()` parses classes/HTML into tokens, structure, needs, responsive/dark flags (deterministic, stored in `component.spec`, rebuilt on code change). `enrichSpecWithAI()` adds summary/useWhen/avoidWhen using the owner's AI settings, fire-and-forget. `GET /api/components/:id/spec`.
- Design guide: `services/guide.service.js` builds markdown (usage rules, aggregated tokens, conventions, component index). `GET /library/design-guide.md`, MCP `get_design_guide`, and its tokens section is added to the AI generation prompt.
- MCP flow for agents: get_design_guide -> search_components (compact cards) -> get_component (spec + code) -> save_component.
- Connect page (`/connect`, `routes/connect.routes.js`, `services/kit.service.js`, `utils/zip.js`): downloads `claude-code-kit.zip` (.mcp.json using $TAILWIND_LIBRARY_TOKEN, CLAUDE.md snippet, `ui-library` skill) and `design-pack.zip` (BRIEF.md, design-guide.md, index.json, components/*.html + .spec.md). Library has an Import dialog (drop/choose .html and .zip, paste HTML, optional section split) calling `POST /api/components/import`. MCP `save_design` does the same for Claude (split is OPT-IN there: default saves one component): `services/import.service.js` saves the whole page plus, when split, one private component per section; the splitter only splits vertically stacked semantic sections and never flex/grid shells, asides or div-only pages (`public/js/shared/split-sections.js`, pure string logic shared by server and browser; sections carry the page's <style>/<link>). Body limit raised to 3 MB. Claude Design = file attach.
- OAuth 2.1 for claude.ai custom connectors (`routes/oauth.routes.js`, `services/oauth.service.js`, models `oauthClient`/`oauthToken`): discovery at `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`, dynamic client registration `POST /oauth/register`, consent `GET/POST /oauth/authorize` (PKCE S256 required, CSRF-protected, exact redirect match), `POST /oauth/token` (authorization_code + rotating refresh_token; codes single-use; all tokens stored hashed). `/mcp` accepts either a personal `twl_` token or an OAuth access token and returns a 401 with `resource_metadata`. Set `PUBLIC_URL` to the public HTTPS address in production; claude.ai cannot reach localhost. Connected apps are listed and revocable on /connect. `GET /connect/check` (button "Run test") runs the whole Claude sequence against the public address (https, both .well-known documents, 401 challenge, DCR, an authenticated tools/list with a throwaway token, CORS) and returns per-check fixes. `/mcp` is a stateless Streamable HTTP endpoint: version negotiation (2025-06-18, 2025-03-26, 2024-11-05), tool annotations, JSON-RPC batches, CORS, JSON errors for malformed input; `/oauth/revoke` (RFC 7009) and a per-IP registration limit exist. Deployment: `app.set('trust proxy', 1)`, session cookie `secure:'auto'`+`sameSite:'lax'`, `src/server.js` exports the app and only listens when not on Vercel, `vercel.json` includes views and public files. Set `PUBLIC_URL` to the exact public https address. Reliability: `connectDB()` shares one connection attempt and retries on the next call; app.js waits for it on every request (503 JSON with Retry-After if the DB is down, never a crash); an `unhandledRejection` handler logs instead of killing the function; `GET /healthz` pings the DB; `vercel.json` sets maxDuration 60; `importDesign` batch-inserts sections and, on Vercel, waits up to 6s for the page's AI summary (background work is frozen after the response).
- Design canvas (`GET /design/:id`, owner only; `routes/design.routes.js`, layout `canvas`, `public/js/design/`): Figma-style visual editor. The component renders in a sandboxed iframe (no same-origin) with an injected agent (`agent.js`, stringified via Function.toString, tagged `data-wc-agent` and stripped on serialize) that handles hover/select/inline text edit and mutation commands over postMessage by DOM path. `editor.js` owns history (undo/redo, coalesced typing), layers (drag to reorder), inspector (text, attributes, typography, colors, spacing, shape, layout, raw classes via `class-groups.js` registry of ~100 utility groups with variant-aware get/set, and `inspector.js` which renders the Design / Classes and CSS / AI tabs: data-driven sections, box-model widget, color palette, breakpoint and state targeting), device widths, zoom, Edit/Preview (Preview runs the component's own JS), AI edit of the selected element (reuses /api/ai/generate-stream with useLibrary:false), and Save (PUT -> new version, original <style>/<link>/<script> preserved around the edited markup). Two editors: the quick modal (`component-playground` partials + `public/js/playground/*`, opened by Add Component / New component) and the canvas. The modal's Full editor / expand button calls `openFullEditor()` (playground-dialog.js), which stores the code and details in sessionStorage `wc:draft` and goes to `/design/new?draft=1`; editor.js reads it. Library card Edit opens the canvas directly; the canvas Back link uses document.referrer. The canvas: `/design/new` creates (start screen: AI draft via /api/ai/generate-stream with library grounding, paste into the Code panel, or a starter section; + Add menu of blocks; Code panel two-way synced; Save opens a details dialog -> POST /api/components, then the URL becomes /design/:id), and `/design/:id` edits (Save -> PUT new version; click the title for metadata). `public/js/playground/component-source.js` is the shared parser used by both.
- Projects: `models/project.model.js` (name, description, owner); components gain `project`, `kind` (component|page|section), `parent` (a section's page), `order`. `services/project.service.js` (`resolveProject` by id or case-insensitive name, optionally creating; `listProjects`; `projectTree`). Pages: `/projects` (list) and `/projects/:id` (infinite plane in `public/js/project-board.js`, layout `canvas`: a CSS-transformed world div, pan by drag/scroll, Ctrl/Cmd+scroll zooms at the cursor, frames are 1280px-wide iframes sized to their content, labels counter-scaled via --iz, drag-to-move with 8px snap; positions saved in `component.board {x,y}` through `POST /api/projects/:id/layout`, null = automatic layout; Fit and Tidy up); API `/api/projects` (CRUD; deleting keeps components). `PUT /api/components/:id {project}` moves a component (its sections follow). MCP: `save_pages` (several pages in one call, each its own page component in a project; added because Claude Design merged multi-page designs into one HTML file when only save_design existed), `list_projects`, `create_project`, `get_project`, and a `project` param on `save_design`, `save_component`, `search_components`; the design guide lists projects. Editor: `/design/new?project=ID`, project select in the details dialog, breadcrumb link. Library cards have a Project dropdown and a filter.
- Active project + brief: `user.activeProject`, `project.brief`. `projectContext()` (project.service) builds the context text (active project, description, brief, page list with ids). It is appended to the MCP `initialize` instructions (so Claude knows the project the moment it connects) and to the top of the design guide. MCP: `get_context`, `set_active_project`, `update_project`; `save_*` tools default to the active project when `project` is omitted, and naming a new project when none is active makes it active. UI: Set as active + brief editor on the board, Active badge on /projects; `POST /api/projects/:id/activate`.
- Free design tools (canvas): `public/js/design/agent.js` now runs the whole direct-manipulation layer inside the iframe: tools (move/hand/frame/rect/ellipse/text/image/button), draw-by-drag into the deepest container, free move/resize/rotate of position:absolute elements (inline style left/top/width/height/transform, `position:absolute` is set inline because the Tailwind `absolute` class arrives asynchronously), snapping + red guides, marquee/multi-select, align/distribute, group/ungroup, nudge, duplicate/delete, reorder of flow elements, image drop, overlay redraw on Tailwind style injection. Parent (`editor.js`): floating tool palette (`#toolbar`), shortcuts, pan shield for Hand/Space, Ctrl/Cmd+wheel zoom, Position and size section in `inspector.js` (X/Y/W/H/Rot, Free position, align, group). Everything serializes to plain HTML.
- Framework-agnostic styling: the inspector has two panels. Tailwind mode (class-groups.js registry) and CSS mode (`css-props.js` property registry: reads computed styles reported by the agent, writes inline styles via the agent's `setStyleProp`, so it works whatever styled the element). `modeFor()` in inspector.js picks per element (utility classes -> Tailwind, only custom classes -> CSS, no classes -> by whether the document uses Tailwind, `ui.docTailwind` from `refreshDocFlag()` in editor.js); the user can force either. Variants (hover/breakpoints) are Tailwind-only because inline styles cannot express them.
- Editor plane: `/design/:id` shows every design of the project on one infinite plane (`#plane` is CSS-transformed by `view {x,y,z}` in editor.js; positions come from `public/js/shared/board-layout.js`, the same module the project board uses, so both views share `component.board`). `docs` Map in editor.js holds one entry per design; exactly one is live (the `#frame` iframe with the agent, positioned over its wrap, never re-parented because moving an iframe reloads its old srcdoc), the rest are lazily mounted preview iframes with a click/drag shield. `activate(key)` stashes the live design's markup/history/meta and loads another; Save writes every dirty design (`persist`: POST for new drafts with default category/description, PUT otherwise). Agent messages carry `load` (= `window.__wcLoad`, bumped per `loadFrame`) and the editor drops messages from replaced documents. The agent forwards wheel events so scrolling/pinching over the live frame pans/zooms the plane. `design.routes.js` sends `plane` (siblings with htmlCode) in the page data.
- Editor chrome: the header is only back/title/save. Floating pills on the canvas (`.pill`): left = designs menu + tool palette + insert blocks, right = undo/redo, code, play (preview), panel toggle, zoom. The right panel (`#panel`, Properties | Layers, state in localStorage `wc:panel`) is closed by default. `float-toolbar.js` renders the contextual toolbar (`#ftb`: text / shape / frame kinds) and editor.js (`toolbarState`, `FLOAT_ACTIONS`) turns clicks into edits through the same `applyValue`/`applyColor` (Tailwind) or `setStyleProp` (CSS mode) paths as the inspector. The agent reports `rect` for the selection and `editing`/`gesture`/`info` messages; while text is being edited B/I/U/link go through `document.execCommand` (the toolbar's mousedown is `preventDefault`ed so the iframe keeps focus). Handles (corner squares resize, zones just outside corners rotate, edge strips resize one axis, dots set the radius) are drawn by the editor in `#sel` inside the plane (`selection-overlay.js`), not in the iframe, so the frame edge never clips them and an element hanging outside the frame keeps its full outline. The agent only posts `{type:"overlay", items, handles, label, bbox}` from `redraw()`; a handle press is forwarded as `hstart`/`hmove`/`hend` with pointer coordinates in the frame's own space and the agent's `beginHandle`/`onMove`/`onUp` run the gesture. Resize works in the element's own axes and keeps the opposite side fixed. Frames: `board {x,y,w,h}` (w/h optional, h absent = follows content); `POST /api/projects/:id/layout` merges sizes (number sets, null clears, undefined keeps); `computeLayout` takes `widthOf`; the project board honors sizes. Frame selection (`frameSel`) shows resize handles in `#fsel` inside the plane.
- Editor gotchas: the agent captures the pointer on `<html>` at pointerdown, so `click`/`dblclick` report `html` as their target; find the element with `elementsFromPoint` (see `hitAt`). The floating bar rebuilds itself after every edit, so its buttons act on `mousedown` (a rebuild between press and release swallows `click`), and a same-element `selected` message must not close its menu.
- Radius dots: the agent draws four dots inside the selection container (`rad-<corner>`), previews the radius inline while dragging, then restores the element and posts `{type:"radius", path, value}`; editor.js applies it through `FLOAT_ACTIONS.radius` (class in Tailwind mode, inline style otherwise) so it is one undo step. The rotate cursor is generated per corner and per element angle (`rotateCursor`).
- Plane background: `applyView` keeps the dot spacing between 16 and 32 screen px (doubling/halving, whole pixels) while the dot size is fixed in CSS; `#pgrid` (inside the plane, under `#sel`) draws one hairline per design pixel from `GRID_FROM = 4` (400%). Zoom range is `MIN_Z = 0.02` to `MAX_Z = 256`.
- Handle rendering gotchas: the selection (`#sel`) and frame handles (`#fsel`) live in the canvas in SCREEN pixels, not inside the scaled plane (anything sized in plane units shrinks to fractions of a pixel at high zoom, the browser rounds it, and rings vanish / circles turn into blobs); they are redrawn on every pan and zoom (`renderFrameSel`). Outlines are SVG paths (a CSS box tens of thousands of pixels wide silently stops painting its shadow). The agent sends each box's corner radii as numbers (`rh`, `rv`). The live frame iframe has no `title` (it showed a tooltip over the design). cursor URLs inside the `style="..."` markup in `selection-overlay.js` must use single quotes or the attribute is cut off and the cursor silently becomes `auto`. The radius drag shows a live `Radius N` label at the pointer (`at` in the overlay message).
- Layers location: the `#layers` element is moved (not duplicated) between `#layersPane` (right panel tab) and `#leftBody` (the optional left panel, `wc:left`) by `setLeft()`; while the left panel is open the right panel's Layers tab is hidden. All layer handlers are bound to `#layers`, so they work in either place.
- No header bar in the editor: Back (`#backLink`) starts the left pill, Save (`#saveBtn`) ends the right pill, and the name/version/project link (`#detailsBtn`, `#versionBadge`, `#projLink`) live in the designs menu. `#saveState` is kept as a hidden status node (many code paths write to it); `syncSaveButton` mirrors it into the button's label and tooltip.
- Left panel (`#leftPanel`, `wc:left`): header `#leftHead` receives `#navGroup` (Back, the toggle, the page menu: only `#navMoreBtn` shows there), `#pagesList` is the Pages section (`renderPagesList`, rows `[data-page]`, dblclick renames via `renameFrame`), `#layersHost` hosts `#layers`, which in this mode renders only the current page's element tree. With the panel closed `#layers` moves back to the right panel's tab and shows page rows plus the selected page's tree. The user-facing word for a frame on the plane is **page**.
- Not built yet: embeddings over spec cards, teams/shared workspaces, Figma/Storybook export, per-component AI memory.

## Environment Variables
See `.env.example`. Key vars: `MONGO_URI`, `SESSION_SECRET`, `PORT`, `ANTHROPIC_API_KEY`, Gmail OAuth vars.

## Running
- `npm run dev` — nodemon dev server
- `npm start` — production (uses --env-file=.env)

## Known Issues (as of initial audit)
See `docs/BUGS.md`
