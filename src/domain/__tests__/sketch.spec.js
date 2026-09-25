import { describe, expect, it } from 'vitest'

import { isSketch, seedFor, sketchPath } from '../sketch.js'

const BOX = 'M10,10 H190 V90 H10 Z'

describe('sketchPath', () => {
  it('redraws a path by hand, the same way every time for the same id', () => {
    const drawn = sketchPath(BOX, 'api')

    expect(drawn).toMatch(/^M[\d.]+ [\d.]+ C/)
    expect(drawn).not.toBe(BOX)
    expect(sketchPath(BOX, 'api')).toBe(drawn)
    expect(sketchPath(BOX, 'db')).not.toBe(drawn)
  })

  it('keeps numbers to a tenth, and draws nothing for no path', () => {
    expect(sketchPath(BOX, 'api')).not.toMatch(/\d\.\d{2}/)
    expect(sketchPath('', 'api')).toBe('')
  })
})

describe('seedFor', () => {
  it('turns any id into a stable positive integer', () => {
    expect(seedFor('api')).toBe(seedFor('api'))
    expect(seedFor('api')).not.toBe(seedFor('apj'))
    ;['', 'a', 'a much longer id with spaces'].forEach((id) => {
      expect(Number.isInteger(seedFor(id))).toBe(true)
      expect(seedFor(id)).toBeGreaterThan(0)
    })
  })
})

describe('isSketch', () => {
  it('reads the style off a document', () => {
    expect(isSketch({ style: 'sketch' })).toBe(true)
    expect(isSketch({})).toBe(false)
    expect(isSketch(null)).toBe(false)
  })
})
