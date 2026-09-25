import { computed, ref, toRaw } from 'vue'
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
   * The state as it was before a change, recorded as the change starts so
   * entries stack in the order changes were made, not the order they landed.
   * @param {string} label
   * @param {import('@/domain/types.js').FlowDocument | undefined} flow
   * @returns {HistoryEntry | null} to hand to `discard` if the change fails
   */
  function record(label, flow) {
    if (!flow) return null

    const entry = { label, flow }
    undoStack.value.push(entry)
    if (undoStack.value.length > DEPTH_LIMIT) undoStack.value.shift()
    // A new change invalidates anything undone, as every editor does.
    redoStack.value = []
    return entry
  }

  /**
   * Forget the entry for a change that failed and was rolled back: undoing it
   * would take the user somewhere they have never been.
   * @param {HistoryEntry | null | undefined} entry
   */
  function discard(entry) {
    if (!entry) return
    // The stack hands back reactive proxies, so compare what they wrap.
    const index = undoStack.value.findIndex((candidate) => toRaw(candidate) === entry)
    if (index !== -1) undoStack.value.splice(index, 1)
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
    discard,
    takeUndo,
    takeRedo,
    clear,
  }
})
