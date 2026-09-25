import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { parseFlow, serialiseFlow } from '@/domain/flowText.js'

/** Long enough to finish a word, short enough to feel live. */
export const TEXT_DEBOUNCE_MS = 300

/**
 * The document as `.flow` text, both ways. Typing re-parses after a pause and
 * applies the result when it is valid and actually different; the canvas keeps
 * the last good diagram while the text has errors. Changes made elsewhere
 * rewrite the text, but never while it has focus: a cursor that jumps mid-word
 * is worse than text that is a moment behind.
 */
export function useDiagramText() {
  const { document } = useFlowQuery()
  const replace = useReplaceDocument('Edit as text')

  const canonical = computed(() => serialiseFlow(document.value))
  const text = ref(canonical.value)
  /** @type {import('vue').Ref<import('@/domain/flowText.js').FlowTextError[]>} */
  const errors = ref([])
  const isEditing = ref(false)

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let pending

  watch(canonical, (next) => {
    if (isEditing.value) return
    text.value = next
    errors.value = []
  })

  /** @returns {boolean} whether a change was sent */
  function apply() {
    pending = undefined
    const { document: parsed, errors: found } = parseFlow(text.value)
    errors.value = found
    if (!parsed || serialiseFlow(parsed) === canonical.value) return false

    replace.mutate(parsed)
    return true
  }

  /** @param {string} value */
  function input(value) {
    text.value = value
    clearTimeout(pending)
    pending = setTimeout(apply, TEXT_DEBOUNCE_MS)
  }

  function focus() {
    isEditing.value = true
  }

  /** Leaving the text applies what is there at once, and tidies it if it is valid. */
  function blur() {
    isEditing.value = false
    let sent = false
    if (pending !== undefined) {
      clearTimeout(pending)
      sent = apply()
    }
    // A sent change rewrites the text through the watcher once it lands.
    if (!sent && !errors.value.length) text.value = canonical.value
  }

  onBeforeUnmount(() => clearTimeout(pending))

  return { text, errors, isEditing, input, focus, blur }
}
