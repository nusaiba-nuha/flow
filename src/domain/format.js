import { DESCRIPTION_PREVIEW_LENGTH, MESSAGE_PART, WEEKDAY_LABEL } from './constants.js'

/**
 * @param {string} value
 * @param {number} [limit]
 * @returns {string}
 */
export function truncate(value, limit = DESCRIPTION_PREVIEW_LENGTH) {
  const text = String(value ?? '').trim()
  return text.length <= limit ? text : `${text.slice(0, limit).trimEnd()}...`
}

/** @param {string} value @returns {string} */
export const firstLine = (value) => String(value ?? '').split('\n')[0]

/** @param {import('./types.js').MessagePart[]} [parts] */
export const textParts = (parts) => (parts ?? []).filter((part) => part.type === MESSAGE_PART.TEXT)

/** @param {import('./types.js').MessagePart[]} [parts] */
export const attachmentParts = (parts) =>
  (parts ?? []).filter((part) => part.type === MESSAGE_PART.ATTACHMENT)

/**
 * The payload's image URL carries an hmac query string.
 * @param {string} url
 * @returns {string}
 */
export function attachmentName(url) {
  const withoutQuery = String(url ?? '').split('?')[0]
  return withoutQuery.split('/').filter(Boolean).pop() ?? String(url ?? '')
}

/**
 * One line for the node card.
 * @param {import('./types.js').BusinessHour[]} [times]
 * @param {string} [timezone]
 * @returns {string}
 */
export function summariseHours(times, timezone) {
  if (!times?.length) return 'No hours set'

  const uniform = times.every(
    (slot) => slot.startTime === times[0].startTime && slot.endTime === times[0].endTime,
  )
  const range = uniform
    ? `${times[0].startTime} - ${times[0].endTime}`
    : `${times.length} day schedule`

  return timezone ? `${range} - ${timezone}` : range
}

/** @param {string} day @returns {string} */
export const dayLabel = (day) => WEEKDAY_LABEL[day] ?? day
