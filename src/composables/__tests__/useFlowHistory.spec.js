import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import payload from '@/tests/fixtures/payload.json'
import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { useDeleteNode } from '../useNodeMutations.js'
import { useFlowHistory } from '../useFlowHistory.js'
import { withSetup, waitUntil } from '@/tests/utils.js'

const flowIn = (queryClient) => queryClient.getQueryData(flowKeys.list())

beforeEach(() => {
  setActivePinia(createPinia())
  flowApi.resetFlow()
  vi.restoreAllMocks()
  vi.stubEnv('VITE_PAYLOAD_URL', '')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => structuredClone(payload) })),
  )
})

/** One setup, so the mutation and the history share a query client. */
function setup() {
  const { result, queryClient } = withSetup(() => ({
    remove: useDeleteNode(),
    history: useFlowHistory(),
  }))
  queryClient.setQueryData(flowKeys.list(), structuredClone(payload))
  return { result, queryClient }
}

describe('useFlowHistory', () => {
  it('takes back a delete and puts it back again', async () => {
    const { result, queryClient } = setup()

    result.remove.mutate({ id: 'b6a0c1' })
    await waitUntil(() => result.history.history.canUndo)
    expect(flowIn(queryClient)).toHaveLength(payload.length - 1)

    result.history.undo()
    await waitUntil(() => flowIn(queryClient).length === payload.length)

    result.history.redo()
    await waitUntil(() => flowIn(queryClient).length === payload.length - 1)
  })

  it('names the change it would take back', async () => {
    const { result } = setup()

    expect(result.history.history.canUndo).toBe(false)
    result.remove.mutate({ id: 'b6a0c1' })
    await waitUntil(() => result.history.history.canUndo)

    expect(result.history.history.undoLabel).toBe('Delete node')
  })

  it('records nothing when the mutation fails', async () => {
    vi.spyOn(flowApi, 'deleteNode').mockRejectedValue(new Error('nope'))
    const { result } = setup()

    result.remove.mutate({ id: 'b6a0c1' })
    await waitUntil(() => result.remove.isError.value)

    expect(result.history.history.canUndo).toBe(false)
  })
})
