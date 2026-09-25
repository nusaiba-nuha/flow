import { useMutation, useQueryClient } from '@tanstack/vue-query'

import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { emptyDocument } from '@/domain/document.js'
import { toNodeId, withEdge, withNodeRemoved, withoutEdge } from '@/domain/graph.js'
import { creatableByValue } from '@/domain/nodeMeta.js'
import { CONNECTOR_TYPE, NODE_TYPE } from '@/domain/constants.js'
import { useHistoryStore } from '@/stores/history.js'

/** @typedef {import('@/domain/types.js').FlowDocument} FlowDocument */

/**
 * Every mutation shares one shape, so all of them behave the same way when the
 * server rejects a change. History is recorded here, so a new mutation cannot
 * forget to be undoable.
 *
 * @param {{
 *   mutationFn: (variables: any) => Promise<any>,
 *   apply: (flow: FlowDocument, variables: any) => FlowDocument,
 *   invalidate?: boolean,
 *   label?: string,
 * }} options
 */
function useOptimisticFlowMutation({ mutationFn, apply, invalidate = true, label = '' }) {
  const queryClient = useQueryClient()
  const history = useHistoryStore()

  return useMutation({
    mutationFn,

    async onMutate(variables) {
      // An in-flight refetch would land after our write and undo it.
      await queryClient.cancelQueries({ queryKey: flowKeys.list() })

      const previous = queryClient.getQueryData(flowKeys.list())
      queryClient.setQueryData(flowKeys.list(), (/** @type {FlowDocument | undefined} */ current) =>
        apply(current ?? emptyDocument(), variables),
      )

      return { previous }
    },

    onSuccess(_data, _variables, context) {
      // On success only: an undo entry for a change that was rolled back would
      // take the user somewhere they have never been.
      const previous = /** @type {FlowDocument | undefined} */ (context?.previous)
      if (label) history.record(label, previous)
    },

    onError(_error, _variables, context) {
      // Restore the whole document rather than reversing the change: one rollback
      // path, and it cannot drift out of step with `apply`.
      if (context?.previous) queryClient.setQueryData(flowKeys.list(), context.previous)
    },

    onSettled() {
      if (invalidate) queryClient.invalidateQueries({ queryKey: flowKeys.list() })
    },
  })
}

export function useCreateNode() {
  return useOptimisticFlowMutation({
    label: 'Create node',
    mutationFn: (variables) => flowApi.createNode(variables),
    apply: (flow, variables) => {
      // The form value is not always the payload type: businessHours is a dateTime.
      const type = creatableByValue(variables.nodeType)?.type ?? variables.nodeType
      const id = `optimistic-${Date.now()}`

      const node = {
        id,
        type,
        name: variables.title,
        data: { description: variables.description },
        ...(variables.position ? { position: variables.position } : {}),
      }

      // Mirror the branches the server will create, so they do not pop in late.
      const branches =
        type === NODE_TYPE.DATE_TIME
          ? [CONNECTOR_TYPE.SUCCESS, CONNECTOR_TYPE.FAILURE].map((connectorType) => ({
              id: `${id}-${connectorType}`,
              type: NODE_TYPE.DATE_TIME_CONNECTOR,
              name: connectorType === CONNECTOR_TYPE.SUCCESS ? 'Success' : 'Failure',
              data: { connectorType },
            }))
          : []

      return branches.reduce((next, branch) => withEdge(next, id, branch.id), {
        ...flow,
        nodes: [...flow.nodes, node, ...branches],
      })
    },
  })
}

export function useUpdateNode() {
  return useOptimisticFlowMutation({
    label: 'Edit node',
    mutationFn: (variables) => flowApi.updateNode(variables),
    apply: (flow, { id, patch }) => ({
      ...flow,
      nodes: flow.nodes.map((node) =>
        toNodeId(node.id) === id
          ? {
              ...node,
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.position !== undefined ? { position: patch.position } : {}),
              ...(patch.data !== undefined ? { data: { ...node.data, ...patch.data } } : {}),
            }
          : node,
      ),
    }),
  })
}

export function useDeleteNode() {
  return useOptimisticFlowMutation({
    label: 'Delete node',
    mutationFn: (variables) => flowApi.deleteNode(variables),
    // The same function the backend uses, so both results agree.
    apply: (flow, { id }) => withNodeRemoved(flow, id),
  })
}

/**
 * Pins the target where it is in the same write: a new incoming edge changes
 * where the layout would put it, and it should not jump.
 */
export function useConnectNodes() {
  return useOptimisticFlowMutation({
    label: 'Connect nodes',
    mutationFn: async ({ source, target, position }) => {
      if (position) await flowApi.updateNode({ id: target, patch: { position } })
      return flowApi.connectNodes({ source, target })
    },
    apply: (flow, { source, target, position }) =>
      withEdge(position ? pin(flow, target, position) : flow, source, target),
  })
}

/** Removes the line only; both nodes stay, pinned where they are. */
export function useDisconnect() {
  return useOptimisticFlowMutation({
    label: 'Remove connection',
    mutationFn: async ({ id, target, position }) => {
      if (position) await flowApi.updateNode({ id: target, patch: { position } })
      return flowApi.disconnect({ id })
    },
    apply: (flow, { id, target, position }) =>
      withoutEdge(position ? pin(flow, target, position) : flow, id),
  })
}

/**
 * @param {FlowDocument} flow
 * @param {string} id
 * @param {{ x: number, y: number }} position
 * @returns {FlowDocument}
 */
function pin(flow, id, position) {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => (toNodeId(node.id) === id ? { ...node, position } : node)),
  }
}

/** Drag persistence. Skips the invalidate: a refetch mid-drag snaps the node back. */
export function useMoveNode() {
  return useOptimisticFlowMutation({
    label: 'Move node',
    mutationFn: ({ id, position }) => flowApi.updateNode({ id, patch: { position } }),
    apply: (flow, { id, position }) => ({
      ...flow,
      nodes: flow.nodes.map((node) => (toNodeId(node.id) === id ? { ...node, position } : node)),
    }),
    invalidate: false,
  })
}

/** Discard local changes and re-seed from the starter diagram. */
export function useRestoreFlow() {
  const queryClient = useQueryClient()
  const history = useHistoryStore()

  return useMutation({
    mutationFn: () => flowApi.restoreFlow(),
    onSuccess(flow) {
      queryClient.setQueryData(flowKeys.list(), flow)
      // Nothing coherent to go back to once the flow is re-seeded.
      history.clear()
    },
  })
}
