/**
 * Injected rather than passed as a prop: changing a prop would rebuild the node
 * array on every arrow press, and Vue Flow treats a new array as a full re-seed.
 */
export const FOCUSED_NODE_ID = Symbol('focused-node-id')
