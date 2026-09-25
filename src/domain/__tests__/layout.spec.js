import { describe, expect, it } from 'vitest'

import diagram from '@/tests/fixtures/diagram.json'
import { NODE_GAP, NODE_SIZE } from '../constants.js'
import { normaliseNode } from '../graph.js'
import { freeSpotNear, layoutTree } from '../layout.js'

const nodes = diagram.nodes.map(normaliseNode)
const { edges } = diagram
const STEP_Y = NODE_SIZE.HEIGHT + NODE_GAP.Y
const STEP_X = NODE_SIZE.WIDTH + NODE_GAP.X

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

  it('puts a node with two sources below both, centred between them', () => {
    const three = ['a', 'b', 'c'].map((id) => normaliseNode({ id, type: 'process' }))
    const at = layoutTree(three, [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'c' },
    ])

    expect(at.get('a').y).toBe(0)
    expect(at.get('b').y).toBe(0)
    expect(at.get('c').y).toBe(STEP_Y)
    expect(at.get('c').x).toBe((at.get('a').x + at.get('b').x) / 2)
  })

  it('lays out any graph in layers: merges, skips and cycles all point down', () => {
    const ids = ['start', 'check', 'retry', 'save', 'done']
    const nodes = ids.map((id) => normaliseNode({ id, type: 'process' }))
    const edges = [
      { source: 'start', target: 'check' },
      { source: 'check', target: 'retry' },
      { source: 'retry', target: 'check' },
      { source: 'check', target: 'save' },
      { source: 'start', target: 'save' },
      { source: 'save', target: 'done' },
    ]
    const at = layoutTree(nodes, edges)
    const layer = (id) => at.get(id).y / STEP_Y

    expect(ids.map(layer)).toEqual([0, 1, 2, 2, 3])
    // No two shapes share a spot, and the layout does not depend on edge order.
    expect(new Set(ids.map((id) => `${at.get(id).x},${at.get(id).y}`)).size).toBe(ids.length)
    expect(layoutTree(nodes, [...edges].reverse())).toEqual(at)
  })

  it('keeps shapes in a layer at least a step apart', () => {
    const nodes = ['a', 'b', 'c', 'd'].map((id) => normaliseNode({ id, type: 'process' }))
    const at = layoutTree(nodes, [
      { source: 'a', target: 'c' },
      { source: 'a', target: 'd' },
      { source: 'b', target: 'c' },
      { source: 'b', target: 'd' },
    ])

    expect(Math.abs(at.get('c').x - at.get('d').x)).toBeGreaterThanOrEqual(STEP_X)
  })
})

describe('freeSpotNear', () => {
  it('keeps the wanted spot when it is clear, and moves to the nearest clear one when not', () => {
    expect(freeSpotNear({ x: 0, y: 0 }, [])).toEqual({ x: 0, y: 0 })

    const taken = [{ position: { x: 10, y: 10 } }]
    const spot = freeSpotNear({ x: 0, y: 0 }, taken)
    expect(spot).not.toEqual({ x: 0, y: 0 })
    expect(
      Math.abs(spot.x - 10) >= NODE_SIZE.WIDTH || Math.abs(spot.y - 10) >= NODE_SIZE.HEIGHT,
    ).toBe(true)
  })
})
