import { describe, expect, it } from 'vitest'

import payload from '../../../public/payload.json'
import { NODE_TYPE } from '../constants.js'
import {
  buildEdges,
  connectorLabel,
  normaliseNode,
  payloadToGraph,
  toNodeId,
  withNodeRemoved,
} from '../graph.js'

const nodes = payload.map(normaliseNode)
const byId = (id) => nodes.find((node) => node.id === id)

describe('toNodeId', () => {
  it('normalises the numeric trigger id, so route params can match it', () => {
    expect(toNodeId(1)).toBe('1')
    expect(toNodeId('b6a0c1')).toBe('b6a0c1')
  })
})

describe('normaliseNode', () => {
  it('names a node the payload left unnamed', () => {
    expect(normaliseNode({ id: 1, parentId: -1, type: NODE_TYPE.TRIGGER }).name).toBe('Trigger')
  })

  it('defaults missing data to an empty object', () => {
    expect(normaliseNode({ id: 'x', parentId: 1, type: NODE_TYPE.ADD_COMMENT }).data).toEqual({})
  })

  it('carries no position for a payload node', () => {
    expect(byId('b6a0c1').position).toBeNull()
  })
})

describe('buildEdges', () => {
  it('creates one edge per node with a resolvable parent', () => {
    expect(buildEdges(nodes)).toHaveLength(payload.length - 1)
  })

  it('skips the root sentinel', () => {
    expect(buildEdges(nodes).some((edge) => edge.source === '-1')).toBe(false)
  })

  it('drops an edge whose parent is missing rather than throwing', () => {
    const orphan = [normaliseNode({ id: 'a', parentId: 'ghost', type: NODE_TYPE.ADD_COMMENT })]
    expect(buildEdges(orphan)).toEqual([])
  })

  it('ignores data.connectors, deriving edges from parentId alone', () => {
    // The dateTime node lists both connectors in data.connectors as well.
    const fromParent = buildEdges(nodes).filter((edge) => edge.source === 'd09c08')
    expect(fromParent.map((edge) => edge.target).sort()).toEqual(['161f52', '28c4b9'])
  })

  it('leaves edges unlabelled, because the connector node names the branch', () => {
    expect(buildEdges(nodes).every((edge) => edge.label === undefined)).toBe(true)
  })
})

describe('connectorLabel', () => {
  it('names each branch', () => {
    expect(connectorLabel(byId('161f52'))).toBe('Success')
    expect(connectorLabel(byId('28c4b9'))).toBe('Failure')
  })

  it('returns null for anything that is not a connector', () => {
    expect(connectorLabel(byId('1'))).toBeNull()
  })
})

describe('payloadToGraph', () => {
  it('returns one positioned node per payload entry', () => {
    const { nodes: graphNodes } = payloadToGraph(payload)

    expect(graphNodes).toHaveLength(payload.length)
    graphNodes.forEach((node) => {
      expect(typeof node.position.x).toBe('number')
      expect(typeof node.position.y).toBe('number')
    })
  })

  it('keeps the domain node available under data.node', () => {
    const { nodes: graphNodes } = payloadToGraph(payload)
    expect(graphNodes.find((node) => node.id === 'b6a0c1')?.data.node.name).toBe('Away Message')
  })

  it('survives an empty payload', () => {
    expect(payloadToGraph([])).toEqual({ nodes: [], edges: [] })
  })
})

describe('withNodeRemoved', () => {
  it('removes the node', () => {
    const flow = withNodeRemoved(payload, 'e879e4')

    expect(flow.some((node) => toNodeId(node.id) === 'e879e4')).toBe(false)
    expect(flow).toHaveLength(payload.length - 1)
  })

  it('re-parents children rather than cascading', () => {
    // Away Message sits between the Failure connector and Add Comment #1.
    const flow = withNodeRemoved(payload, 'b6a0c1')
    expect(flow.find((node) => node.id === 'e879e4').parentId).toBe('28c4b9')
  })

  it('takes a dateTime node connectors with it', () => {
    const ids = withNodeRemoved(payload, 'd09c08').map((node) => toNodeId(node.id))

    expect(ids).not.toContain('d09c08')
    expect(ids).not.toContain('161f52')
    expect(ids).not.toContain('28c4b9')
  })

  it('moves a removed connector children up to the deleted node parent', () => {
    const flow = withNodeRemoved(payload, 'd09c08')

    expect(flow.find((node) => node.id === 'b0653a').parentId).toBe('1')
    expect(flow.find((node) => node.id === 'b6a0c1').parentId).toBe('1')
  })

  it('leaves the flow untouched for an id that is not there', () => {
    expect(withNodeRemoved(payload, 'ghost')).toBe(payload)
  })

  it('resolves the numeric trigger id from its string form', () => {
    expect(withNodeRemoved(payload, '1').some((node) => toNodeId(node.id) === '1')).toBe(false)
  })
})
