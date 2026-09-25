/**
 * Validators return a message or null, so forms, stores and tests share one
 * definition of valid.
 * @typedef {(value: any) => string | null} Validator
 */

export const FIELD_LIMIT = Object.freeze({
  TITLE_MAX: 60,
  DESCRIPTION_MAX: 280,
})

/** @type {(label: string) => Validator} */
export const required = (label) => (value) =>
  String(value ?? '').trim().length ? null : `${label} is required.`

/** @type {(label: string, max: number) => Validator} */
export const maxLength = (label, max) => (value) =>
  String(value ?? '').length <= max ? null : `${label} must be ${max} characters or fewer.`

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
