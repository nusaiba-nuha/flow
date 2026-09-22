import { describe, expect, it } from 'vitest'

import { isInView, panDuration } from '../motion.js'

const view = { width: 1000, height: 800 }

describe('motion', () => {
  it('leaves a node that is already comfortably in view alone', () => {
    expect(isInView({ x: 400, y: 300, width: 160, height: 60 }, view)).toBe(true)
    expect(isInView({ x: 400, y: 790, width: 160, height: 60 }, view)).toBe(false)
    expect(isInView({ x: -20, y: 300, width: 160, height: 60 }, view)).toBe(false)
  })

  it('scales the duration with the distance, within bounds', () => {
    expect(panDuration(0)).toBe(220)
    expect(panDuration(600)).toBe(330)
    expect(panDuration(5000)).toBe(560)
  })
})
