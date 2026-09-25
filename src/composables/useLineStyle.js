import { computed } from 'vue'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { LINE, LINES } from '@/domain/routes.js'

/** How the diagram's connections run, stepped, curved or straight, as one undoable change. */
export function useLineStyle() {
  const { document } = useFlowQuery()
  const replace = useReplaceDocument('Change lines')

  const lines = computed(() => document.value?.lines ?? LINE.STEP)
  const next = computed(() => LINES[(LINES.indexOf(lines.value) + 1) % LINES.length])

  function cycle() {
    if (!document.value) return
    const updated = { ...document.value }
    if (next.value === LINE.STEP) delete updated.lines
    else updated.lines = next.value
    replace.mutate(updated)
  }

  return { lines, next, cycle }
}
