/**
 * Validators return a message or null, so forms, stores and tests share one
 * definition of valid.
 * @typedef {(value: any) => string | null} Validator
 */

export const FIELD_LIMIT = Object.freeze({
  TITLE_MAX: 60,
  DESCRIPTION_MAX: 280,
  COMMENT_MAX: 500,
  MESSAGE_MAX: 1000,
})

/** @type {(label: string) => Validator} */
export const required = (label) => (value) =>
  String(value ?? '').trim().length ? null : `${label} is required.`

/** @type {(label: string, max: number) => Validator} */
export const maxLength = (label, max) => (value) =>
  String(value ?? '').length <= max ? null : `${label} must be ${max} characters or fewer.`

/** @type {Validator} */
export const isTime = (value) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value ?? '')) ? null : 'Use the HH:mm format.'

/** @type {Validator} */
export const isUrl = (value) => {
  try {
    new URL(String(value))
    return null
  } catch {
    return 'Enter a valid URL.'
  }
}

/**
 * The first failure, or null.
 * @param {any} value
 * @param {Validator[]} validators
 * @returns {string | null}
 */
export function validate(value, validators) {
  for (const check of validators) {
    const error = check(value)
    if (error) return error
  }

  return null
}

/**
 * Format is reported before range, so `9am` does not come back as "end must be after start".
 * @param {string} startTime
 * @param {string} endTime
 * @returns {string | null}
 */
export function validateTimeRange(startTime, endTime) {
  const format = isTime(startTime) ?? isTime(endTime)
  if (format) return format

  return toMinutes(startTime) < toMinutes(endTime) ? null : 'End time must be after start time.'
}

/**
 * @param {string} time HH:mm
 * @returns {number}
 */
export function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number)
  return hours * 60 + minutes
}
