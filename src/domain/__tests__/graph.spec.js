import { describe, expect, it } from 'vitest'

import payload from '@/tests/fixtures/diagram.json'
import { NODE_TYPE } from '../constants.js'
import {
  buildEdges,
  canConnect,
  normaliseNode,
  documentToGraph,
  withNodeRemoved,
} from '../graph.js'

describe('documentToGraph', () => {
  it('turns the payload into positioned nodes carrying their domain node', () => {
    const { nodes, edges } = documentToGraph(payload)

    expect(nodes).toHaveLength(payload.length)
    expect(edges).toHaveLength(payload.length - 1)
    // The trigger's id is the number 1 in the payload; route params are strings.
    expect(nodes.find((node) => node.id === '1')).toBeDefined()
    expect(nodes.find((node) => node.id === 'b6a0c1').data.node.name).toBe('Away Message')
    expect(documentToGraph([])).toEqual({ nodes: [], edges: [] })
  })
})

describe('buildEdges', () => {
  it('derives branches from parentId, ignoring data.connectors and missing parents', () => {
    const nodes = payload.map(normaliseNode)
    const branches = buildEdges(nodes).filter((edge) => edge.source === 'd09c08')

    expect(branches.map((edge) => edge.target).sort()).toEqual(['161f52', '28c4b9'])
    expect(
      buildEdges([normaliseNode({ id: 'a', parentId: 'ghost', type: NODE_TYPE.ADD_COMMENT })]),
    ).toEqual([])
  })
})

describe('withNodeRemoved', () => {
  it('re-parents children, but takes a dateTime node connectors with it', () => {
    // Away Message sits between the Failure connector and Add Comment #1.
    expect(withNodeRemoved(payload, 'b6a0c1').find((n) => n.id === 'e879e4').parentId).toBe(
      '28c4b9',
    )

    const flow = withNodeRemoved(payload, 'd09c08')
    const ids = flow.map((node) => String(node.id))
    expect(ids).not.toContain('161f52')
    expect(ids).not.toContain('28c4b9')
    expect(flow.find((node) => node.id === 'b0653a').parentId).toBe('1')

    expect(withNodeRemoved(payload, 'ghost')).toBe(payload)
  })
})

describe('canConnect', () => {
  it('allows a node to move under another', () => {
    expect(canConnect(payload, 'd09c08', 'e879e4')).toBeNull()
  })

  it('refuses a loop, a self link and the branch connectors', () => {
    // b6a0c1 already sits under 28c4b9, which sits under d09c08.
    expect(canConnect(payload, 'e879e4', 'd09c08')).toMatch(/loop/i)
    expect(canConnect(payload, 'b6a0c1', 'b6a0c1')).toMatch(/itself/i)
    expect(canConnect(payload, 'b6a0c1', '161f52')).toMatch(/branches belong/i)
    expect(canConnect(payload, 'b6a0c1', '1')).toMatch(/trigger/i)
  })

  it('says when two nodes are already connected', () => {
    expect(canConnect(payload, 'b6a0c1', 'e879e4')).toMatch(/already connected/i)
  })
})
