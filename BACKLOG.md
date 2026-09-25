# Backlog

## Why Flow, when draw.io is free

draw.io is excellent at drawing. It is not why diagrams go wrong. Diagrams go wrong because they
**rot**: someone draws the architecture once, the code moves on, and the picture quietly becomes a
lie. That happens because a draw.io file is an XML blob that nobody can review in a pull request,
and redrawing it by hand is a chore nobody schedules.

The text tools (Mermaid, D2, PlantUML) fix the review problem but lose the canvas: you cannot drag
a box where you want it, and the layout is whatever the engine decides.

**Flow is diagrams that live next to your code.** It is for software engineers, and it bets on
four things together, which no free tool does today:

1. **Text and canvas, both ways.** Every diagram is readable text. Edit the text and the canvas
   follows; drag on the canvas and the text follows. Your manual layout survives text edits.
2. **Git native.** Files diff line by line, a CLI renders them to SVG with no browser, and a GitHub
   Action posts a visual before and after on every pull request that changes a diagram.
3. **Generated from what you already have.** Import `docker-compose.yml`, an OpenAPI spec or SQL
   DDL, and re-import after it changes without losing the layout you gave it.
4. **Local first.** No account, no server, works offline, keyboard first, and shareable as a link
   that carries the whole diagram.

What Flow does **not** try to do: beat draw.io at shape count, whiteboarding, or diagrams for
non-engineers. Staying narrow is the point.

**How we will know.** Ship milestones 1 and 2, post them where engineers talk about diagrams, and
watch two numbers: how many people import a real file, and how many come back within a week. If
nobody imports, the wedge is wrong and the plan changes before milestone 3.

## How we work

One ticket, one branch, one pull request, merged when CI is green. Tickets carry on from the
original build (FL-00 to FL-36, in the git history).

**Status:** ✅ done · 🚧 in progress · ⏭️ next · ⬜ not started

## Milestone 0: Own the codebase ✅

| Ticket | What                                                                     | Status |
| ------ | ------------------------------------------------------------------------ | ------ |
| FL-37  | Remove the payload dependency: bundled starter, no proxies, no config    | ✅     |
| FL-38  | Product README and backlog                                               | ✅     |
| FL-39  | Rename to Flow, `flow:` storage keys, one time migration of the old ones | ✅     |

## Milestone 1: A real diagram model

The app still stores a bare array of chat-bot nodes whose one edge comes from `parentId`. Nothing
in milestone 2 is possible until diagrams are nodes and edges.

### FL-40 · Document model v2 ⏭️

- `{ version: 2, title, nodes: [], edges: [] }` with explicit edges
  `{ id, source, target, label? }`
- A pure `migrate()` in `src/domain/` lifts a v1 array into v2, including what is already saved
- `graph.js` builds from `edges`; deleting a node deletes its edges, nothing is re-parented
- Any number of incoming and outgoing edges; self loops and exact duplicates are refused
- Connecting adds an edge instead of moving the target

**Done when** a saved v1 document opens unchanged, and two nodes can both point at a third.

### FL-41 · General shapes ⬜

- Registry entries for process (rectangle), terminal (rounded), decision (diamond), data
  (parallelogram), database (cylinder), document, note, and text
- One card component draws any shape as an SVG outline with a label and an optional description
- The chat-bot types migrate onto shapes so nothing drawn is lost; their drawer bodies, the
  business hours logic and `@vuepic/vue-datepicker` are removed

### FL-42 · New diagram, blank canvas and samples ⬜

- "Reset flow" becomes "New diagram", which starts empty with a hint
- The old support flow and a small architecture diagram become samples

### FL-43 · Shape palette ⬜

A left sidebar lists every shape; drag one onto the canvas to create it where it lands, or click to
add it at the centre. Replaces the create dialog.

## Milestone 2: The wedge

### FL-44 · The `.flow` text format ⬜

- A small line based format: one node or edge per line, stable order, so a diff shows exactly
  what changed
- `parse()` and `serialise()` in `src/domain/`, round trip exact, errors with line numbers
- Layout is kept apart from meaning: positions live in a block at the end, so moving a box never
  touches the lines that describe the system

### FL-45 · Two way text editor ⬜

A split pane: text on the left, canvas on the right. Typing re-renders the canvas as you type,
keeping every position it can; editing the canvas rewrites the text. Parse errors are shown on the
line, and the canvas keeps the last good diagram.

### FL-46 · Mermaid import and export ⬜

Flowchart subset: nodes, shapes, labelled edges, direction. Paste Mermaid, get an editable diagram;
export any diagram as Mermaid to drop into a README.

### FL-47 · Import `docker-compose.yml` ⬜

Services become nodes, `depends_on` and shared networks become edges, ports and images become
descriptions. Re-importing updates the diagram and keeps the layout.

### FL-48 · Import OpenAPI ⬜

Tags or path groups become nodes, schemas referenced between them become edges.

### FL-49 · Import SQL DDL as an entity diagram ⬜

`CREATE TABLE` becomes a table node listing its columns; foreign keys become edges.

### FL-50 · Share as a link ⬜

The whole diagram compressed into the URL hash. Opening the link opens a copy; nothing touches a
server.

## Milestone 3: Git native

### FL-51 · Open and save files ⬜

Open a `.flow` file from disk and save back to it (File System Access API, with download and upload
as the fallback), so a diagram lives in a repository rather than in the browser.

### FL-52 · Render without a browser ⬜

A pure SVG renderer in `src/domain/`, and `npx flow render diagram.flow -o diagram.svg`, so CI and
docs sites can build images.

### FL-53 · Visual diff ⬜

Compare two versions of a diagram: added, removed and changed nodes and edges highlighted, on the
canvas and as an SVG.

### FL-54 · GitHub Action ⬜

On a pull request that changes a `.flow` file, post the before and after as a comment.

## Milestone 4: Editing essentials

| Ticket | What                                                                     | Status |
| ------ | ------------------------------------------------------------------------ | ------ |
| FL-55  | Multi-select: box, Shift+click, Ctrl+A; move and delete as one undo step | ⬜     |
| FL-56  | Inline text editing on double-click, for shapes and edge labels          | ⬜     |
| FL-57  | Resize shapes, stored on the node                                        | ⬜     |
| FL-58  | Connectors: four sides, straight, orthogonal or curved, arrows, dashes   | ⬜     |
| FL-59  | Copy, cut, paste and duplicate, with the edges between copied shapes     | ⬜     |
| FL-60  | Grid, snapping, align and distribute                                     | ⬜     |
| FL-61  | Automatic layout for any graph, not only trees                           | ⬜     |
| FL-62  | Export PNG and SVG from the app                                          | ⬜     |

## Later, if the wedge holds

- Many documents with a home page, and IndexedDB storage
- `.drawio` import, so people can bring what they already have
- Terraform and Kubernetes import
- Describe a diagram in words and get one, built on the text format
- A backend, accounts and live collaboration
