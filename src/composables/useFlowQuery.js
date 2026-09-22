import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { fetchFlow } from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { payloadToGraph, toNodeId } from '@/domain/graph.js'

/**
 * Server state lives here and only here. Query owns the flow, Pinia owns state
 * with no server counterpart, so there is nothing to keep in sync.
 *
 * @returns {{
 *   nodes: import('vue').ComputedRef<import('@/domain/types.js').VueFlowNode[]>,
 *   edges: import('vue').ComputedRef<import('@/domain/types.js').VueFlowEdge[]>,
 *   isLoading: import('vue').Ref<boolean>,
 *   isError: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<Error | null>,
 *   refetch: () => void,
 * }}
 */
export function useFlowQuery() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: flowKeys.list(),
    queryFn: fetchFlow,
  })

  // Adapt once per payload change, not once per component: the cache entry is
  // shared by reference.
  const graph = computed(() => payloadToGraph(data.value ?? []))

  return {
    nodes: computed(() => graph.value.nodes),
    edges: computed(() => graph.value.edges),
    isLoading,
    isError,
    error,
    refetch,
  }
}

/**
 * One node, read from the cache. The drawer never fetches, which is what makes
 * opening it instant.
 *
 * @param {import('vue').Ref<string> | (() => string)} id
 * @returns {{ node: import('vue').ComputedRef<import('@/domain/types.js').FlowNode | null>, isLoading: import('vue').Ref<boolean> }}
 */
export function useNode(id) {
  const { nodes, isLoading } = useFlowQuery()
  const target = computed(() => toNodeId(typeof id === 'function' ? id() : id.value))

  return {
    node: computed(() => nodes.value.find((node) => node.id === target.value)?.data.node ?? null),
    isLoading,
  }
}
