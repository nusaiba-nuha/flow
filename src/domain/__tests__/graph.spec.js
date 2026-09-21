import { describe, expect, it } from 'vitest'

import payload from '../../../public/payload.json'
import { NODE_TYPE } from '../constants.js'
import { buildEdges, normaliseNode, payloadToGraph, withNodeRemoved } from '../graph.js'

describe('payloadToGraph', () => {
  it('turns the payload into positioned nodes carrying their domain node', () => {
    const { nodes, edges } = payloadToGraph(payload)

    expect(nodes).toHaveLength(payload.length)
    expect(edges).toHaveLength(payload.length - 1)
    // The trigger's id is the number 1 in the payload; route params are strings.
    expect(nodes.find((node) => node.id === '1')).toBeDefined()
    expect(nodes.find((node) => node.id === 'b6a0c1').data.node.name).toBe('Away Message')
    expect(payloadToGraph([])).toEqual({ nodes: [], edges: [] })
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
