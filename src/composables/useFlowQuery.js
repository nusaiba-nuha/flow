import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { fetchFlow } from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { emptyDocument } from '@/domain/document.js'
import { documentToGraph, toNodeId } from '@/domain/graph.js'

/** Query owns the flow. Pinia owns only state with no server counterpart. */
export function useFlowQuery() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: flowKeys.list(),
    queryFn: fetchFlow,
  })

  // Once per document change, not once per component: callers share the cache entry.
  const graph = computed(() => documentToGraph(data.value))

  return {
    document: computed(() => data.value ?? emptyDocument()),
    nodes: computed(() => graph.value.nodes),
    edges: computed(() => graph.value.edges),
    isLoading,
    isError,
    error,
    refetch,
  }
}

/**
 * Read from the cache, never fetch: opening the drawer costs no request.
 * @param {import('vue').Ref<string> | (() => string)} id
 */
export function useNode(id) {
  const { nodes, isLoading } = useFlowQuery()
  const target = computed(() => toNodeId(typeof id === 'function' ? id() : id.value))

  return {
    node: computed(() => nodes.value.find((node) => node.id === target.value)?.data.node ?? null),
    isLoading,
  }
}
