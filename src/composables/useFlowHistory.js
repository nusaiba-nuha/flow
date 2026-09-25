import { onBeforeUnmount, onMounted } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'

import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { emptyDocument } from '@/domain/document.js'
import { useHistoryStore } from '@/stores/history.js'

/**
 * Applying a snapshot is a mutation, so the cache and the backend stay in step.
 *
 * Only one caller may bind the keys. Every component that offers an Undo calls
 * this, and each binding its own listener made one Ctrl+Z undo once per caller.
 *
 * @param {{ bindKeys?: boolean }} [options]
 */
export function useFlowHistory({ bindKeys = false } = {}) {
  const history = useHistoryStore()
  const queryClient = useQueryClient()

  const applyFlow = useMutation({
    mutationFn: (/** @type {import('@/domain/types.js').FlowDocument} */ flow) =>
      flowApi.replaceFlow(flow),

    async onMutate(flow) {
      // The undone mutation invalidated on its way out, so a refetch may still be
      // in the air and would restore exactly what was just undone.
      await queryClient.cancelQueries({ queryKey: flowKeys.list() })
      queryClient.setQueryData(flowKeys.list(), flow)
    },

    // No invalidate: both sides already hold this snapshot, so a refetch can only
    // race with the next edit.
  })

  /** @returns {import('@/domain/types.js').FlowDocument} */
  const currentFlow = () => queryClient.getQueryData(flowKeys.list()) ?? emptyDocument()

  /** @param {'undo' | 'redo'} direction */
  function step(direction) {
    const current = currentFlow()
    const entry = direction === 'undo' ? history.takeUndo(current) : history.takeRedo(current)
    if (!entry) return

    // Only labelled mutations record history and this one is unlabelled, so an
    // undo cannot record itself.
    applyFlow.mutate(entry.flow)
  }

  const undo = () => step('undo')
  const redo = () => step('redo')

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (!(event.ctrlKey || event.metaKey)) return

    // In a text field Ctrl+Z is the browser's own undo.
    const target = /** @type {HTMLElement | null} */ (event.target)
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

    const key = event.key.toLowerCase()
    // Both redo combinations, because both are muscle memory.
    if (key === 'z' && event.shiftKey) {
      event.preventDefault()
      redo()
    } else if (key === 'z') {
      event.preventDefault()
      undo()
    } else if (key === 'y') {
      event.preventDefault()
      redo()
    }
  }

  if (bindKeys) {
    // Capture phase: Vue Flow stops keys on the pane before they reach window.
    onMounted(() => window.addEventListener('keydown', onKeydown, true))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
  }

  return { undo, redo, history, isApplying: applyFlow.isPending }
}
