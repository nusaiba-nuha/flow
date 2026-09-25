import { useMutation, useQueryClient } from '@tanstack/vue-query'

import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { emptyDocument } from '@/domain/document.js'
import {
  toNodeId,
  withEdge,
  withEdgeLabel,
  withNodeRemoved,
  withNodesRemoved,
  withoutEdge,
  withPositions,
} from '@/domain/graph.js'
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
    label: 'Add shape',
    mutationFn: (variables) => flowApi.createNode(variables),
    apply: (flow, variables) => ({
      ...flow,
      nodes: [
        ...flow.nodes,
        {
          id: `optimistic-${Date.now()}`,
          type: variables.shape,
          name: variables.title,
          data: { description: variables.description },
          ...(variables.position ? { position: variables.position } : {}),
        },
      ],
    }),
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
              ...(patch.type !== undefined ? { type: patch.type } : {}),
              ...(patch.position !== undefined ? { position: patch.position } : {}),
              ...(patch.size !== undefined ? { size: patch.size } : {}),
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

/** A connection's label; an empty one removes it. */
export function useUpdateEdge() {
  return useOptimisticFlowMutation({
    label: 'Edit label',
    mutationFn: (variables) => flowApi.updateEdge(variables),
    apply: (flow, { id, patch }) => withEdgeLabel(flow, id, patch.label),
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

/** Several shapes at once, as one undo step. */
export function useDeleteNodes() {
  return useOptimisticFlowMutation({
    label: 'Delete shapes',
    mutationFn: (variables) => flowApi.deleteNodes(variables),
    apply: (flow, { ids }) => withNodesRemoved(flow, ids),
  })
}

/** A dragged selection, as one undo step. Skips the invalidate, as a single move does. */
export function useMoveNodes() {
  return useOptimisticFlowMutation({
    label: 'Move shapes',
    mutationFn: (variables) => flowApi.moveNodes(variables),
    apply: (flow, { positions }) => withPositions(flow, positions),
    invalidate: false,
  })
}

/**
 * A resize can move the node too, from its top or left edge, so both are
 * saved in the one step. Skips the invalidate, as a move does.
 */
export function useResizeNode() {
  return useOptimisticFlowMutation({
    label: 'Resize shape',
    mutationFn: ({ id, position, size }) => flowApi.updateNode({ id, patch: { position, size } }),
    apply: (flow, { id, position, size }) => ({
      ...flow,
      nodes: flow.nodes.map((node) =>
        toNodeId(node.id) === id ? { ...node, position, size } : node,
      ),
    }),
    invalidate: false,
  })
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

/**
 * Replaces the whole document in one undoable step: starting over, opening a
 * sample, or an edit made as text.
 *
 * @param {string} label what undo will say it takes back
 */
export function useReplaceDocument(label) {
  return useOptimisticFlowMutation({
    label,
    mutationFn: (/** @type {FlowDocument} */ document) => flowApi.replaceFlow(document),
    apply: (_flow, document) => document,
  })
}

/** Undo brings back what was there, so starting over needs no confirmation. */
export const useNewDiagram = () => useReplaceDocument('New diagram')
