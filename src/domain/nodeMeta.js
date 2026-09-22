import { MESSAGE_PART, NODE_TYPE, WEEKDAYS } from './constants.js'
import { firstLine, summariseHours, textParts, truncate } from './format.js'
import { localTimezone } from './time.js'

/**
 * @typedef {Object} NodeMeta
 * @property {string} label
 * @property {string} icon      key into the icon component
 * @property {string} accent    token name, resolved to classes by the canvas
 * @property {boolean} openable can the drawer be opened
 * @property {boolean} editable
 * @property {boolean} deletable
 * @property {(node: import('./types.js').FlowNode) => string} summary
 */

/**
 * Every per-type difference, as data. Components read this instead of branching
 * on type, so adding a node type is one entry.
 *
 * @type {Readonly<Record<string, NodeMeta>>}
 */
export const NODE_META = Object.freeze({
  [NODE_TYPE.TRIGGER]: {
    label: 'Trigger',
    icon: 'bolt',
    accent: 'trigger',
    openable: false,
    editable: false,
    deletable: false,
    summary: (node) => humanise(node.data.type ?? 'Conversation Opened'),
  },
  [NODE_TYPE.DATE_TIME]: {
    label: 'Business Hours',
    icon: 'calendar',
    accent: 'hours',
    openable: true,
    editable: true,
    deletable: true,
    summary: (node) => summariseHours(node.data.times, node.data.timezone),
  },
  // Display only, per the brief.
  [NODE_TYPE.DATE_TIME_CONNECTOR]: {
    label: 'Branch',
    icon: 'branch',
    accent: 'branch',
    openable: false,
    editable: false,
    deletable: false,
    summary: (node) => humanise(node.data.connectorType ?? ''),
  },
  [NODE_TYPE.SEND_MESSAGE]: {
    label: 'Send Message',
    icon: 'send',
    accent: 'message',
    openable: true,
    editable: true,
    deletable: true,
    summary: (node) => {
      const text = textParts(node.data.payload)[0]?.text
      return text ? truncate(firstLine(text)) : 'No message yet'
    },
  },
  [NODE_TYPE.ADD_COMMENT]: {
    label: 'Add Comment',
    icon: 'comment',
    accent: 'comment',
    openable: true,
    editable: true,
    deletable: true,
    summary: (node) => (node.data.comment ? truncate(node.data.comment) : 'No comment yet'),
  },
})

/**
 * So an unfamiliar type renders instead of crashing the canvas.
 * @type {NodeMeta}
 */
const FALLBACK_META = Object.freeze({
  label: 'Unknown',
  icon: 'question',
  accent: 'unknown',
  openable: false,
  editable: false,
  deletable: false,
  summary: () => 'Unsupported node type',
})

/** @param {string} type @returns {NodeMeta} */
export const metaFor = (type) => NODE_META[type] ?? FALLBACK_META

/** @param {import('./types.js').FlowNode} node */
export const isOpenable = (node) => metaFor(node.type).openable

/** @param {import('./types.js').FlowNode} node */
export const isDeletable = (node) => metaFor(node.type).deletable

/**
 * The three options in the create form. `businessHours` is the brief's label for
 * a dateTime node, so the option carries both the type and its seed data.
 */
export const CREATABLE_NODES = Object.freeze([
  {
    value: NODE_TYPE.SEND_MESSAGE,
    label: 'Send Message',
    type: NODE_TYPE.SEND_MESSAGE,
    /** @param {string} description @returns {import('./types.js').FlowNodeData} */
    seed: (description) => ({
      payload: [{ type: MESSAGE_PART.TEXT, text: description }],
      description,
    }),
  },
  {
    value: NODE_TYPE.ADD_COMMENT,
    label: 'Add Comments',
    type: NODE_TYPE.ADD_COMMENT,
    /** @param {string} description @returns {import('./types.js').FlowNodeData} */
    seed: (description) => ({ comment: description, description }),
  },
  {
    value: 'businessHours',
    label: 'Business Hours',
    type: NODE_TYPE.DATE_TIME,
    /** @param {string} description @returns {import('./types.js').FlowNodeData} */
    seed: (description) => ({
      action: 'businessHours',
      // Whoever creates it is usually configuring their own hours.
      timezone: localTimezone(),
      times: WEEKDAYS.map((day) => ({ day, startTime: '09:00', endTime: '17:00' })),
      description,
    }),
  },
])

/** @param {string} value */
export const creatableByValue = (value) => CREATABLE_NODES.find((option) => option.value === value)

/**
 * camelCase or snake_case to Title Case, for payload values shown as they are.
 * @param {string} value
 * @returns {string}
 */
export function humanise(value) {
  return String(value ?? '')
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase())
}
