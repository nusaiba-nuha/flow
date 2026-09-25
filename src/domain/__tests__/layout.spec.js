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
    expect(at.get('d09c08').x).toBeCloseTo((at.get('161f52').x + at.get('28c4b9').x) / 2)
    expect(Math.abs(at.get('161f52').x - at.get('28c4b9').x)).toBeGreaterThanOrEqual(
      NODE_SIZE.WIDTH,
    )
  })

  it('terminates on a cycle and still places an orphan', () => {
    const cyclic = ['a', 'b', 'c'].map((id) => normaliseNode({ id, type: 'addComment' }))
    const loop = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ]

    expect(layoutTree(cyclic, loop).size).toBe(3)
    expect(layoutTree([]).size).toBe(0)
  })

  it('lays a node with two incoming edges out under the first, once', () => {
    const three = ['a', 'b', 'c'].map((id) => normaliseNode({ id, type: 'addComment' }))
    const at = layoutTree(three, [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'c' },
    ])

    expect(at.get('c').y).toBe(STEP_Y)
    expect(at.get('c').x).toBe(at.get('a').x)
  })

  it('moves a dateTime node connectors with it once it has a position', () => {
    const before = layoutTree(nodes, edges)
    const offset = {
      x: before.get('161f52').x - before.get('d09c08').x,
      y: before.get('161f52').y - before.get('d09c08').y,
    }

    const dragged = nodes.map((node) =>
      node.id === 'd09c08' ? { ...node, position: { x: 1000, y: 2000 } } : node,
    )
    const after = layoutTree(dragged, edges)

    expect(after.get('161f52')).toEqual({ x: 1000 + offset.x, y: 2000 + offset.y })
    // A plain child keeps its slot; only connectors belong to the node.
    expect(after.get('b0653a')).toEqual(before.get('b0653a'))
  })
})

describe('nextFreePosition', () => {
  it('lands below the lowest node, aligned with the leftmost', () => {
    const placed = [{ position: { x: 100, y: 0 } }, { position: { x: 40, y: STEP_Y } }]

    expect(nextFreePosition(placed)).toEqual({ x: 40, y: STEP_Y * 2 })
    expect(nextFreePosition([])).toEqual({ x: 0, y: 0 })
  })
})
