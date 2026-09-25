<script setup>
import { computed } from 'vue'

import IconButton from '@/components/ui/IconButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useRestoreFlow } from '@/composables/useNodeMutations.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { usePlatform } from '@/composables/usePlatform.js'
import { COMBO, comboLabel } from '@/domain/shortcuts.js'

/** Owns its composables, so the route view stays a composition surface. */
const emit = defineEmits(['create', 'help'])

const { undo, redo, history } = useFlowHistory()
const restoreFlow = useRestoreFlow()

// Tooltips read the same combinations the handlers bind, resolved for this
// platform, so a Mac never sees Ctrl in a hint for a key it does not use.
const { isMac } = usePlatform()
const undoHint = computed(() => comboLabel(COMBO.UNDO, isMac.value))
const redoHint = computed(() => comboLabel(COMBO.REDO, isMac.value))
const helpHint = computed(() => comboLabel(COMBO.HELP, isMac.value))
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="mr-1 flex items-center gap-1">
      <IconButton
        label="Undo"
        :title="
          history.canUndo
            ? `Undo ${history.undoLabel.toLowerCase()} (${undoHint})`
            : 'Nothing to undo'
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
            ? `Redo ${history.redoLabel.toLowerCase()} (${redoHint})`
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
      title="Discard every change and start again from the starter diagram"
      :disabled="restoreFlow.isPending.value"
      @click="restoreFlow.mutate()"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </IconButton>

    <IconButton
      label="Keyboard shortcuts"
      :title="`Keyboard shortcuts and about (${helpHint})`"
      @click="emit('help')"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.6 2.6 0 1 1 3.4 2.5c-.7.3-1 .8-1 1.5v.4M12 17.2h.01" />
    </IconButton>

    <ThemeToggle />

    <button
      type="button"
      class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-hover"
      title="Create a node and open its details. It is not connected to anything yet"
      @click="emit('create')"
    >
      Create new node
    </button>
  </div>
</template>
