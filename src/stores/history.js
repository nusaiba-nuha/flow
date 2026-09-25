import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Whole-document snapshots, not inverse commands: deleting takes a node's edges
 * and branches with it and creating assigns an id, so each inverse would be a second implementation free
 * to drift from the forward one. Seven nodes is a few kilobytes.
 *
 * @typedef {{ label: string, flow: import('@/domain/types.js').FlowDocument }} HistoryEntry
 */
const DEPTH_LIMIT = 50

export const useHistoryStore = defineStore('history', () => {
  /** @type {import('vue').Ref<HistoryEntry[]>} */
  const undoStack = ref([])
  /** @type {import('vue').Ref<HistoryEntry[]>} */
  const redoStack = ref([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const undoLabel = computed(() => undoStack.value.at(-1)?.label ?? '')
  const redoLabel = computed(() => redoStack.value.at(-1)?.label ?? '')

  /**
   * The state as it was before a change that has now succeeded.
   * @param {string} label
   * @param {import('@/domain/types.js').FlowDocument | undefined} flow
   */
  function record(label, flow) {
    if (!flow) return

    undoStack.value.push({ label, flow })
    if (undoStack.value.length > DEPTH_LIMIT) undoStack.value.shift()
    // A new change invalidates anything undone, as every editor does.
    redoStack.value = []
  }

  /** @param {import('@/domain/types.js').FlowDocument} current @returns {HistoryEntry | null} */
  function takeUndo(current) {
    const entry = undoStack.value.pop()
    if (!entry) return null

    redoStack.value.push({ label: entry.label, flow: current })
    return entry
  }

  /** @param {import('@/domain/types.js').FlowDocument} current @returns {HistoryEntry | null} */
  function takeRedo(current) {
    const entry = redoStack.value.pop()
    if (!entry) return null

    undoStack.value.push({ label: entry.label, flow: current })
    return entry
  }

  function clear() {
    undoStack.value = []
    redoStack.value = []
  }

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    record,
    takeUndo,
    takeRedo,
    clear,
  }
})
