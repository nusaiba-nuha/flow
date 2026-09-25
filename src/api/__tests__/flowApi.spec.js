import { beforeEach, describe, expect, it } from 'vitest'

import starter from '@/domain/samples/support.json'
import { SHAPE } from '@/domain/constants.js'
import {
  createNode,
  connectNodes,
  deleteNode,
  deleteNodes,
  moveNodes,
  disconnect,
  fetchFlow,
  resetFlow,
  replaceFlow,
  STORAGE_KEY,
  updateEdge,
  updateNode,
} from '../flowApi.js'

beforeEach(() => {
  resetFlow()
})

describe('loading', () => {
  it('seeds from the bundled starter and hands back copies', async () => {
    const first = await fetchFlow()
    first.nodes[1].name = 'tampered'

    const second = await fetchFlow()
    expect(second).toEqual(starter)
    expect(second.nodes[1].name).not.toBe('tampered')
  })

  it('needs no network', async () => {
    const fetchSpy = globalThis.fetch
    globalThis.fetch = () => Promise.reject(new Error('offline'))
    try {
      await expect(fetchFlow()).resolves.toEqual(starter)
    } finally {
      globalThis.fetch = fetchSpy
    }
  })

  it('serves a reload from storage, and falls back when storage holds junk', async () => {
    await updateNode({ id: 'b6a0c1', patch: { name: 'Renamed' } })
    resetFlow({ clearStorage: false })

    const reloaded = await fetchFlow()
    expect(reloaded.nodes.find((node) => node.id === 'b6a0c1').name).toBe('Renamed')

    localStorage.setItem(STORAGE_KEY, 'not json')
    resetFlow({ clearStorage: false })
    await expect(fetchFlow()).resolves.toEqual(starter)
  })
})

describe('mutations', () => {
  it('creates a node of the chosen shape, and changes its shape', async () => {
    const node = await createNode({
      title: 'Check stock',
      description: 'Is it in the warehouse?',
      shape: SHAPE.DECISION,
    })
    expect(node).toMatchObject({
      type: 'decision',
      data: { description: 'Is it in the warehouse?' },
    })

    const changed = await updateNode({ id: node.id, patch: { type: SHAPE.DATABASE } })
    expect(changed.type).toBe('database')
  })

  it('rejects an unknown shape and an id that is not there', async () => {
    await expect(createNode({ title: 'x', description: '', shape: 'nope' })).rejects.toThrow(
      /unknown shape/i,
    )
    await expect(updateNode({ id: 'b6a0c1', patch: { type: 'nope' } })).rejects.toThrow(
      /unknown shape/i,
    )
    await expect(updateNode({ id: 'ghost', patch: {} })).rejects.toThrow(/no longer exists/i)
    await expect(deleteNode({ id: 'ghost' })).rejects.toThrow(/no longer exists/i)
  })

  it('merges into data rather than replacing it, and stores a dragged position', async () => {
    const node = await updateNode({
      id: 'd09c08',
      patch: { data: { colour: 'red' }, position: { x: 120, y: 340 } },
    })

    expect(node.data).toEqual({ description: '09:00 - 17:00 - UTC', colour: 'red' })
    expect(node.position).toEqual({ x: 120, y: 340 })
  })

  it('deletes a node with its edges, and leaves its neighbours', async () => {
    await deleteNode({ id: 'b6a0c1' })
    const flow = await fetchFlow()

    expect(flow.nodes.some((node) => node.id === 'e879e4')).toBe(true)
    expect(flow.edges.some((edge) => [edge.source, edge.target].includes('b6a0c1'))).toBe(false)
  })

  it('connects and disconnects, refusing what the domain refuses', async () => {
    const edge = await connectNodes({ source: 'e879e4', target: 'b0653a' })
    expect((await fetchFlow()).edges).toContainEqual(edge)

    await expect(connectNodes({ source: 'e879e4', target: 'b0653a' })).rejects.toThrow(
      /already connected/i,
    )

    await disconnect({ id: edge.id })
    expect((await fetchFlow()).edges).not.toContainEqual(edge)
    await expect(disconnect({ id: edge.id })).rejects.toThrow(/no longer exists/i)
  })
})

describe('selections', () => {
  it('deletes and moves several nodes in one write, refusing an id that is not there', async () => {
    await moveNodes({ positions: { b6a0c1: { x: 10, y: 20 }, e879e4: { x: 30, y: 40 } } })
    let flow = await fetchFlow()
    expect(flow.nodes.find((node) => node.id === 'e879e4').position).toEqual({ x: 30, y: 40 })

    await deleteNodes({ ids: ['b6a0c1', 'e879e4'] })
    flow = await fetchFlow()
    expect(flow.nodes.map((node) => node.id)).not.toContain('b6a0c1')
    expect(flow.nodes.map((node) => node.id)).not.toContain('e879e4')

    await expect(deleteNodes({ ids: ['ghost'] })).rejects.toThrow(/no longer exists/i)
  })
})

describe('updateEdge', () => {
  it('relabels a connection, and refuses one that is gone', async () => {
    const edge = await updateEdge({ id: 'e-d09c08-b0653a', patch: { label: 'Open' } })
    expect(edge.label).toBe('Open')
    expect((await fetchFlow()).edges.find((each) => each.id === edge.id).label).toBe('Open')

    await expect(updateEdge({ id: 'ghost', patch: { label: 'x' } })).rejects.toThrow(
      /no longer exists/i,
    )
  })
})

describe('migration', () => {
  it('opens a v1 document saved by an older version as the current one', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 1, parentId: -1, type: 'trigger', data: {} },
        { id: 'a1', parentId: 1, type: 'addComment', name: 'Kept', data: {} },
      ]),
    )
    resetFlow({ clearStorage: false })

    const flow = await fetchFlow()
    expect(flow.version).toBe(3)
    expect(flow.nodes.map((node) => node.type)).toEqual(['terminal', 'note'])
    expect(flow.edges).toEqual([{ id: 'e-1-a1', source: '1', target: 'a1' }])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).version).toBe(3)
  })
})

describe('replaceFlow', () => {
  it('replaces the whole document, and a reload serves the replacement', async () => {
    await replaceFlow({ version: 3, title: 'Blank', nodes: [], edges: [] })

    resetFlow({ clearStorage: false })
    const flow = await fetchFlow()
    expect(flow).toEqual({ version: 3, title: 'Blank', nodes: [], edges: [] })
  })
})
