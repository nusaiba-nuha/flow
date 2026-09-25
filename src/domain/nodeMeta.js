import { SHAPE } from './constants.js'
import { truncate } from './format.js'

/**
 * @typedef {Object} NodeMeta
 * @property {string} label
 * @property {string} hint      what the shape conventionally means
 * @property {string} accent    token name, resolved to classes by the canvas
 * @property {boolean} openable can the drawer be opened
 * @property {boolean} editable
 * @property {boolean} deletable
 * @property {(node: import('./types.js').FlowNode) => string} summary
 */

/** @param {import('./types.js').FlowNode} node */
const describe = (node) => (node.data.description ? truncate(node.data.description) : '')

/**
 * @param {string} label
 * @param {string} hint
 * @param {string} accent
 * @returns {NodeMeta}
 */
const shape = (label, hint, accent) => ({
  label,
  hint,
  accent,
  openable: true,
  editable: true,
  deletable: true,
  summary: describe,
})

/**
 * Every per-shape difference, as data. Components read this instead of
 * branching on type, so adding a shape is one entry here and one outline in
 * `shapes.js`. Order is palette order.
 *
 * @type {Readonly<Record<string, NodeMeta>>}
 */
export const NODE_META = Object.freeze({
  [SHAPE.PROCESS]: shape('Process', 'A step', 'message'),
  [SHAPE.TERMINAL]: shape('Start / end', 'Where a flow begins or ends', 'trigger'),
  [SHAPE.DECISION]: shape('Decision', 'A question with more than one way out', 'hours'),
  [SHAPE.DATA]: shape('Input / output', 'Data going in or out', 'branch'),
  [SHAPE.DATABASE]: shape('Database', 'A store of data', 'branch'),
  [SHAPE.DOCUMENT]: shape('Document', 'A file or report', 'comment'),
  [SHAPE.NOTE]: shape('Note', 'An annotation', 'comment'),
  [SHAPE.TEXT]: shape('Text', 'A label with no outline', 'unknown'),
})

/**
 * So an unfamiliar type renders instead of crashing the canvas.
 * @type {NodeMeta}
 */
const FALLBACK_META = Object.freeze(
  shape('Unknown', 'A shape this version does not know', 'unknown'),
)

/** @param {string} type @returns {NodeMeta} */
export const metaFor = (type) => NODE_META[type] ?? FALLBACK_META

/** @param {import('./types.js').FlowNode} node */
export const isOpenable = (node) => metaFor(node.type).openable

/** @param {import('./types.js').FlowNode} node */
export const isDeletable = (node) => metaFor(node.type).deletable

/** @param {string} type */
export const isKnownShape = (type) => Object.hasOwn(NODE_META, type)

/** Every shape, in palette order, for pickers. */
export const SHAPE_OPTIONS = Object.freeze(
  Object.entries(NODE_META).map(([value, meta]) => ({ value, label: meta.label, hint: meta.hint })),
)

/**
 * camelCase or snake_case to Title Case, for stored values shown as they are.
 * @param {string} value
 * @returns {string}
 */
export function humanise(value) {
  return String(value ?? '')
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase())
}
