# Windcraft: platform plan (v3, from the brainstorm)

This replaces v1 and v2 (they stay in git history). It records what the owner decided, in order, and what that means for the code.
Nothing here is built yet unless it says so.

## 1. What Windcraft is

One platform with two doors.

- **The gallery** (the front door): people come to look at designs and choose one. It is also the catalog.
- **The editor**: where a design is made, with the code beside it. Every design lives in a **project**.

Audience: developers (copy code), designers (design visually), teams (build a product with their own look), and people using AI tools.
It is free.

## 2. The flow

**A visitor (no account)**
1. Opens the gallery: designs by **category**, the **most liked first**.
2. Opens a design: Preview and Code, phone size, full screen, a code-format menu (HTML and others), a copy button. No account needed to look or copy.
3. Presses **Like**: sent to sign in or sign up, and the like is counted once they are in.
4. Presses **Save** or **Open in editor**: sent to sign in or sign up, then continues.

**A signed-in person**
1. **Save**: the design is copied into a **project** that they choose.
2. **Open in editor**: makes their own copy in a project and opens it.
3. **New project**: creates the project at once and opens the editor on a blank page, with the code box on the left (like the old Add component). The name is changed later, from inside.
4. In the editor they change the design, set the project's look (colours, font, corners), and save.
5. Each design in a project has a **Public** switch. Turning it on puts the design in the gallery, under its name and category (which the design already has).
6. A project has a **share link**: whoever opens it can look at the project and copy the code.

**Anyone** can press **Report** (a flag button next to Like) on a gallery design. It **tells the owner**; the design **stays visible** until the owner removes it.

## 3. Rules

1. **A design can't exist without a project.** A project is the starting point of everything. (Built: the API refuses a design with no project.)
2. A project is: a folder, one shared look (its theme), a share link, and something to export or hand to an AI.
3. Anyone who signs up can publish to the gallery. Quality is kept by **Likes** (most liked first) and **Report**.
4. The gallery shows parts and pages together as it does now. Whether to split them (tabs, sections, a filter) is **decided later, after we see how it looks**.
5. Narrowing the gallery: **categories** (as now), plus most-liked ordering. No tags or search box for now.
6. AI: **MCP only** for now (the tools that exist). Other AI features, such as writing a design from a sentence, are for later.

## 4. Where the code stands against this

| Needed | State today |
|---|---|
| Gallery home, category pages, design page with Preview / Code / phone / full screen / format / copy | **Exists** |
| Design page: **Save** into a chosen project | **Done**: a project chooser (the last one used, or your active one, is preselected; or name a new project); a copy already saved in that project is reused, not duplicated |
| Design page: **Open in editor** | **Done**: same chooser, then opens your copy in the editor. Signed out, both buttons go to sign in and then carry on |
| **Likes**: button, count, most liked first, sign-in-then-like | **Done**: `likes` and `likedBy` are back; `POST /api/components/:id/like` (signed in; one like per person; counts once even if sent twice); the Like button shows on the design card; category pages sort by likes, then newest; signed out, it goes to sign in and the like is counted when the person returns; `/component/:id` now opens only published designs (or your own) |
| **Report** button and a way for the owner to review and remove | **New** |
| **Public** switch on a design in a project | **Change**: a publish flag exists in the data and in the editor's Details form; it needs to become a switch on the project page and in the editor |
| **New project** opens the editor on a blank page with code left | **Change**: today it creates the project and opens the project page |
| Project **share link** (look and copy code) | **New** |
| Project theme (brand colour, gray, font, corners) used by the editor and previews | **Exists** (built, committed) |
| Editor with the code docked left or below, one-field save | **Exists** |
| Project required to save a design | **Exists** |
| MCP tools | **Exists** |
| Figma import | **Exists** |
| The separate `/catalog` pages (hand-made Button and Input) | **Decided: remove** (the gallery is the catalog). The files stay in git history; the parked families are in a stash |
| Library page | **Decided: remove**. Saved designs live on the Projects page. Its jobs move first (export, history and restore, move, delete, import, design guide); the work is already done and kept in a git stash |

## 5. Build order (each step is usable on its own)

1. **Likes and ordering**: bring back likes; Like button on the design page; most liked first; sign-in then like.
2. **Save into a project** and **Open in editor** on the design page.
3. **New project opens the editor** (blank page, code left).
4. **Public switch** and publishing to the gallery.
5. **Report** and the owner's review screen.
6. **Share link** for a project.
7. Tidy: remove the `/catalog` pages; retire the Library page (move its jobs into Projects); rewrite the documentation and About pages to match.

## 6. Still open

- Parts and pages: together, tabs, or separate sections (decided after seeing the new flow).
- Details of the owner's review screen for reports (a simple list is enough to start).
