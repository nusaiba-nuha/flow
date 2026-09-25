import { describe, expect, it } from 'vitest'

import { FIELD_LIMIT, maxLength, required, validate } from '../validators.js'

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
})
