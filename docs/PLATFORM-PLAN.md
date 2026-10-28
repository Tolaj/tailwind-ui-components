# Windcraft: platform and catalog plan (v2)

Status: decisions settled (section 7); nothing here is built yet. The aim of this plan is subtraction: every concept, page and field either earns
its place or goes. What remains is one noun, one catalog, and a few verbs.

## 1. The test every part must pass

Keep a thing only if it does at least one of these, and nothing else already does it:

1. Helps someone **design** (canvas, code, theme).
2. Helps someone **reuse** (a catalog part, a component from another project).
3. Helps an **agent** do the same (MCP, AI generation).

Anything else (counters, feeds, second ways to do the same job) is removed.

## 2. The platform in one sentence

**Everything is a project.** A project holds pages, components and a theme. The **Catalog** is a set of projects the platform owns
(read-only, forkable). Nothing else is a top-level concept.

| Today | Verdict | Why |
|---|---|---|
| **Library** (a list of your project-less components) | **Remove** | A component belongs to a project; its list is the project's Components tab. Cross-project search is a search box, not a place |
| **Public gallery and category pages** (`/category/:slug`, component detail) | **Replace by Catalog** | Same job (find a ready part), but curated, versioned and complete instead of user-posted |
| **Likes, views, `isPublished`** | **Remove** | Social features that nothing in the product depends on. Projects are private; sharing, if needed later, is a link on a project |
| **Add Component dialog** | **Replace, archive the code**; its job (write or paste code, see it, test it) moves into the editor as a **code-left layout** (section 4.1) | It repeats what the full editor has (code, canvas, interact, save); two UIs for one job |
| **"Category" typed into a long list** | **Replace by family** | The catalog's structure (Button, Input…) is the category; no 35-entry dropdown |
| **Required description and tags on save** | **Make optional, fill by AI** | Friction at save time; they exist for search and agents, which can derive them |
| **Component `profile` and `design spec`** | **Merge into one** | Two derived summaries of the same code (`profile.service.js`, `design-spec.service.js`). Keep one, generated on save |
| **`useAsReference`, `forkedFrom`** | **Audit, then fold into `origin`** | Two flags for "this came from / feeds that"; one field does it |
| **Legacy local-LLM route, `lastSeen` middleware, plaintext passwords** | **Checked: nothing to do now** | The audit found the local-LLM route already gone, passwords already hashed with bcrypt (the notes in `docs/PROJECT.md` are out of date), and `lastSeen` is wired in and only touches the session, so it stays |
| **Separate "Library" and "Projects" in the nav** | **One: Projects** (plus Catalog) | See above |

Stays, because it passes the test: the design editor (and its npm package), code panel, version history and restore, export to
HTML / React / Vue / Svelte, Figma import, MCP, AI generation, project board with page groups.

## 3. The model

```
Project ── Page        a full screen on the canvas            (kind: page)
        ├─ Component   a reusable part                         (kind: component)
        └─ Theme       tokens: colour, type, radius, spacing, shadow

Catalog = Projects with owner = platform, read-only
Fork    = copy a catalog (or any) project, or chosen parts of it, into yours; the copy remembers its `origin`
```

- `project` is **required** on every Page and Component. `kind: "section"` stays internal (used by the Figma converter), never shown.
- `origin` = `{ id, version }` of where a part came from; lets the editor say "update available" later.
- A catalog **template** (for example "SaaS landing") is not a new concept: it is a catalog project you fork.
- `family` and `variant` (catalog only, see 5) replace `category`.
- **No project-less components, and no Imported bucket.** Existing project-less components are **deleted**, not migrated (your
  decision). Because this is destructive it runs as an explicit script with a dry run (a count and a list of titles), an automatic
  JSON export of what it will remove, and a typed confirmation. Old public-gallery items worth keeping are copied into the Catalog
  files first (section 5.6); everything else goes.

## 4. What the user sees (fewer places)

