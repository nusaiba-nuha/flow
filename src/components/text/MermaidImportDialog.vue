<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import BaseModal from '@/components/ui/BaseModal.vue'
import { useReplaceDocument } from '@/composables/useNodeMutations.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { fromMermaid } from '@/domain/mermaid.js'
import { ROUTE } from '@/router/index.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useToastStore } from '@/stores/toasts.js'

/** Paste a Mermaid flowchart; see what will come in, and what will not, before it replaces anything. */
const emit = defineEmits(['close'])

const router = useRouter()
const canvas = useCanvasStore()
const toasts = useToastStore()
const replace = useReplaceDocument('Import Mermaid')
const { undo } = useFlowHistory()

const source = ref('')
const result = computed(() => (source.value.trim() ? fromMermaid(source.value) : null))
const shapeCount = computed(() => result.value?.document.nodes.length ?? 0)

const summary = computed(() => {
  if (!result.value) return 'Paste a flowchart to see what will be imported.'
  const { nodes, edges } = result.value.document
  if (!nodes.length) return 'Nothing to import yet.'
  return `${nodes.length} ${nodes.length === 1 ? 'shape' : 'shapes'} and ${edges.length} ${
    edges.length === 1 ? 'connection' : 'connections'
  }. This replaces the current diagram; undo brings it back.`
})

function submit() {
  if (!result.value || !shapeCount.value) return
  const count = shapeCount.value

  router.push({ name: ROUTE.FLOW })
  canvas.forgetViewport()
  replace.mutate(result.value.document, {
    onSuccess: () =>
      toasts.push(`Imported ${count} ${count === 1 ? 'shape' : 'shapes'}`, {
        action: { label: 'Undo', run: undo },
      }),
  })
  emit('close')
}
</script>

<template>
  <BaseModal title="Import Mermaid" @close="emit('close')">
    <form class="space-y-3 px-5 py-4" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-muted">Mermaid flowchart</span>
        <textarea
          v-model="source"
          rows="10"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-line bg-sunken px-3 py-2 font-mono text-xs text-ink outline-none focus:border-line-strong"
          placeholder="flowchart TD&#10;  A[Start] --> B{Ready?}&#10;  B -->|yes| C[Ship]"
        />
      </label>

      <p class="text-xs text-muted" role="status">{{ summary }}</p>

      <ul
        v-if="result?.warnings.length"
        class="scroll-panel max-h-32 space-y-0.5 text-xs text-muted"
        aria-label="Lines that will be skipped"
      >
        <li v-for="warning in result.warnings" :key="`${warning.line}-${warning.message}`">
          Line {{ warning.line }}: {{ warning.message }}
        </li>
      </ul>

      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-hover"
          title="Close without importing (Esc)"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-40"
          title="Replace the current diagram with this one. Undo brings it back"
          :disabled="!shapeCount"
        >
          Import
        </button>
      </div>
    </form>
  </BaseModal>
</template>
