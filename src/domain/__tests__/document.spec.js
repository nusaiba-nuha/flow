import { describe, expect, it } from 'vitest'

import { DOCUMENT_VERSION, edgeIdFor, emptyDocument, migrate } from '../document.js'

const v1 = [
  { id: 1, parentId: -1, type: 'trigger', data: {} },
  { id: 'a1', parentId: 1, type: 'sendMessage', name: 'Hello', data: {} },
  {
    id: 'b2',
    parentId: 'a1',
    type: 'addComment',
    name: 'Note',
    data: {},
    position: { x: 4, y: 8 },
  },
  { id: 'c3', parentId: 'ghost', type: 'addComment', name: 'Orphan', data: {} },
]

describe('migrate', () => {
  it('lifts a v1 array: parentId becomes an edge, ids become strings', () => {
    const document = migrate(v1)

    expect(document.version).toBe(DOCUMENT_VERSION)
    expect(document.nodes.map((node) => node.id)).toEqual(['1', 'a1', 'b2', 'c3'])
    expect(document.nodes.every((node) => !('parentId' in node))).toBe(true)
    expect(document.nodes[2].position).toEqual({ x: 4, y: 8 })
    expect(document.edges).toEqual([
      { id: edgeIdFor('1', 'a1'), source: '1', target: 'a1' },
      { id: edgeIdFor('a1', 'b2'), source: 'a1', target: 'b2' },
    ])
  })

  it('keeps a v2 document as it is, and fills in what is missing', () => {
    const document = migrate({
      nodes: [{ id: 7, type: 'addComment' }],
      edges: [{ source: 7, target: 7 }],
    })

    expect(document.title).toBe(emptyDocument().title)
    expect(document.nodes[0].id).toBe('7')
    expect(document.edges[0]).toEqual({ id: edgeIdFor('7', '7'), source: '7', target: '7' })
    expect(migrate(migrate(v1))).toEqual(migrate(v1))
  })

  it('refuses anything that is not a document', () => {
    expect(() => migrate('nope')).toThrow(/not a flow document/i)
    expect(() => migrate({ nodes: 'nope' })).toThrow(/not a flow document/i)
    expect(() => migrate(null)).toThrow(/not a flow document/i)
  })
})
