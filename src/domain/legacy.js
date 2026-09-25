import { SHAPE } from './constants.js'
import { firstLine } from './format.js'

/**
 * The node types Flow started with, as a chat-bot flow builder. Read only by
 * the v3 migration; nothing else should know they existed.
 */
const LEGACY = Object.freeze({
  TRIGGER: 'trigger',
  SEND_MESSAGE: 'sendMessage',
  DATE_TIME: 'dateTime',
  BRANCH: 'dateTimeConnector',
  ADD_COMMENT: 'addComment',
})

/** @type {Readonly<Record<string, string>>} */
const SHAPE_FOR = Object.freeze({
  [LEGACY.TRIGGER]: SHAPE.TERMINAL,
  [LEGACY.SEND_MESSAGE]: SHAPE.PROCESS,
  [LEGACY.DATE_TIME]: SHAPE.DECISION,
  [LEGACY.ADD_COMMENT]: SHAPE.NOTE,
})

/** @param {Record<string, any>} node */
export const isLegacyBranch = (node) => node.type === LEGACY.BRANCH

/**
 * @param {string} type
 * @returns {string | null} the shape it becomes, or null when it is not legacy
 */
export const shapeForLegacy = (type) => SHAPE_FOR[type] ?? null

/**
 * The trigger never had a name; the card called it Trigger.
 * @param {Record<string, any>} node
 * @returns {string | undefined}
 */
export const legacyName = (node) =>
  node.name ?? (node.type === LEGACY.TRIGGER ? 'Start' : undefined)

/**
 * What the old type showed on its card, kept as the new shape's description so
 * nothing that was visible is lost. The old fields stay in `data` too.
 *
 * @param {Record<string, any>} node
 * @returns {string}
 */
export function legacyDescription(node) {
  const data = node.data ?? {}
  if (data.description) return data.description

  switch (node.type) {
    case LEGACY.TRIGGER:
      return humanise(data.type ?? 'conversationOpened')
    case LEGACY.SEND_MESSAGE:
      return firstLine(
        (data.payload ?? []).find((/** @type {any} */ part) => part.type === 'text')?.text ?? '',
      )
    case LEGACY.ADD_COMMENT:
      return data.comment ?? ''
    case LEGACY.DATE_TIME:
      return summariseHours(data.times, data.timezone)
    default:
      return ''
  }
}

/**
 * @param {{ startTime: string, endTime: string }[]} [times]
 * @param {string} [timezone]
 */
function summariseHours(times, timezone) {
  if (!times?.length) return 'Within business hours?'

  const uniform = times.every(
    (slot) => slot.startTime === times[0].startTime && slot.endTime === times[0].endTime,
  )
  const range = uniform
    ? `${times[0].startTime} - ${times[0].endTime}`
    : `${times.length} day schedule`

  return timezone ? `${range} - ${timezone}` : range
}

/** @param {string} value */
const humanise = (value) =>
  String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (char) => char.toUpperCase())
