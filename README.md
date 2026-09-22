# Flow Builder

A flow chart editor built with Vue 3, Vue Flow and TanStack Query. Nodes load from a payload API,
render on a draggable canvas, and are edited through a details drawer that lives at its own URL.

## Run it

With Docker, nothing else needed:

```bash
docker compose up                  # dev server with HMR, http://localhost:5173
docker compose --profile prod up   # production build on nginx, http://localhost:8080
```

With Node 22 or newer, see `.nvmrc`:

```bash
cp .env.example .env               # set PAYLOAD_ORIGIN and PAYLOAD_PATH
npm install
npm run dev
```

| Script              | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Vite dev server                   |
| `npm run build`     | Production bundle                 |
| `npm test`          | Unit and component tests (Vitest) |
| `npm run test:e2e`  | End to end tests (Playwright)     |
| `npm run lint`      | ESLint, with fixes                |
| `npm run typecheck` | Type check the JSDoc types        |

## Configuration

| Variable                         | What it sets                                         |
| -------------------------------- | ---------------------------------------------------- |
| `VITE_PAYLOAD_URL`               | The path the browser fetches, default `/api/payload` |
| `PAYLOAD_ORIGIN`, `PAYLOAD_PATH` | Where that path is proxied to                        |
| `PAYLOAD_HOST`                   | The `Host` header nginx sends upstream               |

The bucket sends no `Access-Control-Allow-Origin`, so the browser cannot call it directly. The dev
server, `vite preview` and nginx all proxy `/api/payload` to it, which makes the request
same-origin. `VITE_*` values are inlined at build time, so the production image takes
`VITE_PAYLOAD_URL` as a build argument.

## How it fits together

- **`src/domain/nodeMeta.js` is the registry.** Icon, label, accent and whether a node can be
  opened, edited or deleted all live there, so adding a node type is one entry rather than a branch
  in five files.
- **State has three owners.** TanStack Query holds the flow, the URL holds which node is open, and
  Pinia holds the viewport. Form edits live in a local draft until saved, so a refetch cannot
  overwrite typing.
- **The drawer is a nested route**, `/flow/node/:id`, so there is no open flag and the canvas never
  unmounts.
- **Mutations are optimistic**, sharing one factory that cancels in-flight queries, snapshots the
  cache and restores the snapshot on failure.
- **The keyboard reaches everything.** Arrows walk the nodes in reading order,
  Ctrl+Z undoes, and `?` opens the shortcut reference. `domain/shortcuts.js` is the one list, read
  by both the dialog and the tooltips.
- **Light and dark** follow the system until you choose otherwise. Colours are tokens that Vue Flow
  and the date picker read too, so neither ships a second palette.
- **Nodes can be connected** by dragging from one to another, which sets the target's `parentId`.
  Beyond the brief, which specifies only the three create fields. The payload gives a node one
  parent, so connecting moves it rather than adding a second link.
- **`layoutTree` places the nodes**: leaves take a left-to-right cursor, parents centre over their
  children, depth maps to `y`. Dragged positions persist and win over it.

## The payload

- Ids are mixed types: the trigger is the number `1`, the rest are hex strings. They are normalised
  to strings at the adapter.
- Edges come from `parentId` alone. `data.connectors` repeats the same relationship.
- `businessHours` in the create form is a `dateTime` node whose `data.action` is `businessHours`.

## Mock backend

There is no write API. `src/api/flowApi.js` seeds from the payload, applies mutations in memory and
persists to `localStorage`, so edits survive a reload. Writes carry a small simulated latency, which
is what makes an optimistic update and its rollback visible. Attachments are read as data URLs and
capped at 2 MB, since there is no upload endpoint.

The brief's Query config is used as given, with one correction: `degaultOptions` is a typo for
`defaultOptions`.

## Tests

| Level      | Count | Covers                                                                                               |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------- |
| Unit       | 95    | Domain logic, composables, stores, components                                                        |
| End to end | 28    | Rendering, drag, zoom, connect, deep links, create, edit, delete, keyboard, undo, theme, affordances |

Vue Flow measures real DOM that happy-dom cannot provide, so component tests stub it and Playwright
covers the canvas. CI runs lint, typecheck, unit tests and the build in one job, Playwright in
another against the production build.

## Structure

```
src/
  domain/        Pure logic: constants, registry, adapter, layout, validation, time,
                 shortcuts, platform. No Vue imports
  api/           Mock backend, query keys, query client config
  composables/   Query, mutations, drafts, uploads, keyboard, history, theme, help
  stores/        Pinia: canvas viewport, undo history, theme preference
  components/    canvas/, drawer/, drawer/bodies/, ui/
  views/         FlowView
  router/        Routes, including the nested drawer route
e2e/             Playwright specs
```

Requirements are in [plan.md](plan.md), the ticket breakdown in
[task-chunks.md](task-chunks.md), and security notes in [SECURITY.md](SECURITY.md).

## Deployment

The build is a static SPA, so a host needs two rules: fall back to `index.html` for client routes,
and proxy `/api/payload`. `docker/nginx.conf.template` does both, and `vercel.json` carries the
rewrite for Vercel.

Vercel reads `vercel.json` before the build, so its rewrite cannot come from `.env` the way the dev
server and nginx do. Change the payload source in both places, or the deployed app keeps fetching
the old one.

## Known limits

- Created nodes are standalone; the brief's create form has no parent field.
- The mock backend is per browser, so two tabs do not see each other's edits.
- The app needs the payload API to be reachable; there is no offline mode.
