import { describe, expect, it } from 'vitest'

import {
  FIELD_LIMIT,
  isTime,
  isUrl,
  maxLength,
  required,
  validate,
  validateTimeRange,
} from '../validators.js'

describe('field validators', () => {
  it('rejects empty and over-long input, accepts the rest', () => {
    expect(required('Title')('   ')).toBe('Title is required.')
    expect(required('Title')('Away Message')).toBeNull()

    expect(maxLength('Title', 3)('abc')).toBeNull()
    expect(maxLength('Title', FIELD_LIMIT.TITLE_MAX)('x'.repeat(61))).toMatch(/60 characters/)
  })

  it('reports the first failure only', () => {
    expect(validate('', [required('Title'), maxLength('Title', 2)])).toBe('Title is required.')
    expect(validate('ok', [required('Title'), maxLength('Title', 5)])).toBeNull()
  })

  it('checks times and urls', () => {
    expect(isTime('23:59')).toBeNull()
    expect(isTime('24:00')).toBe('Use the HH:mm format.')
    expect(isTime('9:00')).toBe('Use the HH:mm format.')
    expect(isUrl('https://example.com/a.png')).toBeNull()
    expect(isUrl('a.png')).toBe('Enter a valid URL.')
  })
})

describe('validateTimeRange', () => {
  it('rejects an inverted or empty range, and reports format first', () => {
    expect(validateTimeRange('09:00', '17:00')).toBeNull()
    expect(validateTimeRange('17:00', '09:00')).toBe('End time must be after start time.')
    expect(validateTimeRange('09:00', '09:00')).toBe('End time must be after start time.')
    expect(validateTimeRange('9am', '17:00')).toBe('Use the HH:mm format.')
  })
})
