import { describe, expect, it } from 'vitest'

import diagram from '@/tests/fixtures/diagram.json'
import { NODE_GAP, NODE_SIZE } from '../constants.js'
import { normaliseNode } from '../graph.js'
import { layoutTree, nextFreePosition } from '../layout.js'

const nodes = diagram.nodes.map(normaliseNode)
const { edges } = diagram
const STEP_Y = NODE_SIZE.HEIGHT + NODE_GAP.Y

describe('layoutTree', () => {
  it('places every node, with depth on y and parents centred over their children', () => {
    const at = layoutTree(nodes, edges)

    expect(at.size).toBe(nodes.length)
    expect(at.get('1').y).toBe(0)
    expect(at.get('d09c08').y).toBe(STEP_Y)
    // Business Hours branches to the Welcome and Away messages.
    expect(at.get('d09c08').x).toBeCloseTo((at.get('b0653a').x + at.get('b6a0c1').x) / 2)
    expect(Math.abs(at.get('b0653a').x - at.get('b6a0c1').x)).toBeGreaterThanOrEqual(
      NODE_SIZE.WIDTH,
    )
  })

  it('terminates on a cycle and still places an orphan', () => {
    const cyclic = ['a', 'b', 'c'].map((id) => normaliseNode({ id, type: 'process' }))
    const loop = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ]

    expect(layoutTree(cyclic, loop).size).toBe(3)
    expect(layoutTree([]).size).toBe(0)
  })

  it('lays a node with two incoming edges out under the first, once', () => {
    const three = ['a', 'b', 'c'].map((id) => normaliseNode({ id, type: 'process' }))
    const at = layoutTree(three, [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'c' },
    ])

    expect(at.get('c').y).toBe(STEP_Y)
    expect(at.get('c').x).toBe(at.get('a').x)
  })
})

describe('nextFreePosition', () => {
  it('lands below the lowest node, aligned with the leftmost', () => {
    const placed = [{ position: { x: 100, y: 0 } }, { position: { x: 40, y: STEP_Y } }]

    expect(nextFreePosition(placed)).toEqual({ x: 40, y: STEP_Y * 2 })
    expect(nextFreePosition([])).toEqual({ x: 0, y: 0 })
  })
})
