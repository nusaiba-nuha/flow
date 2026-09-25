import { DESCRIPTION_PREVIEW_LENGTH } from './constants.js'

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
