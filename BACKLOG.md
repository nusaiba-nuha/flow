# Backlog

Flow is becoming a general purpose diagram editor in the spirit of draw.io: shapes, connectors,
many documents, import and export, and eventually a backend and live collaboration.

One ticket, one branch, one pull request. Tickets carry on from the original build, which ran
FL-00 to FL-36 and is in the git history.

**Status:** ✅ done · 🚧 in progress · ⏭️ next · ⬜ not started

## Milestone 1: Make it a product

The app still thinks like the assessment it came from: a single chat-bot flow, loaded from a
remote payload, with node types like Send Message and Business Hours. This milestone makes it a
standalone diagram tool with its own document format.

### FL-37 · Remove the payload dependency ✅

- Bundle the starter diagram in `src/api/starterDiagram.json` instead of fetching it
- Delete `VITE_PAYLOAD_URL`, `PAYLOAD_*`, `.env.example` and every proxy: Vite, nginx, Vercel
- Version the storage key, `flow-builder:document:v1`
- Tests seed from the bundle, not a stubbed `fetch`

**Done when** the app, the tests and the container run with no network and no configuration.

### FL-38 · Product README and backlog ✅

- Rewrite the README for the product, not the assessment
- Replace `plan.md` and `task-chunks.md` with this file

### FL-39 · Rename to Flow ⏭️

- One product name everywhere: page title, header, help dialog, `package.json`
- Storage keys under a `flow:` prefix, migrating the `flow-builder:` ones once

### FL-40 · Document model v2 ⬜

The stored shape is still a bare array of nodes whose edges come from `parentId`, so a node can
have one incoming connection. Diagrams need any number, in either direction.

- `{ version: 2, id, title, nodes: [], edges: [] }` with explicit edges `{ id, source, target, sourceHandle, targetHandle, label }`
- A pure `migrate(document)` in `src/domain/` that lifts a v1 array into v2
- `graph.js` builds from `edges`; deleting a node deletes its edges, nothing is re-parented
- `canConnect` drops the single parent and loop rules; self loops and duplicates stay refused

**Done when** a v1 document from `localStorage` opens unchanged as v2, and two nodes can both
point at a third.

### FL-41 · General shapes replace the chat-bot node types ⬜

- `nodeMeta` entries for: rectangle, rounded rectangle, ellipse, diamond, parallelogram,
  cylinder, document, text, sticky note
- Each shape is an SVG outline plus a text label, sized by the node rather than fixed
- Retire Trigger, Send Message, Business Hours, Branch and Add Comment, with a migration that maps
  them onto shapes so nothing already drawn is lost
- Drop `@vuepic/vue-datepicker` once nothing uses it

### FL-42 · Blank canvas and templates ⬜

- A new document starts empty, with a hint to drag a shape in
- Templates: basic flowchart, swimlane process, org chart, and the old support flow as a sample
- "Reset flow" becomes "New diagram"

### FL-43 · Shape palette ⬜

- Left sidebar listing every shape from the registry, grouped, with a search box
- Drag a shape onto the canvas to create it where it is dropped; click to add it at the centre
- Replaces the create dialog

### FL-44 · Format panel ⬜

- The drawer becomes a right-hand panel for the selection: fill, stroke colour, stroke width,
  dash, corner radius, opacity, font size, text alignment
- Works on several selected shapes at once
- Values come from theme tokens so a diagram reads in both themes

## Milestone 2: Editing essentials

### FL-45 · Multi-select ⬜

Box select, Shift+click, Ctrl+A; move and delete a selection as one undoable step.

### FL-46 · Inline text editing ⬜

Double-click a shape or an edge label to edit it in place. Enter commits, Escape cancels.

### FL-47 · Resize and rotate ⬜

Vue Flow's `NodeResizer` on the selected shape, with Shift to keep the aspect ratio. Size is stored
on the node.

### FL-48 · Connectors ⬜

- Handles on all four sides; drop on a shape's body to take the nearest side
- Edge type per edge: straight, orthogonal, curved
- Arrowheads at either end, dashed lines, labels
- Reconnect an edge by dragging its end

### FL-49 · Clipboard ⬜

Copy, cut, paste and duplicate (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+D`), including the edges
between the copied shapes. Pasting offsets so the copy is visible.

### FL-50 · Grid, snapping and alignment ⬜

- Toggleable grid and snap to grid
- Smart guides while dragging
- Align and distribute for a selection

### FL-51 · Z-order and grouping ⬜

Bring forward, send backward, to front, to back. Group and ungroup; containers that move their
children.

## Milestone 3: Files

### FL-52 · Many documents ⬜

- A home page listing documents, with create, rename, duplicate and delete
- Each document at `/d/:documentId`, the node drawer at `/d/:documentId/node/:nodeId`
- `flowApi` keyed by document id

### FL-53 · Import and export JSON ⬜

Download a document as `.flow.json`; open one by file picker or by dropping it on the page.
Validate on the way in and say what was wrong.

### FL-54 · Export images ⬜

PNG and SVG of the whole diagram or the selection, with a transparent background option.

### FL-55 · draw.io interoperability ⬜

Import and export the `.drawio` XML format for the shapes and edges Flow supports, and say which
parts of a file were skipped.

### FL-56 · IndexedDB storage ⬜

Move documents and attachments out of `localStorage`, which caps at about 5 MB, into IndexedDB.
Migrate what is already saved.

## Milestone 4: Canvas at scale

### FL-57 · Minimap and zoom to selection ⬜

### FL-58 · Automatic layout for graphs ⬜

`layoutTree` only handles trees. Use ELK or dagre for arbitrary graphs, top-down or left-right,
applied as one undoable step.

### FL-59 · Pages ⬜

Several pages in one document, as tabs along the bottom.

### FL-60 · Performance budget ⬜

A 1,000 shape document stays at 60 fps while panning. A Playwright benchmark guards it in CI.

## Milestone 5: Backend and collaboration

### FL-61 · API ⬜

A NestJS service on PostgreSQL behind an OpenAPI contract. `src/api/flowApi.js` gets a second
implementation that calls it, chosen by configuration.

### FL-62 · Accounts ⬜

Sign in, and documents owned by a user.

### FL-63 · Share links ⬜

View-only and edit links per document.

### FL-64 · Real-time collaboration ⬜

Yjs for concurrent edits, with presence: other people's cursors and selections.

### FL-65 · Version history ⬜

Named versions and restore, on the server.

## Later

- Comments pinned to shapes
- Mermaid import
- Offline support as a PWA
- Custom shape libraries
- Accessibility audit with a screen reader
