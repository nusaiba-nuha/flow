# Working in this repo

Instructions for AI coding agents. Kept short on purpose: everything here is
something the code cannot tell you.

## Commands

| Task       | Command             |
| ---------- | ------------------- |
| Dev server | `npm run dev`       |
| Unit tests | `npm test`          |
| E2E        | `npm run test:e2e`  |
| Types      | `npm run typecheck` |
| Lint       | `npm run lint`      |

`npm run test:e2e` builds nothing: run `npm run build` first if the source changed.

## Boundaries

- `src/domain/` has no Vue imports. It is plain JavaScript so it can be tested
  without mounting anything. Keep it that way.
- `src/api/flowApi.js` is the only module that touches persistence. It is shaped
  like a real API so it can be swapped for one.
- Per node type behaviour lives in `src/domain/nodeMeta.js`. Add an entry there
  rather than branching on node type in a component.
- State has three owners and no copies: TanStack Query owns the flow, the route
  owns which node is open, Pinia owns viewport, history, theme and toasts. Do not
  mirror one in another.

## Canvas

Vue Flow measures node handles after mount, and it owns its own graph:

- Sync nodes as a diff. Replacing the array discards measured handle bounds and
  every edge disappears.
- Hide edges rather than removing them, and key an edge by its child.
- `isValidConnection` runs for programmatic `addEdges` too, not just for a drag.

## Conventions

- Read configuration from `.env`. Never hardcode a URL.
- Types are JSDoc, checked by `vue-tsc` in strict mode. Untyped exports fail CI.
- A comment carries a reason the code cannot state. If it restates the next line,
  delete it.
- Tests cover behaviour that can break, not coverage percentage.
- Commits: imperative subject, `Add`/`Fix`/`Update`/`Remove`/`Refactor`/`Test`.
  Stage files by name. Never `git add -A`.
- Never commit `.env`, secrets, or anything in `dist/` or `coverage/`. The
  pre-commit hook scans staged changes for credentials and will refuse.
