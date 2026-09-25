import { describe, expect, it } from 'vitest'

import diagram from '@/tests/fixtures/diagram.json'
import { emptyDocument } from '../document.js'
import {
  buildEdges,
  canConnect,
  documentToGraph,
  edgeIdFor,
  withEdge,
  withEdgeLabel,
  withNodeRemoved,
  withNodesRemoved,
  withoutEdge,
  withPositions,
} from '../graph.js'

describe('documentToGraph', () => {
  it('turns a document into positioned nodes carrying their domain node', () => {
    const { nodes, edges } = documentToGraph(diagram)

    expect(nodes).toHaveLength(diagram.nodes.length)
    expect(edges).toHaveLength(diagram.edges.length)
    expect(nodes.find((node) => node.id === 'b6a0c1').data.node.name).toBe('Away Message')
    expect(documentToGraph(emptyDocument())).toEqual({ nodes: [], edges: [] })
    expect(documentToGraph(null)).toEqual({ nodes: [], edges: [] })
  })
})

describe('buildEdges', () => {
  it('draws only edges whose ends both exist, and keeps a label', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b', label: 'yes' },
      { id: 'e2', source: 'a', target: 'ghost' },
    ]

    expect(buildEdges(edges, new Set(['a', 'b']))).toEqual([
      { id: 'e1', type: 'flow', source: 'a', target: 'b', label: 'yes' },
    ])
  })
})

describe('withNodeRemoved', () => {
  it('takes every edge touching the node, and leaves its neighbours alone', () => {
    // Away Message sits between the Failure branch and Add Comment #1.
    const next = withNodeRemoved(diagram, 'b6a0c1')

    expect(next.nodes.map((node) => node.id)).toContain('e879e4')
    expect(next.edges.some((edge) => edge.source === 'b6a0c1' || edge.target === 'b6a0c1')).toBe(
      false,
    )
    expect(next.edges).toHaveLength(diagram.edges.length - 2)
  })

  it('takes a business hours node branches with it', () => {
    const ids = withNodeRemoved(diagram, 'd09c08').nodes.map((node) => node.id)

    expect(ids).not.toContain('161f52')
    expect(ids).not.toContain('28c4b9')
    expect(ids).toContain('b0653a')
    expect(withNodeRemoved(diagram, 'ghost')).toBe(diagram)
  })
})

describe('withEdge and withoutEdge', () => {
  it('adds an edge once, keyed by its ends, and removes it by id', () => {
    const once = withEdge(diagram, 'e879e4', 'b0653a')
    expect(once.edges.at(-1)).toEqual({
      id: edgeIdFor('e879e4', 'b0653a'),
      source: 'e879e4',
      target: 'b0653a',
    })
    expect(withEdge(once, 'e879e4', 'b0653a')).toBe(once)
    expect(withoutEdge(once, edgeIdFor('e879e4', 'b0653a')).edges).toEqual(diagram.edges)
  })
})

describe('canConnect', () => {
  it('allows any number of edges in and out, including a cycle', () => {
    // b0653a already has an incoming edge from the Success branch.
    expect(canConnect(diagram, 'e879e4', 'b0653a')).toBeNull()
    expect(canConnect(diagram, 'e879e4', 'd09c08')).toBeNull()
  })

  it('refuses a self link, a missing node and a duplicate', () => {
    expect(canConnect(diagram, 'b6a0c1', 'b6a0c1')).toMatch(/itself/i)
    expect(canConnect(diagram, 'b6a0c1', 'ghost')).toMatch(/no longer exists/i)
    expect(canConnect(diagram, 'b6a0c1', 'e879e4')).toMatch(/already connected/i)
  })

  it('treats the reverse of an edge as a different edge', () => {
    expect(canConnect(diagram, 'e879e4', 'b6a0c1')).toBeNull()
  })
})

describe('withNodesRemoved and withPositions', () => {
  it('removes several nodes and their edges at once, and moves several at once', () => {
    const removed = withNodesRemoved(diagram, ['b6a0c1', 'e879e4'])
    expect(removed.nodes.map((node) => node.id)).not.toContain('b6a0c1')
    expect(removed.nodes.map((node) => node.id)).not.toContain('e879e4')
    expect(removed.edges.every((edge) => edge.target !== 'b6a0c1')).toBe(true)

    const moved = withPositions(diagram, { b6a0c1: { x: 1, y: 2 }, ghost: { x: 0, y: 0 } })
    expect(moved.nodes.find((node) => node.id === 'b6a0c1').position).toEqual({ x: 1, y: 2 })
    expect(moved.nodes).toHaveLength(diagram.nodes.length)
  })
})

describe('withEdgeLabel', () => {
  it('sets a trimmed label, and an empty one removes it', () => {
    const id = 'e-d09c08-b0653a'
    const labelled = withEdgeLabel(diagram, id, '  In hours  ')
    expect(labelled.edges.find((edge) => edge.id === id).label).toBe('In hours')

    const cleared = withEdgeLabel(diagram, id, '   ')
    expect('label' in cleared.edges.find((edge) => edge.id === id)).toBe(false)
  })
})
