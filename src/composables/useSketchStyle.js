import { computed } from 'vue'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { isSketch, STYLE } from '@/domain/sketch.js'

/** The diagram's look, hand-drawn or clean, switched as one undoable change. */
export function useSketchStyle() {
  const { document } = useFlowQuery()
  const replace = useReplaceDocument('Switch style')

  const sketch = computed(() => isSketch(document.value))

  function toggle() {
    if (!document.value) return
    const next = { ...document.value }
    if (sketch.value) delete next.style
    else next.style = STYLE.SKETCH
    replace.mutate(next)
  }

  return { sketch, toggle }
}
