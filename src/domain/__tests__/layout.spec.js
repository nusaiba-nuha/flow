import { describe, expect, it } from 'vitest'

import payload from '../../../public/payload.json'
import { NODE_GAP, NODE_SIZE } from '../constants.js'
import { normaliseNode } from '../graph.js'
import { layoutTree, nextFreePosition } from '../layout.js'

const nodes = payload.map(normaliseNode)
const STEP_Y = NODE_SIZE.HEIGHT + NODE_GAP.Y

describe('layoutTree', () => {
  it('places every node, with depth on y and parents centred over their children', () => {
    const at = layoutTree(nodes)

    expect(at.size).toBe(nodes.length)
    expect(at.get('1').y).toBe(0)
    expect(at.get('d09c08').y).toBe(STEP_Y)
    expect(at.get('d09c08').x).toBeCloseTo((at.get('161f52').x + at.get('28c4b9').x) / 2)
    expect(Math.abs(at.get('161f52').x - at.get('28c4b9').x)).toBeGreaterThanOrEqual(
      NODE_SIZE.WIDTH,
    )
  })

  it('terminates on a cycle and still places an orphan', () => {
    const cyclic = [
      normaliseNode({ id: 'a', parentId: 'b', type: 'addComment' }),
      normaliseNode({ id: 'b', parentId: 'a', type: 'addComment' }),
    ]

    expect(layoutTree(cyclic).size).toBe(2)
    expect(layoutTree([]).size).toBe(0)
  })

  it('moves a dateTime node connectors with it once it has a position', () => {
    const before = layoutTree(nodes)
    const offset = {
      x: before.get('161f52').x - before.get('d09c08').x,
      y: before.get('161f52').y - before.get('d09c08').y,
    }

    const dragged = nodes.map((node) =>
      node.id === 'd09c08' ? { ...node, position: { x: 1000, y: 2000 } } : node,
    )
    const after = layoutTree(dragged)

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
