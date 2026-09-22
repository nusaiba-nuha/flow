<script setup>
import IconButton from '@/components/ui/IconButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useRestoreFlow } from '@/composables/useNodeMutations.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'

/** Owns its composables, so the route view stays a composition surface. */
const emit = defineEmits(['create'])

const { undo, redo, history } = useFlowHistory()
const restoreFlow = useRestoreFlow()
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="mr-1 flex items-center gap-1">
      <IconButton
        label="Undo"
        :title="
          history.canUndo ? `Undo ${history.undoLabel.toLowerCase()} (Ctrl+Z)` : 'Nothing to undo'
        "
        :disabled="!history.canUndo"
        @click="undo"
      >
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
      </IconButton>

      <IconButton
        label="Redo"
        :title="
          history.canRedo
            ? `Redo ${history.redoLabel.toLowerCase()} (Ctrl+Shift+Z)`
            : 'Nothing to redo'
        "
        :disabled="!history.canRedo"
        @click="redo"
      >
        <path d="m15 14 5-5-5-5" />
        <path d="M20 9H9a5 5 0 0 0 0 10h3" />
      </IconButton>
    </div>

    <IconButton
      label="Reset flow"
      title="Discard every change and reload the original flow"
      :disabled="restoreFlow.isPending.value"
      @click="restoreFlow.mutate()"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </IconButton>

    <ThemeToggle />

    <button
      type="button"
      class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover"
      title="Create a node and open its details"
      @click="emit('create')"
    >
      Create new node
    </button>
  </div>
</template>
