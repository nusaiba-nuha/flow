<script setup>
import { computed } from 'vue'

import IconButton from '@/components/ui/IconButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useStartDiagram } from '@/composables/useStartDiagram.js'
import { useCopyBrief } from '@/composables/useCopyBrief.js'
import { useSketchStyle } from '@/composables/useSketchStyle.js'
import { useDiagramFile } from '@/composables/useDiagramFile.js'
import { useFlowHistory } from '@/composables/useFlowHistory.js'
import { usePlatform } from '@/composables/usePlatform.js'
import { COMBO, comboLabel } from '@/domain/shortcuts.js'
import { useToastStore } from '@/stores/toasts.js'
import { useCanvasStore } from '@/stores/canvas.js'

/** Owns its composables, so the route view stays a composition surface. */
const emit = defineEmits(['help', 'import', 'compare', 'export', 'share'])

// The one place the shortcut is bound: the toolbar is always mounted.
const { undo, redo, history } = useFlowHistory({ bindKeys: true })
const { start, isPending: isStarting } = useStartDiagram()
const toasts = useToastStore()
const canvas = useCanvasStore()
const { copyBrief } = useCopyBrief()
const { sketch, toggle: toggleSketch } = useSketchStyle()
// The one place Ctrl+S and Ctrl+O are bound, like undo.
const { open, save } = useDiagramFile({ bindKeys: true })

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
const openHint = computed(() => comboLabel(COMBO.OPEN, isMac.value))
const saveHint = computed(() => comboLabel(COMBO.SAVE, isMac.value))
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="mr-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink transition-opacity hover:opacity-90"
      title="Copy the diagram as a Markdown brief for Claude, Copilot or any coding agent"
      @click="copyBrief"
    >
      Copy for AI
    </button>

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
      label="Sketch style"
      :title="sketch ? 'Draw with clean lines' : 'Draw by hand, like a whiteboard sketch'"
      :pressed="sketch"
      @click="toggleSketch"
    >
      <path d="M3 17c3-1 4-6 7-6s2 5 5 5 3-4 6-5" />
      <path d="M16 3.5a2.1 2.1 0 0 1 3 3L9 16.5l-4 1 1-4Z" />
    </IconButton>

    <IconButton label="Open file" :title="`Open a .flow file (${openHint})`" @click="open">
      <path
        d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5H12L10 5H4.5A1.5 1.5 0 0 0 3 6.5Z"
      />
    </IconButton>

    <IconButton label="Save" :title="`Save as a .flow file (${saveHint})`" @click="save">
      <path
        d="M5 3h11l3 3v13.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5 3Z"
      />
      <path d="M8 3v5h7V3M8 21v-6h8v6" />
    </IconButton>

    <IconButton
      label="Export"
      title="Download the diagram as PNG, SVG or a draw.io file"
      @click="emit('export')"
    >
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="m3 15 5-5 4 4 3-3 6 6" />
      <circle cx="16" cy="8.5" r="1.5" />
    </IconButton>

    <IconButton
      label="Compare"
      title="Compare with another version, such as the file in your repository"
      @click="emit('compare')"
    >
      <path d="M8 3v18M16 3v18" />
      <path d="M4 8h4M16 16h4M18 14v4" />
    </IconButton>

    <IconButton
      label="Share"
      title="Share a private link, or publish one an AI can read"
      @click="emit('share')"
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </IconButton>

    <IconButton
      label="Import"
      title="Import Mermaid, draw.io, docker-compose, an OpenAPI spec or SQL tables"
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
