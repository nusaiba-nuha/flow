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
})

/** Shared by the layout function and the node card. */
export const NODE_SIZE = Object.freeze({ WIDTH: 232, HEIGHT: 104 })
export const NODE_GAP = Object.freeze({ X: 44, Y: 72 })

export const DESCRIPTION_PREVIEW_LENGTH = 90
