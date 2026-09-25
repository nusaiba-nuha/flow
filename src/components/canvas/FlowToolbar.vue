<script setup>
import { computed } from 'vue'

import IconButton from '@/components/ui/IconButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useStartDiagram } from '@/composables/useStartDiagram.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { usePlatform } from '@/composables/usePlatform.js'
import { COMBO, comboLabel } from '@/domain/shortcuts.js'
import { useToastStore } from '@/stores/toasts.js'
import { useCanvasStore } from '@/stores/canvas.js'

/** Owns its composables, so the route view stays a composition surface. */
const emit = defineEmits(['help', 'import'])

// The one place the shortcut is bound: the toolbar is always mounted.
const { undo, redo, history } = useFlowHistory({ bindKeys: true })
const { start, isPending: isStarting } = useStartDiagram()
const toasts = useToastStore()
const canvas = useCanvasStore()

function startEmpty() {
  start(undefined, {
    onSuccess: () => toasts.push('Started a new diagram', { action: { label: 'Undo', run: undo } }),
  })
}

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
      label="Edit as text"
      :title="
        canvas.isTextOpen
          ? 'Hide the diagram as text'
          : 'Show the diagram as text, to edit either side'
      "
      :pressed="canvas.isTextOpen"
      @click="canvas.toggleText"
    >
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
    </IconButton>

    <IconButton
      label="Import"
      title="Import Mermaid, a docker-compose file or an OpenAPI spec"
      @click="emit('import')"
    >
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </IconButton>

    <IconButton
      label="New diagram"
      title="Start an empty diagram. Undo brings this one back"
      :disabled="isStarting"
      @click="startEmpty"
    >
      <path
        d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5Z"
      />
      <path d="M14 3v5h5M12 11v6M9 14h6" />
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
  </div>
</template>
