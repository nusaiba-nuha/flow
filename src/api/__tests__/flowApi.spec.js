import { beforeEach, describe, expect, it, vi } from 'vitest'

import payload from '@/tests/fixtures/payload.json'
import { NODE_TYPE } from '@/domain/constants.js'
import {
  createNode,
  deleteNode,
  fetchFlow,
  payloadUrl,
  resetFlow,
  restoreFlow,
  storageKey,
  updateNode,
} from '../flowApi.js'

beforeEach(() => {
  resetFlow()
  // Pinned, so the suite does not depend on whatever .env holds locally.
  vi.stubEnv('VITE_PAYLOAD_URL', '')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => structuredClone(payload) })),
  )
})

describe('loading', () => {
  it('reads the source once, then serves from memory, and hands back copies', async () => {
    const first = await fetchFlow()
    first[0].name = 'tampered'

    const second = await fetchFlow()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(second).toHaveLength(payload.length)
    expect(second[0].name).not.toBe('tampered')
  })

  it('surfaces a failed load instead of returning nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 })),
    )
    await expect(fetchFlow()).rejects.toThrow(/could not load the flow \(404\)/i)
  })
})

describe('payload source', () => {
  it('defaults to the local file and follows VITE_PAYLOAD_URL', async () => {
    expect(payloadUrl()).toBe('/payload.json')

    vi.stubEnv('VITE_PAYLOAD_URL', 'https://example.test/flow.json')
    expect(payloadUrl()).toBe('https://example.test/flow.json')

    await fetchFlow()
    expect(fetch).toHaveBeenCalledWith('https://example.test/flow.json')
  })

  it('keys saved state by source, so switching does not serve the old copy', async () => {
    await updateNode({ id: 'b6a0c1', patch: { name: 'Local only' } })
    const local = storageKey()
    resetFlow({ clearStorage: false })

    vi.stubEnv('VITE_PAYLOAD_URL', 'https://example.test/flow.json')
    expect(storageKey()).not.toBe(local)
    await expect(fetchFlow()).resolves.toContainEqual(
      expect.objectContaining({ id: 'b6a0c1', name: 'Away Message' }),
    )
  })

  it('serves a reload from storage, and falls back when storage holds junk', async () => {
    await updateNode({ id: 'b6a0c1', patch: { name: 'Renamed' } })
    resetFlow({ clearStorage: false })
    vi.clearAllMocks()

    const reloaded = await fetchFlow()
    expect(fetch).not.toHaveBeenCalled()
    expect(reloaded.find((node) => node.id === 'b6a0c1').name).toBe('Renamed')

    localStorage.setItem(storageKey(), 'not json')
    resetFlow({ clearStorage: false })
    await expect(fetchFlow()).resolves.toHaveLength(payload.length)
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
