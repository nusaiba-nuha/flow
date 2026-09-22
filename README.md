# Flow Builder

A flow chart editor built with Vue 3, Vue Flow and TanStack Query. Nodes load from a payload API,
render on a draggable canvas, and are edited through a details drawer that lives at its own URL.

## Run it

**With Docker** (nothing else needed):

```bash
docker compose up                  # dev server with HMR, http://localhost:5173
docker compose --profile prod up   # production build on nginx, http://localhost:8080
```

**With Node** (22 or newer, see `.nvmrc`):

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

## Why JavaScript and not TypeScript

The brief specifies JavaScript/ES6, so every file is `.js` or `.vue`. Type safety comes from JSDoc
typedefs plus `checkJs` and `strict` in `jsconfig.json`, enforced by `npm run typecheck` and in CI.
Enums are frozen constant maps, since ES6 has none.

## Design

### The node type registry

`src/domain/nodeMeta.js` holds every per-type difference: icon, label, accent, whether a node can be
opened, edited or deleted, and how it summarises itself on the canvas. Components read the registry
instead of branching on type, so adding a node type is one entry, not a new branch in five files.

The brief's rule that success and failure connectors are display only lives there as
`openable: false`, not as an `if` listing node ids.

### State boundary

Three owners, no copies, so there is no synchronisation code and no way for two copies to disagree.

| State                    | Owner          | Why                                                     |
| ------------------------ | -------------- | ------------------------------------------------------- |
| The flow                 | TanStack Query | Server state: fetched, cached, mutated, invalidated     |
| Which node is open       | The URL        | Deep links, back and forward, and refresh work for free |
| Viewport, focus requests | Pinia          | No server counterpart                                   |
| In-progress form edits   | A local draft  | A background refetch must not overwrite typing          |

### The drawer is a route

`/flow/node/:id` renders the drawer as a nested route, so there is no `isDrawerOpen` flag anywhere.
The canvas never unmounts, which is what makes opening a node instant.

### Optimistic mutations

Create, update, delete and move share one factory in `useNodeMutations.js`. Each cancels in-flight
queries first (a refetch landing after an optimistic write would silently undo it), snapshots the
cache, applies the change, and restores the whole snapshot on failure. One rollback path, so all
four fail identically.

`useMoveNode` skips the invalidate on purpose: refetching after a drag snaps the node back to the
server position for a frame.

### Layout

`layoutTree` is a hand written tidy tree: leaves consume a left-to-right cursor, a parent is centred
between its outermost children, depth maps to `y`. Dagre would have worked, but the flow is a tree,
the rule is short, and a pure function is easier to test. Dragged positions persist and win over the
computed layout.

## What the payload forced

- **Ids are mixed types.** The trigger is the number `1`, everything else is a hex string. Route
  params are always strings, so ids are normalised once at the adapter boundary.
- **`data.connectors` is redundant** with the connector nodes' own `parentId`. Edges come from
  `parentId` alone, because two sources of truth can disagree.
- **Form labels are not payload types.** `businessHours` is a `dateTime` node whose `data.action`
  is `businessHours`. That mapping lives in one place.

## Where the flow is loaded from, and CORS

The app fetches `/api/payload`, a same-origin path. That path is proxied to the real bucket by the
dev server, by `vite preview`, and by nginx in the production image, all reading the same variables:

```bash
PAYLOAD_ORIGIN=https://example.s3.ap-southeast-1.amazonaws.com
PAYLOAD_PATH=/candidate-assessments/payload.json
```

The proxy is not a convenience. The bucket sends no `Access-Control-Allow-Origin`, so a browser
refuses the response before the app sees it, while curl and the server-side fetch are unaffected.
Proxying makes the request same-origin, which is the fix a production team would reach for rather
than committing a copy of someone else's API response.

`VITE_PAYLOAD_URL` overrides the path the browser asks for. Vite inlines `VITE_*` at build time, so
the production image takes it as a build argument. The saved flow is keyed by its source, so
switching sources will not serve you the previous one's copy.

## Mock backend

There is no write API, so `src/api/flowApi.js` stands in for one: it seeds from the payload, applies
mutations in memory, and persists to `localStorage` so edits survive a reload. Writes carry a small
simulated latency, which is what makes the optimistic update and its rollback visible; reads do not.

There is no upload endpoint either, so a picked image is read as a data URL and stored inline,
capped at 2 MB. Swapping in a real upload means replacing one function.

The brief's Query config is used as given, with one correction: `degaultOptions` is a typo for
`defaultOptions`.

