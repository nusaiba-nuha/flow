import { describe, expect, it } from 'vitest'

import { nextZoom } from '../zoom.js'

describe('nextZoom', () => {
  it('steps through the round stops in both directions', () => {
    expect(nextZoom(0.75, 1)).toBe(1)
    expect(nextZoom(1, 1)).toBe(1.5)
    expect(nextZoom(1, -1)).toBe(0.75)
  })

  it('passes through 100% from a fitted zoom rather than skipping it', () => {
    expect(nextZoom(0.71, 1)).toBe(0.75)
    expect(nextZoom(0.75, 1)).toBe(1)
  })

  it('stays put at the ends', () => {
    expect(nextZoom(2, 1)).toBe(2)
    expect(nextZoom(0.25, -1)).toBe(0.25)
  })
})
