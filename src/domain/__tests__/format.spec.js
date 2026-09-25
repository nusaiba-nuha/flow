import { describe, expect, it } from 'vitest'

import { firstLine, truncate } from '../format.js'

describe('text', () => {
  it('truncates past the limit and keeps the first line', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello world', 5)).toBe('hello...')
    expect(truncate(null)).toBe('')
    expect(firstLine('Hello there\nsecond line')).toBe('Hello there')
  })
})