## Creating nodes, and what the brief does not ask for

The brief specifies the create form as exactly three fields: Title, Description, Type of Node. It
says nothing about connecting a node into the flow. So a created node lands below the existing flow,
unconnected, and the form says so rather than leaving it a surprise. Adding a parent picker would
have meant inventing a requirement.

Creating a Business Hours node **does** create its Success and Failure connectors, because a
`dateTime` node always branches in this payload. Deleting a node takes its connectors with it and
re-parents any other children upward rather than cascading. That rule is one pure function,
`withNodeRemoved`, used by both the mock backend and the optimistic update, so the two cannot
disagree.

## Time zones

A **new** Business Hours node starts in your browser's zone. An existing one keeps its own, and the
drawer says how far that is from yours. Rewriting a stored zone to match whoever opened the editor
would change a company's opening hours by the act of looking at them.

Times accept typed entry (`09:30` or `9:30`, with Enter or Tab) as well as the picker overlay.

## Custom implementation

No code here is copied from another project, including Vue Flow's own examples: 2,736 lines of
hand-written source across `domain`, `api`, `composables`, `stores`, `components` and `views`.

Seven runtime dependencies, each named in the brief or explicitly allowed by it:

| Dependency                                          | Why                                      |
| --------------------------------------------------- | ---------------------------------------- |
| `vue`, `vue-router`, `pinia`, `@tanstack/vue-query` | Named in the brief                       |
| `@vue-flow/core`, `@vue-flow/background`            | Named in the brief                       |
| `@vuepic/vue-datepicker`                            | The brief says to use a Date Time Picker |

Tailwind is the only styling dependency and no component library is used, so every control here is
ours. Where a package would have been the shortcut:

| Problem                   | The usual package      | What is here instead                                         |
| ------------------------- | ---------------------- | ------------------------------------------------------------ |
| Laying the tree out       | `dagre` or `elkjs`     | `layoutTree`, a tidy tree in ~60 lines, pure and unit tested |
| Modal with a focus trap   | Headless UI, Radix Vue | `BaseModal`, including focus restore and Tab wrapping        |
| Form state and validation | VeeValidate, Zod       | `useDraft` plus composable validators                        |
| Stable list keys          | `uuid`, `nanoid`       | `useStableKeys`, identity in a `WeakMap`                     |
| Icons                     | An icon package        | Inline SVG paths in `NodeIcon`                               |
| Mocking the API           | MSW, json-server       | `api/flowApi.js`, an in-memory store                         |

## Tests

| Level      | Count | Covers                                            |
| ---------- | ----- | ------------------------------------------------- |
| Unit       | 72    | Domain logic, composables, components             |
| End to end | 10    | Rendering, drag, deep links, create, edit, delete |

Vue Flow measures real DOM that happy-dom cannot provide, so component tests stub it and Playwright
covers the canvas itself. Rollback paths are tested, not just happy paths. CI runs lint, typecheck,
unit tests and the build in one job, and Playwright in another against the production build.

## Deployment

The build is a static SPA, so the host needs two rules: fall back to `index.html` for client routes,
and proxy `/api/payload`. `docker/nginx.conf.template` does both. Anywhere else, including Vercel,
needs its own equivalent, because both are properties of the host rather than of the app.

## Structure

```
src/
  domain/        Pure logic: constants, registry, adapter, layout, validation, time.
                 No Vue imports
  api/           Mock backend, query keys, query client config
  composables/   Query, mutations, drafts, uploads, list keys
  stores/        Pinia: canvas viewport
  components/    canvas/, drawer/, drawer/bodies/, ui/
  views/         FlowView, a composition surface
  router/        Routes, including the nested drawer route
e2e/             Playwright specs
```

## Documents

| File                               | What it is                                                    |
| ---------------------------------- | ------------------------------------------------------------- |
| [`plan.md`](plan.md)               | The requirements, written out in my own words before any code |
| [`task-chunks.md`](task-chunks.md) | The ticket breakdown, one branch and one PR each              |
| [`BACKLOG.md`](BACKLOG.md)         | Done, next, and what is deliberately left out                 |
| [`SECURITY.md`](SECURITY.md)       | Threat model, untrusted input, CORS, headers                  |

## Known limits

- Created nodes are standalone. Connecting them is the first thing I would add.
- The mock backend is per browser, so two tabs do not see each other's edits.
- Attachments are stored inline as data URLs, which is why the 2 MB cap exists.
- No offline mode: the app depends on the payload API being reachable.
