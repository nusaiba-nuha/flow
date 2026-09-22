# Backlog

What is built, what is next, and what is deliberately left out. Tickets are in
[task-chunks.md](task-chunks.md).

## Done

| Area        | What                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Canvas      | Vue Flow rendering, drag with persistence, viewport remembered, loading, error and empty states |
| Drawer      | Nested route per node, title and description editing, two-step delete                           |
| Node bodies | Send message texts and attachments, comment, business hours with a per-row check                |
| Create      | Modal form with the brief's three fields, branches for a business hours node                    |
| Data        | TanStack Query, one optimistic mutation factory with whole-snapshot rollback                    |
| Quality     | 72 unit tests, 10 Playwright specs, lint, JSDoc typecheck, CI on both                           |
| Delivery    | Docker dev and nginx production images, same-origin payload proxy                               |

## Next

In ticket order, from the brief's own follow-up list.

| Ticket | What                              | Why it matters                                                 |
| ------ | --------------------------------- | -------------------------------------------------------------- |
| FL-24  | Keyboard navigation of the canvas | The brief names it; a graph is unusable by keyboard without it |
| FL-25  | Undo and redo                     | The brief names it; destructive actions need a way back        |
| FL-26  | Design tokens and dark theme      | Already token-driven, needs the dark palette and a toggle      |
| FL-27  | Help dialog and tooltips          | Shortcuts are only discoverable if something lists them        |
| FL-28  | Final pass                        | Documentation and a last audit                                 |

## Would do next, given more time

- **Connecting nodes.** A parent field on the create form, then dragging edges on the canvas. The
  layout and the delete rule already handle arbitrary parents, so this is UI rather than model work.
- **A real backend.** `flowApi.js` is one module with a fetch and four writers; replacing it with
  HTTP calls touches nothing else.
- **Multi-select and bulk delete**, once there are enough nodes for it to pay off.
- **Virtualised canvas rendering** if a flow ever reaches hundreds of nodes. At seven it would be
  optimising a problem nobody has.

## Deliberately not doing

| Not doing                       | Why                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| A component library             | The brief asks for custom implementation, and every control here is one file           |
| A state library beyond Pinia    | Query owns server state, the URL owns what is open; a third store would duplicate both |
| Inverse-command undo            | Snapshots are a few kilobytes at this size and cannot drift from the forward operation |
| Storing the payload in the repo | It is someone else's API; a copy would rot and hide CORS from us                       |
| Server-side rendering           | The brief describes an authenticated editing tool, which gains nothing from SSR        |
