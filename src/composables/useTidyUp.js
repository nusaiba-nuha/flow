import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'

/**
 * Forget every hand-placed position, so the automatic layout places the whole
 * diagram. Sizes stay. One undoable change, so trying it costs nothing.
 */
export function useTidyUp() {
  const { document } = useFlowQuery()
  const replace = useReplaceDocument('Tidy up')

  /** @param {{ onSuccess?: () => void }} [options] */
  function tidyUp(options) {
    if (!document.value) return
    replace.mutate(
      {
        ...document.value,
        nodes: document.value.nodes.map((node) => {
          const next = { ...node }
          delete next.position
          return next
        }),
      },
      options,
    )
  }

  return { tidyUp }
}
