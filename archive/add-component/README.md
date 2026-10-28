# Add component dialog (archived)

The quick "Add component" dialog: code on the left, Windcraft's design editor embedded on the right, a details card that
drops under the editor's toolbar, a "Full editor" hand-off and a return path. Replaced by the editor's code-left layout and
New component from a project (see `docs/PLATFORM-PLAN.md`, section 4.1). Kept, not deleted, until you decide what to do with it.

| Here | Was at |
|---|---|
| `views/component-playground/` | `src/views/partials/component-playground/` (included on home, library, category and component pages) |
| `js/playground/` | `src/public/js/playground/` |

Not archived as files, because they are part of live code, but they existed too: the dialog's draft / return hand-off in
`src/public/js/design-main.js` and the nav "Add Component" button in `src/views/partials/header.handlebars`.
Everything, exactly as it was, is also in the git tag `archive/add-component-dialog` (commit b78239a).

## Restoring it

1. Move the two folders back to the paths above.
2. Add `{{> component-playground/index}}` to the pages that opened it, and a button with `command="show-modal" commandfor="dialog"`.
3. Restore `design-main.js` and `header.handlebars` from the tag: `git checkout archive/add-component-dialog -- src/public/js/design-main.js src/views/partials/header.handlebars`.

It uses `embedEditor` from `@windcraft/editor` (still in the package) and `POST /api/components`, which now requires a project:
the dialog already asks for one.
