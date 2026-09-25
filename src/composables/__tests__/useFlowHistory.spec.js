import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import starter from '@/domain/samples/support.json'
import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { useDeleteNode, useReplaceDocument } from '../useNodeMutations.js'
import { useFlowHistory } from '../useFlowHistory.js'
import { withSetup, waitUntil } from '@/tests/utils.js'

const flowIn = (queryClient) => queryClient.getQueryData(flowKeys.list()).nodes

beforeEach(() => {
  setActivePinia(createPinia())
  flowApi.resetFlow()
  vi.restoreAllMocks()
})

/** One setup, so the mutation and the history share a query client. */
function setup() {
  const { result, queryClient } = withSetup(() => ({
    remove: useDeleteNode(),
    history: useFlowHistory(),
  }))
  queryClient.setQueryData(flowKeys.list(), structuredClone(starter))
  return { result, queryClient }
}

describe('useFlowHistory', () => {
  it('takes back a delete and puts it back again', async () => {
    const { result, queryClient } = setup()

    result.remove.mutate({ id: 'b6a0c1' })
    await waitUntil(() => result.history.history.canUndo)
    expect(flowIn(queryClient)).toHaveLength(starter.nodes.length - 1)

    result.history.undo()
    await waitUntil(() => flowIn(queryClient).length === starter.nodes.length)

    result.history.redo()
    await waitUntil(() => flowIn(queryClient).length === starter.nodes.length - 1)
  })

  it('waits for a change still being saved, so undo takes back that one', async () => {
    const { result, queryClient } = setup()

    result.remove.mutate({ id: 'b6a0c1' })
    await waitUntil(() => result.history.history.canUndo)
    // A second delete, undone before it has landed.
    result.remove.mutate({ id: 'e879e4' })
    await result.history.undo()
    await waitUntil(() => !queryClient.isMutating() && !queryClient.isFetching())

    expect(flowIn(queryClient)).toHaveLength(starter.nodes.length - 1)
    expect(flowIn(queryClient).some((node) => node.id === 'e879e4')).toBe(true)
    expect(flowIn(queryClient).some((node) => node.id === 'b6a0c1')).toBe(false)
  })

  it('stacks changes in the order they were made, not the order they were saved', async () => {
    const slow = flowApi.deleteNode
    vi.spyOn(flowApi, 'deleteNode').mockImplementation(async (input) => {
      await new Promise((resolve) => setTimeout(resolve, 400))
      return slow(input)
    })
    const { result, queryClient } = withSetup(() => ({
      remove: useDeleteNode(),
      replace: useReplaceDocument('Tidy up'),
      history: useFlowHistory(),
    }))
    queryClient.setQueryData(flowKeys.list(), structuredClone(starter))

    result.remove.mutate({ id: 'b6a0c1' })
    result.replace.mutate({ ...structuredClone(starter), title: 'Tidied' })
    await waitUntil(() => !queryClient.isMutating())

    expect(result.history.history.undoLabel).toBe('Tidy up')
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
