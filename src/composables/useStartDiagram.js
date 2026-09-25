import { useRouter } from 'vue-router'

import { useNewDiagram } from '@/composables/useNodeMutations.js'
import { emptyDocument, migrate } from '@/domain/document.js'
import { sampleById } from '@/domain/samples.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useFileStore } from '@/stores/file.js'
import { ROUTE } from '@/router/index.js'

/** Start over, empty or from a sample, closing any node that is open. */
export function useStartDiagram() {
  const router = useRouter()
  const newDiagram = useNewDiagram()
  const canvas = useCanvasStore()
  const file = useFileStore()

  /**
   * @param {string} [sampleId] empty when omitted
   * @param {{ onSuccess?: () => void }} [options]
   */
  function start(sampleId, options = {}) {
    const sample = sampleId ? sampleById(sampleId) : null
    // Through JSON, so the bundled sample is never the object that gets edited.
    const document = sample ? migrate(JSON.parse(JSON.stringify(sample.document))) : emptyDocument()

    // The open node belongs to the diagram being replaced.
    router.push({ name: ROUTE.FLOW })
    canvas.forgetViewport()
    // Save must not write a new diagram over the file the old one came from.
    file.forget()
    newDiagram.mutate(document, { onSuccess: options.onSuccess })
  }

  return { start, isPending: newDiagram.isPending }
}
