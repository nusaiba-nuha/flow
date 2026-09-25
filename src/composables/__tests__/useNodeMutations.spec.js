import { beforeEach, describe, expect, it, vi } from 'vitest'

import starter from '@/api/starterDiagram.json'
import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { useCreateNode, useDeleteNode, useMoveNode } from '../useNodeMutations.js'
import { withSetup, waitUntil } from '@/tests/utils.js'

/** Seed the cache the way the query would, then hand back both halves. */
function withFlow(composable) {
  const setup = withSetup(composable)
  setup.queryClient.setQueryData(flowKeys.list(), structuredClone(starter))
  return setup
}

const flowIn = (queryClient) => queryClient.getQueryData(flowKeys.list())

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

    expect(flowIn(queryClient)).toHaveLength(starter.length)
  })

  it('drops an optimistic node when the create fails', async () => {
    vi.spyOn(flowApi, 'createNode').mockRejectedValue(new Error('nope'))
    const { result, queryClient } = withFlow(() => useCreateNode())

    result.mutate({ title: 'Ghost', description: '', nodeType: 'sendMessage' })
    await waitUntil(() => result.isError.value)

    expect(flowIn(queryClient).some((node) => node.name === 'Ghost')).toBe(false)
  })
})

describe('applied changes', () => {
  it('shows a created node before the server answers, branches included', async () => {
    const { result, queryClient } = withFlow(() => useCreateNode())

    result.mutate({ title: 'Hours', description: '', nodeType: 'businessHours' })
    await waitUntil(() => flowIn(queryClient).some((node) => node.name === 'Hours'))

    const created = flowIn(queryClient).find((node) => node.name === 'Hours')
    const branches = flowIn(queryClient).filter((node) => node.parentId === created.id)
    expect(created.type).toBe('dateTime')
    expect(branches).toHaveLength(2)
  })

  it('keeps a dragged position without refetching over it', async () => {
    const { result, queryClient } = withFlow(() => useMoveNode())

    result.mutate({ id: 'b6a0c1', position: { x: 400, y: 120 } })
    await waitUntil(() => result.isSuccess.value)

    const moved = flowIn(queryClient).find((node) => node.id === 'b6a0c1')
    expect(moved.position).toEqual({ x: 400, y: 120 })
  })
})
