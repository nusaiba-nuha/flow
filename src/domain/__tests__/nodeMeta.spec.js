import { describe, expect, it } from 'vitest'

import diagram from '@/tests/fixtures/diagram.json'
import { SHAPE } from '../constants.js'
import { normaliseNode } from '../graph.js'
import { isKnownShape, isOpenable, metaFor, SHAPE_OPTIONS } from '../nodeMeta.js'
import { shapePath } from '../shapes.js'

describe('metaFor', () => {
  it('covers every sample shape and falls back rather than throwing', () => {
    diagram.nodes.forEach((raw) => expect(metaFor(raw.type).label).not.toBe('Unknown'))
    expect(metaFor('somethingNew').label).toBe('Unknown')
    expect(isKnownShape('somethingNew')).toBe(false)
  })

  it('summarises a shape by its description, truncated', () => {
    const node = normaliseNode({
      id: 'a',
      type: SHAPE.PROCESS,
      data: { description: 'x'.repeat(200) },
    })
    const summary = metaFor(SHAPE.PROCESS).summary(node)

    expect(summary.endsWith('...')).toBe(true)
    expect(summary.length).toBeLessThan(200)
    expect(metaFor(SHAPE.PROCESS).summary(normaliseNode({ id: 'b', type: SHAPE.PROCESS }))).toBe('')
  })

  it('lets every shape be opened, edited and deleted', () => {
    diagram.nodes.forEach((raw) => expect(isOpenable(normaliseNode(raw))).toBe(true))
  })
})

describe('SHAPE_OPTIONS', () => {
  it('offers every shape but a pen stroke once, each with an outline except text', () => {
    expect(SHAPE_OPTIONS.map((option) => option.value).sort()).toEqual(
      Object.values(SHAPE)
        .filter((shape) => shape !== SHAPE.INK)
        .sort(),
    )

    SHAPE_OPTIONS.forEach(({ value }) => {
      if (value === SHAPE.TEXT) expect(shapePath(value, 100, 50)).toBe('')
      else expect(shapePath(value, 100, 50)).toMatch(/^M[\d.]+,[\d.]+ .*/)
    })
  })
})
