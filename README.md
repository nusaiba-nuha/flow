<div align="center">

# Flow

**Diagrams that live next to your code.**

An open source diagram editor for software engineers: edit on a canvas or as text, keep diagrams
in git where they can be reviewed, and generate them from the files you already have.

[Backlog](BACKLOG.md) · [Security](SECURITY.md) · [Agent rules](AGENTS.md)

[![CI](https://github.com/raj-khan/flow/actions/workflows/ci.yml/badge.svg)](https://github.com/raj-khan/flow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff5a2c.svg)](LICENSE)

https://github.com/user-attachments/assets/cbfbc844-7373-4891-a985-50e2870fe1b5

</div>

## Why not just draw.io?

draw.io is free and great at drawing. The problem it does not solve is that architecture diagrams
**rot**: a `.drawio` file is an XML blob nobody reviews, so the picture drifts from the code until
it is wrong. Text tools like Mermaid fix the review problem but take away the canvas.

Flow aims at the gap between them:

- **Text and canvas, both ways.** Edit either; the other follows, and your layout survives.
- **Git native.** Line based files that diff cleanly, SVG rendering from the command line, and a
  visual diff on pull requests.
- **Generated from real files.** `docker-compose.yml`, OpenAPI and SQL DDL, with
  re-import that keeps your layout.
- **Local first.** No account, no server, works offline, shareable as a link.

The full reasoning, and how we will know if it is working, is at the top of the
[backlog](BACKLOG.md).

> **Status: early.** Flow started as a flow chart exercise. The canvas, editing, undo and local
> persistence below work today; the diagram model, text format and importers are being built now.

## What works today

- **Canvas.** Pan, zoom and drag nodes on a Vue Flow canvas. Dragged positions are kept.
- **Create, edit, delete.** Every change updates the canvas immediately and rolls back if it fails.
- **Connections.** Drag from one node to another to connect them; remove a connection from the
  control on the edge.
- **Undo and redo** for every change, from the toolbar or `Ctrl+Z` / `Ctrl+Shift+Z`.
- **Deep links.** Each node's details open at `/flow/node/:id`, so a node can be linked to.
- **Keyboard first.** Arrow keys walk the nodes, Enter opens one, `?` lists every shortcut.
- **Automatic layout** for anything you have not placed by hand.
- **Light and dark themes**, following the system until you choose.
- **Saved locally.** Edits are kept in `localStorage` and survive a reload.
- **Works offline.** The starter diagram is bundled, so the app makes no network requests.

## Where it is going

| Milestone               | Highlights                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| 1. A real diagram model | Nodes and edges, general shapes, new diagram, shape palette         |
| 2. The wedge            | `.flow` text format, two way editor, Mermaid, compose, OpenAPI, SQL |
| 3. Git native           | Open and save files, CLI rendering, visual diff, GitHub Action      |
| 4. Editing essentials   | Multi-select, inline text, resize, connectors, clipboard, export    |

Every ticket, with what "done" means, is in [BACKLOG.md](BACKLOG.md).

## Quick start

### Node

Node 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. There is nothing to configure.

### Docker

```bash
docker compose up                   # dev server on http://localhost:5173
docker compose --profile prod up    # production build on http://localhost:8080
```

## Scripts

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Vite dev server                   |
| `npm run build`     | Production bundle                 |
| `npm test`          | Unit and component tests (Vitest) |
| `npm run test:e2e`  | End to end tests (Playwright)     |
| `npm run lint`      | ESLint, with fixes                |
| `npm run typecheck` | Type check the JSDoc types        |

## Stack

Vue 3, [Vue Flow](https://vueflow.dev), TanStack Query, Pinia, Vue Router, Tailwind CSS, Vite.
Plain JavaScript with JSDoc types checked by `vue-tsc` in strict mode.

## How it fits together

```text
src/
  domain/        Pure logic, no Vue imports: node registry, graph, layout,
                 validation, shortcuts, formatting
  api/           The storage backend, the bundled starter diagram, query keys
  composables/   Queries, optimistic mutations, drafts, keyboard, history, theme
  stores/        Pinia: viewport, undo history, theme, toasts
  components/    canvas/, drawer/, ui/
  views/         FlowView
  router/        Routes, including the nested node route
e2e/             Playwright specs
```

**The node registry.** `src/domain/nodeMeta.js` holds everything that differs by node type: icon,
label, accent, and whether a node can be opened, edited or deleted. Adding a type is one entry,
not a branch in five components.

**State has three owners.** TanStack Query owns the document. The URL owns which node is open.
Pinia owns the viewport, undo history, theme and toasts. Nothing is copied from one to another, and
form edits live in a local draft until saved, so a refetch cannot overwrite typing.

**Storage is behind an API-shaped module.** `src/api/flowApi.js` is the only code that touches
persistence. Today it seeds from `src/api/starterDiagram.json` and saves to `localStorage`; it is
async and shaped like a REST client so a real backend can replace it without touching a component.
Writes carry a small simulated latency so optimistic updates and rollbacks stay honest.

**Optimistic mutations** share one factory: cancel in-flight queries, snapshot the cache, apply the
change, restore the snapshot on failure, then invalidate.

**Layout.** `layoutTree` gives unplaced nodes a tidy top-down tree; anything dragged keeps its
position. `nextFreePosition` stops a new node landing on an existing one.

**Keyboard.** `src/domain/shortcuts.js` is the single source for shortcuts, read by both the
handlers and the help dialog, so a tooltip cannot disagree with the binding. Canvas navigation
stands down while a dialog is open or a field has focus.

**Theme.** Colours are CSS tokens that Vue Flow and every component read, and the interface
respects `prefers-reduced-motion`.

## Tests

| Level      | Covers                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Unit       | Domain logic, storage, composables, stores, components                 |
| End to end | Rendering, drag, zoom, connect, deep links, create, edit, delete, undo |

happy-dom has no layout, so the canvas is covered by Playwright rather than mocked. Playwright
needs its browser once:

```bash
npx playwright install chromium
```

`npm run test:e2e` builds and serves the app itself. It reuses a `vite preview` already on port
4173, so stop one first or it tests the previous build.

CI runs lint, typecheck, unit tests and the build in one job, and Playwright against the
production build in another.

## Deployment

The build is a static single page app, so any static host works as long as unknown paths fall back
to `index.html`. `docker/nginx.conf` does that for the container and `vercel.json` for Vercel.

## Known limits

- One document per browser, and a node has a single incoming connection. The second goes in
  [FL-40](BACKLOG.md).
- Node types are still the ones the project started with: Send Message, Add Comment and Business
  Hours. General shapes are [FL-41](BACKLOG.md).
- Storage is per browser, so two tabs do not see each other's edits and nothing syncs between
  devices.
- Attachments are stored as data URLs and capped at 2 MB.
- Undo history is in memory; the edits themselves survive a reload, the history does not.

## Contributing

Pick a ticket from [BACKLOG.md](BACKLOG.md), branch, and open a pull request against `main`.
[AGENTS.md](AGENTS.md) holds the rules the code cannot tell you, for people and AI agents alike;
`CLAUDE.md` points at it. A pre-commit hook scans staged changes for credentials.

## License

[MIT](LICENSE)
