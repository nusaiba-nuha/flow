<div align="center">

# Flow Builder

**A flow chart editor built with Vue 3, Vue Flow, and TanStack Query.**

Nodes load from a payload API, render on a draggable canvas, and are edited through a details drawer that lives at its own URL.

[Requirements](plan.md) · [Task breakdown](task-chunks.md) · [Security](SECURITY.md)

[![CI](https://img.shields.io/badge/CI-passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff5a2c.svg)](LICENSE)

https://github.com/user-attachments/assets/99048de2-753a-4d37-9012-1011bc2347ea


</div>

## What it does

* **Draggable canvas.** Nodes render on a Vue Flow canvas and can be repositioned.
* **Node details drawer.** Nodes open through a nested route, `/flow/node/:id`, so the canvas stays mounted while a node is being edited.
* **Optimistic mutations.** Create, edit, delete and move operations update the UI immediately and roll back on failure.
* **Keyboard navigation.** Arrow keys walk the nodes in reading order, `Ctrl+Z` undoes changes, and `?` opens the shortcut reference.
* **Automatic layout.** `layoutTree` places nodes based on their relationships and depth while preserving manually dragged positions.
* **Light and dark themes.** The interface follows the system preference until explicitly changed.
* **Local persistence.** The mock backend persists changes to `localStorage`, so edits survive a reload.
* **Attachments.** Attachments are read as data URLs and capped at 2 MB because there is no upload endpoint.

| Flow canvas                                                                         | Node details                                                                                | Keyboard shortcuts                                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| <img src="docs/screenshots/canvas.webp" alt="Flow Builder flow canvas" width="280"> | <img src="docs/screenshots/drawer.webp" alt="Flow Builder node details drawer" width="280"> | <img src="docs/screenshots/shortcuts.webp" alt="Flow Builder keyboard shortcuts" width="280"> |

## Quick start

### Docker

With Docker, nothing else is needed:

```bash
docker compose up
```

Open http://localhost:5173.

For the production build:

```bash
docker compose --profile prod up
```

Open http://localhost:8080.

### Node

Node 22 or newer is required.

```bash
cp .env.example .env
npm install
npm run dev
```

## Configuration

| Variable           | What it sets                                         |
| ------------------ | ---------------------------------------------------- |
| `VITE_PAYLOAD_URL` | The path the browser fetches, default `/api/payload` |
| `PAYLOAD_ORIGIN`   | Where that path is proxied to                        |
| `PAYLOAD_PATH`     | The upstream payload path                            |
| `PAYLOAD_HOST`     | The `Host` header nginx sends upstream               |

The bucket sends no `Access-Control-Allow-Origin`, so the browser cannot call it directly.

The dev server, `vite preview` and nginx all proxy `/api/payload` to it, which makes the request same-origin.

`VITE_*` values are inlined at build time, so the production image takes `VITE_PAYLOAD_URL` as a build argument.

## How it fits together

### Domain

**`src/domain/nodeMeta.js` is the registry.**

Icon, label, accent and whether a node can be opened, edited or deleted all live there, so adding a node type is one entry rather than a branch in five files.

The domain layer also contains the payload adapter, tree layout, validation, time utilities, keyboard shortcuts and other pure logic.

### State

State has three owners:

* **TanStack Query** holds the flow.
* **The URL** holds which node is open.
* **Pinia** holds the viewport.

Form edits live in a local draft until saved, so a refetch cannot overwrite typing.

### Routing

The drawer is a nested route:

```text
/flow/node/:id
```

There is no open flag and the canvas never unmounts.

### Mutations

Mutations use one shared factory:

1. Cancel in-flight queries.
2. Snapshot the cache.
3. Apply the change optimistically.
4. Restore the snapshot on failure.
5. Invalidate the relevant query.

`useMoveNode` skips the invalidate because the movement is already reflected in the cache.

### Layout

`layoutTree` places the nodes:

* Leaves take a left-to-right cursor.
* Parents centre over their children.
* Depth maps to `y`.
* Cycles are guarded.
* Orphans are placed.
* Connectors are anchored to the positioned parent.

Dragged positions persist and win over the automatic layout.

`nextFreePosition` is used when creating a node so that it does not overlap an existing node.

### Keyboard

`domain/shortcuts.js` is the single source for keyboard shortcuts.

It is used by both the shortcut dialog and tooltips.

Keyboard navigation includes:

* Arrow keys
* Home / End
* Enter / Space
* Escape
* `Ctrl+Z` / `Cmd+Z`
* `?` for the shortcut reference

Dialogs and form fields stand down while keyboard navigation is active.

### Theme

Light and dark follow the system until explicitly changed.

Colours are tokens that Vue Flow and the date picker read too, so neither ships a second palette.

The interface also respects `prefers-reduced-motion`.

## The payload

The payload has a few details that shape the implementation:

* IDs are mixed types: the trigger is the number `1`, while the rest are hex strings.
* IDs are normalised to strings at the adapter.
* Edges come from `parentId` alone.
* `data.connectors` repeats the same relationship.
* `businessHours` in the create form is a `dateTime` node whose `data.action` is `businessHours`.

The adapter keeps these payload-specific details out of the rest of the application.

## Mock backend

There is no write API.

`src/api/flowApi.js` seeds from the payload, applies mutations in memory and persists to `localStorage`, so edits survive a reload.

Writes carry a small simulated latency, which is what makes an optimistic update and its rollback visible.

The mock backend supports:

* Fetch
* Create
* Update
* Delete
* Restore
* Replace

Persistence is keyed by the payload source URL.

Attachments are read as data URLs and capped at 2 MB, since there is no upload endpoint.

## Scripts

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Vite dev server                   |
| `npm run build`     | Production bundle                 |
| `npm test`          | Unit and component tests (Vitest) |
| `npm run test:e2e`  | End to end tests (Playwright)     |
| `npm run lint`      | ESLint, with fixes                |
| `npm run typecheck` | Type check the JSDoc types        |

## Tests

| Level      | Count | Covers                                                                                      |
| ---------- | ----- | ------------------------------------------------------------------------------------------- |
| Unit       | 89    | Domain logic, composables, stores, components                                               |
| End to end | 25    | Rendering, drag, zoom, deep links, create, edit, delete, keyboard, undo, theme, affordances |

Vue Flow measures real DOM that happy-dom cannot provide, so component tests stub it and Playwright covers the canvas.

CI runs lint, typecheck, unit tests and the build in one job, with Playwright in another against the production build.

## Structure

```text
src/
  domain/        Pure logic: constants, registry, adapter, layout,
                 validation, time, shortcuts, platform
                 No Vue imports

  api/           Mock backend, query keys, query client config

  composables/   Query, mutations, drafts, uploads, keyboard,
                 history, theme, help

  stores/        Pinia: canvas viewport, undo history, theme preference

  components/    canvas/, drawer/, drawer/bodies/, ui/

  views/         FlowView

  router/        Routes, including the nested drawer route

e2e/             Playwright specs
```

## Documentation

Requirements are in [plan.md](plan.md).

The branch-sized ticket breakdown is in [task-chunks.md](task-chunks.md).

Security notes are in [SECURITY.md](SECURITY.md).

## Deployment

The build is a static SPA, so a host needs two rules:

1. Fall back to `index.html` for client routes.
2. Proxy `/api/payload`.

`docker/nginx.conf.template` does both.

## Known limits

* Created nodes are standalone; the brief's create form has no parent field.
* The mock backend is per browser, so two tabs do not see each other's edits.
* The app needs the payload API to be reachable; there is no offline mode.
* There is no write API; mutations currently run through the local mock backend.
* Attachments are limited to 2 MB and stored as data URLs.
* Connecting nodes is beyond the brief.

## License

Released under the [MIT License](LICENSE).
