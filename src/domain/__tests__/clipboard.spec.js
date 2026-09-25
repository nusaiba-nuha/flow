import { describe, expect, it } from 'vitest'

import { copySelection, PASTE_OFFSET, pasteInto } from '../clipboard.js'
import { parseFlow, serialiseFlow } from '../flowText.js'

const diagram = parseFlow(
  [
    'title: Shop',
    'api = process "API" -- REST',
    'db = database "Orders"',
    'cache = database "Redis"',
    'api -> db : SQL',
    'api -> cache',
    '@layout',
    'api 100,0',
    'db 0,200',
  ].join('\n'),
).document

describe('copySelection', () => {
  it('keeps the chosen shapes, the edges between them, and a position for each', () => {
    const copy = copySelection(diagram, ['api', 'cache'])

    expect(copy.nodes.map((node) => node.id)).toEqual(['api', 'cache'])
    expect(copy.edges.map((edge) => edge.id)).toEqual(['e-api-cache'])
    copy.nodes.forEach((node) => expect(node.position).toEqual(expect.any(Object)))
    // A copy travels as text and comes back the same.
    expect(parseFlow(serialiseFlow(copy)).document.nodes).toHaveLength(2)
  })
})

describe('pasteInto', () => {
  it('adds a copy with fresh ids, its own edges, moved along from the original', () => {
    const { document, ids } = pasteInto(diagram, copySelection(diagram, ['api', 'db']))

    expect(ids).toEqual(['api-2', 'db-2'])
    expect(document.nodes).toHaveLength(5)
    expect(document.nodes.find((node) => node.id === 'api-2')).toMatchObject({
      name: 'API',
      data: { description: 'REST' },
      position: { x: 100 + PASTE_OFFSET, y: PASTE_OFFSET },
    })
    expect(document.edges.at(-1)).toEqual({
      id: 'e-api-2-db-2',
      source: 'api-2',
      target: 'db-2',
      label: 'SQL',
    })
    expect(diagram.nodes).toHaveLength(3)
  })

  it('moves each further paste of the same copy further along', () => {
    const copy = copySelection(diagram, ['db'])
    const third = pasteInto(diagram, copy, 3).document.nodes.at(-1)

    expect(third.position).toEqual({ x: 3 * PASTE_OFFSET, y: 200 + 3 * PASTE_OFFSET })
  })

  it('places text with no layout to the right of the diagram, keeping free ids', () => {
    const copy = parseFlow(
      'queue = data "Queue"\nworker = process "Worker"\nqueue -> worker',
    ).document
    const { document, ids } = pasteInto(diagram, copy)
    const queue = document.nodes.find((node) => node.id === 'queue')

    expect(ids).toEqual(['queue', 'worker'])
    expect(queue.position.x).toBeGreaterThan(300)
  })

  it('makes a pasted copy of an imported shape yours', () => {
    const imported = {
      ...diagram,
      nodes: diagram.nodes.map((node) => ({ ...node, data: { ...node.data, origin: 'sql' } })),
      edges: diagram.edges.map((edge) => ({ ...edge, origin: 'sql' })),
    }
    const { document } = pasteInto(imported, copySelection(imported, ['api', 'db']))

    expect(document.nodes.at(-1).data).toEqual({})
    expect(document.edges.at(-1)).not.toHaveProperty('origin')
  })
})
