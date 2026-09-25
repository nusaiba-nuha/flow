/**
 * Connection state, injected so a card can show whether it would accept the drop
 * without the node array being rebuilt on every pointer move.
 *
 * @typedef {{
 *   from: import('vue').Ref<string>,
 *   accepts: (id: string) => boolean,
 * }} ConnectContext
 */
export const CONNECT_STATE = Symbol('connect-state')

/** Removes an edge by id, injected so an edge can offer its own remove control. */
export const DETACH_EDGE = Symbol('detach-edge')
