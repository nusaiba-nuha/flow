/**
 * @typedef {'process'|'terminal'|'decision'|'data'|'database'|'document'|'note'|'table'|'text'} Shape
 */
export const SHAPE = Object.freeze({
  PROCESS: 'process',
  TERMINAL: 'terminal',
  DECISION: 'decision',
  DATA: 'data',
  DATABASE: 'database',
  DOCUMENT: 'document',
  NOTE: 'note',
  TABLE: 'table',
  TEXT: 'text',
  SCREEN: 'screen',
  BUTTON: 'button',
  INPUT: 'input',
  CARD: 'card',
  LIST: 'list',
  IMAGE: 'image',
  INK: 'ink',
})

/** Shared by the layout function and the node card. */
export const NODE_SIZE = Object.freeze({ WIDTH: 232, HEIGHT: 104 })
export const NODE_GAP = Object.freeze({ X: 44, Y: 72 })

/** Small enough for a label, large enough to keep a handle on each side. */
export const MIN_NODE_SIZE = Object.freeze({ WIDTH: 80, HEIGHT: 40 })

/**
 * A node's size: its own once resized, the standard one until then.
 * @param {{ size?: { width: number, height: number } | null }} node
 * @returns {{ width: number, height: number }}
 */
export const sizeOf = (node) =>
  node?.size?.width && node?.size?.height
    ? { width: node.size.width, height: node.size.height }
    : { width: NODE_SIZE.WIDTH, height: NODE_SIZE.HEIGHT }

export const DESCRIPTION_PREVIEW_LENGTH = 90