| Where | What |
|---|---|
| **Nav** | Catalog · Projects · account. One primary button: **New project**. Visitors see Catalog and Sign in |
| **/projects** | Your projects |
| **/projects/:id** | Tabs: **Pages** (the board) · **Components** · **Theme**. Buttons: New page, New component, Import (HTML, Figma) |
| **/design/:id** | The editor. New component and New page both open here, with the project already chosen |
| **/catalog** | Families (Button, Input, Card…), then sections, then templates. Search |
| **/catalog/:family** | The variant matrix, live, with theme and dark switch; code tabs (HTML, React, Vue, Svelte); **Add to project** |
| **/** | A product page for Windcraft with a catalog preview. No categories grid |

Details form (first save) shrinks to what is truly needed: **Name** only, because the project is already chosen where you started
(a project page, or the editor you are in). Description, tags and family are suggested automatically and editable later.

### 4.1 Quick create and test (replaces the Add component dialog)

What the dialog was good at: paste or write code, see it at once, try it, save. The full editor already has all of it; what it
lacks is the **side-by-side arrangement**. So:

1. **Code dock**: the Code panel can sit **left** (side by side with the canvas) or **bottom** (today). The choice is remembered.
   Opened from New component, it starts **left**.
2. **New component** (inside a project) opens `/design/new?project=ID&kind=component` with the code dock left and focused, an empty
   canvas with a one-line hint (paste code or write it), and the Interact tool one key away (P) for testing.
3. **Save** asks for the name only (the card that drops under the toolbar stays, trimmed to one field).
4. **Format on first paste** into an empty editor and the Format button stay (already built).
5. The embedded-editor package (`embedEditor`) stays as a product for other apps, with its demo; the app itself stops using it.

**Archived, not deleted.** The dialog's code is kept until you decide what to do with it: it is saved as the git tag
`archive/add-component-dialog` (commit b78239a, the dialog as it works today: code left, embedded editor right, details card,
resizable split). When the code-left layout replaces it, the files are **moved to `archive/add-component/`** (outside `src`, not served,
not loaded) instead of being deleted: the `component-playground` partials, `playground-*.js`, the "Full editor" hand-off and its
draft/return plumbing. Only the nav **Add Component** button is simply removed. Restore with
`git checkout archive/add-component-dialog -- <path>` or by moving the folder back. Deleting the archive is a separate decision for later.

## 5. The catalog

### 5.1 Rules that keep it small

1. **A component is a family, not a pile.** Sizes and states are *axes of one template*, not separate items. Button is one
   component with 6 styles; sizes xs to xl, states, icon options and dark mode are generated from it. Catalog size = families × styles.
2. A new style exists only if it **looks or behaves differently** in a way a user would pick. Otherwise it is an axis or it is cut.
3. Every part is complete: states, keyboard, focus, dark, responsive, tokens only (checklist 5.4).
4. Plain, semantic HTML + Tailwind. Framework code is generated from it.

### 5.2 Tier 1: ships first (the parts nearly every product needs)

| Family | Styles (the things a person picks) | Axes (generated) |
|---|---|---|
| **Button** | primary · secondary · outline · ghost · destructive · link; plus **button group** and **icon button** | size xs–xl, state, icon left/right, loading |
| **Input** | text · password · search · with prefix/suffix | size, state (focus, error, success, disabled) |
| **Textarea** | basic · auto-grow | state |
| **Select** | native · custom list · searchable | size, state |
| **Checkbox / Radio / Switch** | simple · with description · card | state |
| **Form field** | label + hint + error wrapper | |
| **Badge** | soft · solid · outline · dot | size, colour |
| **Avatar** | image · initials · group | size, status dot |
| **Card** | basic · media · horizontal · stat | interactive |
| **Alert** | inline · banner | info, success, warning, error; dismissible |
| **Toast** | one pattern | the four kinds |
| **Modal** | confirm · form · side drawer | size |
| **Dropdown menu** | basic · with sections and icons | |
| **Tooltip / Popover** | one each | placement |
| **Tabs** | line · pill · vertical | |
| **Table** | basic · sortable · with selection · empty | density |
| **Navbar / Sidebar / Footer** | the three layouts apps and sites actually use | |

About 17 families, 3 to 6 styles each: roughly 60 to 70 hand-designed variants, thousands of generated combinations.

### 5.3 Tier 2: after Tier 1 is solid (only if used)

Accordion, breadcrumb, pagination, progress / spinner / skeleton, empty state, stepper, slider, file upload, date picker, command palette.
**Marketing sections**: hero · features · pricing · testimonials · FAQ · CTA · logo cloud (7, each with 2 to 3 layouts).
**Templates** (catalog projects): landing, pricing, sign in / sign up, dashboard, settings.

### 5.4 Never in the catalog

Team, blog list, contact and newsletter sections (a card plus a form already covers them), chart widgets (belong in a data library),
OTP and code block (rare, and trivial from Input), per-industry one-offs. If three real projects need it, it is promoted from a
user project; until then it does not exist here.

### 5.5 Done means (per part)

- [ ] Semantic HTML, correct roles, keyboard works (Tab order, Enter/Space/Esc/arrows where relevant)
- [ ] Visible focus, hover, active, disabled (and loading if it applies)
- [ ] Dark mode; responsive at 360, 768, 1280
- [ ] Only theme tokens (no raw brand colours or hex)
- [ ] Text contrast meets WCAG AA
- [ ] Same result in the canvas and in the catalog preview
- [ ] One-line description and tags, written once

### 5.6 How it is built and kept honest

- **Files are the source of truth**: `catalog/<family>/<style>.html` + `family.json` (name, axes, tags). Reviewed in pull requests;
  a seed script loads them into the platform-owned projects.
- **One template per family**, axes expand it. Changing the focus ring or a radius is one edit.
- **A script checks what can be checked** for every generated variant: focus-visible present, no raw hex, contrast of text on its
  background, required ARIA attributes.

## 6. Theme (small on purpose)

A project's theme is a short list: brand colour (one scale), neutral scale, font, radius, shadow, spacing density. It writes CSS
variables mapped into Tailwind. The canvas, the catalog preview and the exports all read it. No per-component colour pickers.
Without theme the catalog is a snippet shelf; with it, one part looks right in any product. That is the only reason it is here.

## 7. Decisions (settled)

| # | Decision | Detail |
|---|---|---|
| 1 | **Add component dialog is replaced, its code kept for now** | Its job moves into the editor as the code-left layout, New component and a one-field save (4.1). The old code is archived (tag now, folder when replaced), not deleted; what to do with it is decided later |
| 2 | **No project-less components; existing ones are deleted** | No Imported bucket. The delete runs as a guarded script: dry run, automatic export, typed confirmation (section 3) |
| 3 | **The platform is free; the catalog is public to browse** | Visitors can browse and preview the catalog (good for search and sharing). Sign in to fork, export (HTML / React / Vue / Svelte) and use it through MCP. No paid tier, nothing to design around for limits now |
| 4 | **No teams for now** | A project is owned by a user. The model extends to teams later without rework |
| 5 | **Icons: Lucide, bundled** | ISC licence (allowed by `npm run licenses`), tree-shakeable, one consistent stroke. A project can still bring its own |

## 8. Roadmap (subtract first, then build)

| Phase | Outcome | Work |
|---|---|---|
| **0. Remove** (1 week) | Smaller product | Remove likes/views/publish, legacy route and middleware; hash passwords; audit `profile` vs `design spec`, `useAsReference`, `forkedFrom` and merge; guarded delete of project-less components; delete the Library page and category/detail pages behind a redirect to Projects |
| **1. One noun** (1 to 2 weeks) | Projects are the home | Required `project`, project page with Pages / Components / Theme tabs, nav reduced to Catalog · Projects, one-field save, **code-left layout and New component (4.1)**, then remove the Add component dialog |
| **2. Theme** (1 to 2 weeks) | One place to restyle | Tokens model, Tailwind mapping, canvas and previews read it, dark switch |
| **3. Catalog engine** (2 weeks) | The catalog exists | Platform-owned projects, family page with variant matrix, theme + dark, code tabs, Add to project (fork with `origin`), search, `catalog/` seed script and the checks in 5.6 |
| **4. Tier 1 content** (4 to 5 weeks, three batches) | Real parts | A: Button, Input, Textarea, Select, Checkbox/Radio/Switch, Form field, Badge. B: Avatar, Card, Alert, Toast, Modal, Dropdown, Tooltip/Popover. C: Tabs, Table, Navbar, Sidebar, Footer |
| **5. Agents** (alongside 3 and 4) | AI uses the catalog | MCP `list_catalog`, `get_component` on catalog parts, generation prefers catalog parts and the project's theme |
| **6. Tier 2** (as needed) | Fast starts | Sections and templates, then the remaining families, only those requested |

Order matters: 0 to 3 before any content, so each family is written once, against the final model.

## 9. Phase 0 progress

| Item | State |
|---|---|
| Likes and views (fields, like endpoint, view counting, the counts on the detail page) | **Done** |
| Legacy route, `lastSeen`, passwords | **Checked, nothing to remove** (see section 2) |
| Guarded delete of project-less components | **Script written, not run**: `npm run components:projectless` is a dry run; `-- --delete` backs up to `backups/`, then asks you to type `delete <count>` |
| `isPublished`, the Library page, category and detail pages | **Moved to Phase 1**: the public gallery still depends on `isPublished`, and the Library page has no replacement until the project page has its Components tab |
| `profile` vs design spec, `useAsReference`, `forkedFrom` | **Open**: audit next |

## 10. Phase 1 progress

| Item | State |
|---|---|
| Code dock: the editor's Code panel can sit left or below, remembered | **Done** |
| New component from a project (`/design/new?project=ID&kind=component`): code open on the left, saved as a component | **Done** |
| One-field save when the project is already chosen (name only; defaults for the rest, private) | **Done** |
| Project page: Pages / Components tabs in the sidebar, "+ New component", component count | **Done** (not opened in a browser: needs sign-in) |
| Theme tab | Phase 2 |
| Required `project` on every save, nav reduced to Catalog · Projects, remove the Add component dialog (archive it), remove `isPublished`, Library and category pages | **Next** |

## 11. What I have not verified

This plan comes from the code I have read: the component and project models, the library and project routes, the editor and the
docs. I have **not** audited every route, field and page for use, so the removals in section 2 marked "audit" must be checked
against real usage (for example anything reading `useAsReference`, `profile` or `likes`) in Phase 0 before deleting.
