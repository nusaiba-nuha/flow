import { describe, expect, it } from 'vitest'

import { inkPath, simplify, strokeToInk } from '../ink.js'

describe('strokeToInk', () => {
  it('boxes a stroke with room for its line, and keeps its points across the box', () => {
    const ink = strokeToInk([
      { x: 100, y: 100 },
      { x: 150, y: 120 },
      { x: 200, y: 100 },
    ])

    expect(ink.position).toEqual({ x: 94, y: 94 })
    expect(ink.size).toEqual({ width: 112, height: 32 })
    const points = ink.points.split(' ').map((pair) => pair.split(',').map(Number))
    points.flat().forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    })
    expect(points).toHaveLength(3)
  })

  it('draws nothing for a tap', () => {
    expect(strokeToInk([{ x: 5, y: 5 }])).toBeNull()
    expect(
      strokeToInk([
        { x: 5, y: 5 },
        { x: 6, y: 6 },
      ]),
    ).toBeNull()
  })
})

describe('simplify', () => {
  it('drops points that lie on the line, and keeps the corners', () => {
    const line = Array.from({ length: 20 }, (_, index) => ({ x: index, y: index }))
    expect(simplify(line, 1)).toEqual([line[0], line[19]])

    const corner = [...line.slice(0, 10), { x: 9, y: 30 }]
    expect(simplify(corner, 1)).toHaveLength(3)
  })
})

describe('inkPath', () => {
  it('scales points to the box, smoothing through their midpoints', () => {
    expect(inkPath('0,0 100,100', 200, 50)).toBe('M0,0 L200,50')
    expect(inkPath('0,0 50,100 100,0', 100, 100)).toBe('M0,0 Q50,100 75,50 L100,0')
    expect(inkPath('', 10, 10)).toBe('')
    expect(inkPath('nonsense', 10, 10)).toBe('')
  })
})
