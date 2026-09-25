import { beforeEach, describe, expect, it } from 'vitest'

import starter from '../starterDiagram.json'
import { NODE_TYPE } from '@/domain/constants.js'
import {
  createNode,
  deleteNode,
  fetchFlow,
  resetFlow,
  restoreFlow,
  STORAGE_KEY,
  updateNode,
} from '../flowApi.js'

beforeEach(() => {
  resetFlow()
})

describe('loading', () => {
  it('seeds from the bundled starter and hands back copies', async () => {
    const first = await fetchFlow()
    first[1].name = 'tampered'

    const second = await fetchFlow()
    expect(second).toEqual(starter)
    expect(second[1].name).not.toBe('tampered')
  })

  it('needs no network', async () => {
    const fetchSpy = globalThis.fetch
    globalThis.fetch = () => Promise.reject(new Error('offline'))
    try {
      await expect(fetchFlow()).resolves.toHaveLength(starter.length)
    } finally {
      globalThis.fetch = fetchSpy
    }
  })

  it('serves a reload from storage, and falls back when storage holds junk', async () => {
    await updateNode({ id: 'b6a0c1', patch: { name: 'Renamed' } })
    resetFlow({ clearStorage: false })

    const reloaded = await fetchFlow()
    expect(reloaded.find((node) => node.id === 'b6a0c1').name).toBe('Renamed')

    localStorage.setItem(STORAGE_KEY, 'not json')
    resetFlow({ clearStorage: false })
    await expect(fetchFlow()).resolves.toHaveLength(starter.length)
  })
})

describe('mutations', () => {
  it('creates a node from the selected option, with branches for business hours', async () => {
    const message = await createNode({
      title: 'Follow up',
      description: 'Thanks for waiting',
      nodeType: NODE_TYPE.SEND_MESSAGE,
    })
    expect(message.data.payload[0].text).toBe('Thanks for waiting')

    const hours = await createNode({ title: 'Hours', description: '', nodeType: 'businessHours' })
    const flow = await fetchFlow()
    const branches = flow.filter((node) => node.parentId === hours.id)

    expect(hours.type).toBe(NODE_TYPE.DATE_TIME)
    expect(branches.map((branch) => branch.data.connectorType).sort()).toEqual([
      'failure',
      'success',
    ])
  })

  it('rejects an unknown type and an id that is not there', async () => {
    await expect(createNode({ title: 'x', description: '', nodeType: 'nope' })).rejects.toThrow(
      /unknown node type/i,
    )
    await expect(updateNode({ id: 'ghost', patch: {} })).rejects.toThrow(/no longer exists/i)
    await expect(deleteNode({ id: 'ghost' })).rejects.toThrow(/no longer exists/i)
  })

  it('merges into data rather than replacing it, and stores a dragged position', async () => {
    const node = await updateNode({
      id: 'd09c08',
      patch: { data: { timezone: 'Asia/Kuala_Lumpur' }, position: { x: 120, y: 340 } },
    })

    expect(node.data.timezone).toBe('Asia/Kuala_Lumpur')
    expect(node.data.times).toHaveLength(7)
    expect(node.position).toEqual({ x: 120, y: 340 })
  })

  it('deletes through the domain rule, re-parenting children', async () => {
    await deleteNode({ id: 'b6a0c1' })
    const flow = await fetchFlow()
    expect(flow.find((node) => node.id === 'e879e4').parentId).toBe('28c4b9')
  })
})

describe('restoreFlow', () => {
  it('discards local changes and clears the saved copy', async () => {
    await updateNode({ id: 'b6a0c1', patch: { name: 'Renamed' } })
    await restoreFlow()

    resetFlow({ clearStorage: false })
    const flow = await fetchFlow()
    expect(flow.find((node) => node.id === 'b6a0c1').name).toBe('Away Message')
  })
})
