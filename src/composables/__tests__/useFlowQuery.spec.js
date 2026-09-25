import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import starter from '@/api/starterDiagram.json'
import * as flowApi from '@/api/flowApi.js'
import { withSetup, waitUntil } from '@/tests/utils.js'
import { useFlowQuery, useNode } from '../useFlowQuery.js'

beforeEach(() => {
  vi.restoreAllMocks()
  flowApi.resetFlow()
})

describe('useFlowQuery', () => {
  it('starts empty, then exposes the adapted graph', async () => {
    const { result } = withSetup(() => useFlowQuery())
    expect(result.nodes.value).toEqual([])

    await waitUntil(() => result.nodes.value.length > 0)
    expect(result.nodes.value).toHaveLength(starter.length)
    expect(result.edges.value).toHaveLength(starter.length - 1)
  })

  it('reports a failed load instead of hanging on loading', async () => {
    vi.spyOn(flowApi, 'fetchFlow').mockRejectedValue(new Error('Could not load the flow.'))
    const { result } = withSetup(() => useFlowQuery())
    await waitUntil(() => result.isError.value)

    expect(result.error.value?.message).toMatch(/could not load the flow/i)
  })
})

describe('useNode', () => {
  it('reads from the cache, and returns null for an id that is not there', async () => {
    const { result, queryClient } = withSetup(() => useNode(ref('b6a0c1')))
    await waitUntil(() => result.node.value !== null)

    expect(result.node.value?.name).toBe('Away Message')
    expect(queryClient.getQueryData(['flow', 'list'])).toBeDefined()

    const ghost = withSetup(() => useNode(ref('ghost')), { queryClient })
    expect(ghost.result.node.value).toBeNull()
  })
})
