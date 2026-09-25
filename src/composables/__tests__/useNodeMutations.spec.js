import { beforeEach, describe, expect, it, vi } from 'vitest'

import starter from '@/domain/samples/support.json'
import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { edgeIdFor } from '@/domain/graph.js'
import {
  useConnectNodes,
  useCreateNode,
  useDeleteNode,
  useDeleteNodes,
  useDisconnect,
  useMoveNode,
  useMoveNodes,
  useNewDiagram,
} from '../useNodeMutations.js'
import { withSetup, waitUntil } from '@/tests/utils.js'

/** Seed the cache the way the query would, then hand back both halves. */
function withFlow(composable) {
  const setup = withSetup(composable)
  setup.queryClient.setQueryData(flowKeys.list(), structuredClone(starter))
  return setup
}

const flowIn = (queryClient) => queryClient.getQueryData(flowKeys.list()).nodes
const edgesIn = (queryClient) => queryClient.getQueryData(flowKeys.list()).edges

beforeEach(() => {
  vi.restoreAllMocks()
  flowApi.resetFlow()
})

describe('rollback', () => {
  it('puts the flow back when the server rejects a delete', async () => {
    vi.spyOn(flowApi, 'deleteNode').mockRejectedValue(new Error('nope'))
    const { result, queryClient } = withFlow(() => useDeleteNode())

    result.mutate({ id: 'b6a0c1' })
    await waitUntil(() => result.isError.value)

    expect(flowIn(queryClient)).toHaveLength(starter.nodes.length)
  })

  it('takes an optimistic edge back when the connect fails', async () => {
    vi.spyOn(flowApi, 'connectNodes').mockRejectedValue(new Error('nope'))
    const { result, queryClient } = withFlow(() => useConnectNodes())

    result.mutate({ source: 'e879e4', target: 'b0653a' })
    await waitUntil(() => result.isError.value)

    expect(edgesIn(queryClient)).toHaveLength(starter.edges.length)
  })

  it('drops an optimistic node when the create fails', async () => {
    vi.spyOn(flowApi, 'createNode').mockRejectedValue(new Error('nope'))
    const { result, queryClient } = withFlow(() => useCreateNode())

    result.mutate({ title: 'Ghost', description: '', shape: 'process' })
    await waitUntil(() => result.isError.value)

    expect(flowIn(queryClient).some((node) => node.name === 'Ghost')).toBe(false)
  })
})

describe('applied changes', () => {
  it('shows a created node before the server answers', async () => {
    const { result, queryClient } = withFlow(() => useCreateNode())

    result.mutate({ title: 'Check', description: '', shape: 'decision' })
    await waitUntil(() => flowIn(queryClient).some((node) => node.name === 'Check'))

    expect(flowIn(queryClient).find((node) => node.name === 'Check').type).toBe('decision')
  })

  it('keeps a dragged position without refetching over it', async () => {
    const { result, queryClient } = withFlow(() => useMoveNode())

    result.mutate({ id: 'b6a0c1', position: { x: 400, y: 120 } })
    await waitUntil(() => result.isSuccess.value)

    const moved = flowIn(queryClient).find((node) => node.id === 'b6a0c1')
    expect(moved.position).toEqual({ x: 400, y: 120 })
  })
  it('adds a second incoming edge and pins the target where it was', async () => {
    const { result, queryClient } = withFlow(() => useConnectNodes())

    // b0653a already has an incoming edge from Business Hours.
    result.mutate({ source: 'e879e4', target: 'b0653a', position: { x: 10, y: 20 } })
    await waitUntil(() => result.isSuccess.value)

    const into = edgesIn(queryClient).filter((edge) => edge.target === 'b0653a')
    expect(into.map((edge) => edge.source).sort()).toEqual(['d09c08', 'e879e4'])
    expect(flowIn(queryClient).find((node) => node.id === 'b0653a').position).toEqual({
      x: 10,
      y: 20,
    })
  })

  it('removes a connection and keeps both nodes', async () => {
    const { result, queryClient } = withFlow(() => useDisconnect())
    const id = edgeIdFor('d09c08', 'b6a0c1')

    result.mutate({ id, target: 'b6a0c1' })
    await waitUntil(() => result.isSuccess.value)

    expect(edgesIn(queryClient).some((edge) => edge.id === id)).toBe(false)
    expect(flowIn(queryClient)).toHaveLength(starter.nodes.length)
  })
  it('replaces the whole diagram in one step', async () => {
    const { result, queryClient } = withFlow(() => useNewDiagram())

    result.mutate({ version: 3, title: 'Blank', nodes: [], edges: [] })
    await waitUntil(() => result.isSuccess.value)

    expect(flowIn(queryClient)).toEqual([])
    expect((await flowApi.fetchFlow()).title).toBe('Blank')
  })
  it('deletes a selection in one write', async () => {
    const { result, queryClient } = withFlow(() => useDeleteNodes())

    result.mutate({ ids: ['b6a0c1', 'e879e4'] })
    await waitUntil(() => result.isSuccess.value || result.isError.value)

    expect(result.error.value).toBeNull()
    expect(flowIn(queryClient).map((node) => node.id)).not.toContain('b6a0c1')
    expect((await flowApi.fetchFlow()).nodes).toHaveLength(starter.nodes.length - 2)
  })

  it('moves a selection in one write', async () => {
    const { result } = withFlow(() => useMoveNodes())

    result.mutate({ positions: { b6a0c1: { x: 1, y: 2 }, e879e4: { x: 3, y: 4 } } })
    await waitUntil(() => result.isSuccess.value || result.isError.value)

    expect(result.error.value).toBeNull()
    const saved = (await flowApi.fetchFlow()).nodes
    expect(saved.find((node) => node.id === 'e879e4').position).toEqual({ x: 3, y: 4 })
  })
})
