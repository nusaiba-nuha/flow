import { describe, expect, it } from 'vitest'

import { SHAPE } from '../constants.js'
import { shapePath, textInset } from '../shapes.js'

/** Every coordinate a path visits, so a test can check it stays in its box. */
const points = (d) =>
  [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(([, x, y]) => ({ x: Number(x), y: Number(y) }))

describe('shapePath', () => {
  it('keeps every outline inside its box, inset for the stroke', () => {
    Object.values(SHAPE).forEach((shape) => {
      points(shapePath(shape, 200, 100, 2)).forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(2)
        expect(x).toBeLessThanOrEqual(198)
        // A document's wave dips below its base line on purpose; nothing else may.
        if (shape !== SHAPE.DOCUMENT) expect(y).toBeLessThanOrEqual(98)
        expect(y).toBeGreaterThanOrEqual(2)
      })
    })
  })

  it('draws a decision as a diamond through the midpoints', () => {
    expect(shapePath(SHAPE.DECISION, 100, 60, 0)).toBe('M50,0 L100,30 L50,60 L0,30 Z')
  })

  it('draws an unknown shape as a process', () => {
    expect(shapePath('somethingNew', 100, 60)).toBe(shapePath(SHAPE.PROCESS, 100, 60))
  })
})

describe('textInset', () => {
  it('keeps text inside a diamond and a pill, and adds nothing to a rectangle', () => {
    expect(textInset(SHAPE.DECISION, 200, 100).x).toBe(50)
    expect(textInset(SHAPE.TERMINAL, 200, 90).x).toBe(30)
    expect(textInset(SHAPE.PROCESS, 200, 100)).toEqual({ x: 0, y: 0 })
  })
})
