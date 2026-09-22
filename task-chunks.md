# Flow Builder: Task broken into branch-sized tickets. One ticket, one branch, one pull request.

# Milestone 1: Foundation

## FL-00 · Requirements and repository

- Write `plan.md` from the assessment brief
- Initialise the repository and push

---

## FL-01 · Scaffold and tooling

- `npm create vite@latest . -- --template vue`, remove the template's sample files
- Install runtime and dev dependencies
- `vite.config.js`: `@` alias, Tailwind plugin, Vitest config
- `jsconfig.json` with `checkJs` and `strict`, excluding tests
- `eslint.config.js`, `.prettierrc.json`
- package scripts: dev, build, test, lint, typecheck
- Add `payload.json` to `public/`

---

## FL-02 · App shell and routing

- `src/style.css`, `src/main.js` with Pinia, Router and Vue Query
- `src/api/queryClient.js` with the brief's config
- Router: `/flow` with a nested `node/:id` child route
- Placeholder `FlowView` and drawer components

---

## FL-03 · Docker

- Multi-stage `Dockerfile`: deps, dev, build, prod on nginx
- `docker/nginx.conf` with `try_files` for deep links
- `docker-compose.yml` with a dev service and a `prod` profile

---

## FL-04 · Continuous integration

- `.github/workflows/ci.yml` with a quality job: lint, typecheck, test, build
- End to end job, filled in at FL-22

---

# Milestone 2: Domain

## FL-05 · Constants and types

- `constants.js`: node types, message parts, connector types, weekdays, geometry
- `types.js`: JSDoc typedefs

---

## FL-06 · Payload to graph adapter

- `toNodeId`, `normaliseNode`, `buildEdges`, `payloadToGraph`, `connectorLabel`
- `withNodeRemoved`: re-parent children, take a dateTime node's connectors with it
- Tests against the real `payload.json`

---

## FL-07 · Tree layout

- `layoutTree`: leaves take a cursor, parents centre over children, depth maps to `y`
- Guard cycles, place orphans
- Anchor connectors to a positioned parent
- `nextFreePosition`

---

## FL-08 · Validators and utilities

- `validators.js`: each returns a message or `null`
- `format.js`: truncation, message part filters, schedule summary

---

## FL-09 · Node type registry

- `nodeMeta.js`: label, icon, accent, `openable`, `editable`, `deletable`, `summary`
- Fallback entry for an unknown type
- `CREATABLE_NODES` with the three form options and their seeds

---

# Milestone 3: Data

## FL-10 · Mock backend

- `flowApi.js`: fetch, create, update, delete, restore, replace
- Payload source from `VITE_PAYLOAD_URL`, defaulting to the local file
- Persist to `localStorage`, keyed by the source URL
- `.env.example`

---

## FL-11 · Flow query

- `useFlowQuery` returning nodes, edges and states
- `useNode(id)` reading from the cache

---

## FL-12 · Optimistic mutations

- One factory: cancel, snapshot, apply, roll back, invalidate
- `useCreateNode`, `useUpdateNode`, `useDeleteNode`, `useMoveNode`, `useRestoreFlow`
- `useMoveNode` skips the invalidate
- Rollback tests before happy path tests

---

# Milestone 4: Canvas

## FL-13 · Node components

- `NodeIcon.vue`, `accents.js`
- `FlowNodeCard.vue` and `BranchPill.vue`
- `nodeComponents.js`

---

## FL-14 · Flow canvas

- Hand nodes over with `setNodes`
- `markRaw` the node-type map
- Click navigates, drag persists on drop
- Viewport in Pinia, `fitView` on `nodes-initialized`
- `CanvasState.vue` for loading, error and empty
- Mock `@vue-flow/core` in component tests

---

# Milestone 5: Drawer

## FL-15 · Draft state and fields

- `useDraft`: draft, dirty, validity, touched, reset
- `TextField.vue` with `useId`, counter and error wiring

---

## FL-16 · Node details drawer

- `NodeDetailsDrawer.vue` reading the node by route param
- `DrawerHeader.vue`, `DrawerFooter.vue` with a two-step delete
- Escape closes, backing out of a confirmation first
- `detailComponents.js` dispatch seam
- The route drives the canvas highlight

---

# Milestone 6: Node type bodies

## FL-17 · Add comment

- `nodeValidation.js`: per-type rules as pure functions
- `AddCommentBody.vue` with `defineModel`

---

## FL-18 · Send message

- `useAttachmentUpload`: images only, 2 MB, data URL
- `AttachmentTile.vue`, `useStableKeys.js`
- Texts and attachments keep their payload index
- Narrow the union with a type predicate

---

## FL-19 · Business hours

- `time.js`: picker conversions, week normalisation, timezone list and labels
- Seven rows, per-row error, typed entry as well as the overlay
- New node starts in the browser's zone, existing node keeps its own
- Stub the picker in tests

---

# Milestone 7: Creating nodes

## FL-20 · Modal and select

- `BaseModal.vue`: labelled, Escape, backdrop, focus trap, focus restore
- `SelectField.vue`

---

## FL-21 · Create node

- `CreateNodeDialog.vue` reusing `useDraft`
- Place with `nextFreePosition`, pan to it, open its drawer
- A created Business Hours node gets its Success and Failure connectors
- Say in the form that the node is created standalone

---

# Milestone 8: Quality

## FL-22 · End to end tests

- Playwright against the production build
- Canvas, drawer, create, affordances
- Add the end to end job to CI

---

## FL-23 · README and documentation

- README: setup, decisions, what the payload forced, limits
- `BACKLOG.md`: done, next, deliberately not doing
- `SECURITY.md`

---

# Milestone 9: The brief's follow-ups

## FL-24 · Keyboard navigation

- `useCanvasKeyboard`: arrows, Home, End, Enter, Space, Escape
- Reading order, skip non-openable nodes, stand down for dialogs and fields
- Readonly state with a `focus(id)` action
- Live region and focus ring

---

## FL-25 · Undo and redo

- `stores/history.js`: whole-flow snapshots with labels, capped
- Record inside the mutation factory, on success only
- `useFlowHistory`: apply, and bind shortcuts in the capture phase
- Toolbar controls naming the change they would take back

---

# Milestone 10: Interface

## FL-26 · Design tokens and dark theme

- Token layer, light and dark, system as the default
- Theme Vue Flow and the date picker from the same tokens
- Own `CanvasControls.vue` instead of `@vue-flow/controls`
- Explicit backgrounds on every form control
- `prefers-reduced-motion`

---

## FL-27 · Help and shortcuts

- `domain/shortcuts.js` as the single source
- `?` opens it, a toolbar control does too
- Ctrl or Cmd resolved per platform

---

## FL-28 · Tooltips and affordances

- A tooltip on every control
- Tooltips on wrappers, so a disabled control still shows one
- An end to end audit for names, tooltips and parroted labels

---

## FL-29 · Bring a created node into view

- Pan to a new node once Vue Flow has measured it, not before
- Keep the node clear of the drawer that opens over it

---

## FL-30 · Connect nodes

- Drag between handles to set a node's parent
- `canConnect`: no self, no cycle, no connector branches
- Select an edge and delete it to detach
- Say in the README that connecting is beyond the brief

---

## FL-31 · Draw a new connection at once

- Add the edge in the connect handler, with the id the adapter uses
- Vue Flow refuses to add a connection it has just seen made
