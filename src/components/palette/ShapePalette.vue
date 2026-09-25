<script setup>
import ShapeIcon from '@/components/ui/ShapeIcon.vue'
import { SHAPE_OPTIONS } from '@/domain/nodeMeta.js'
import { SHAPE_DRAG_TYPE } from './dragType.js'
import { useCanvasStore } from '@/stores/canvas.js'

/** Every shape in the registry. Drag one onto the canvas, or click to add it in the middle. */
const emit = defineEmits(['add'])
const canvas = useCanvasStore()

/** Diagram shapes first, then the ones for sketching an interface. */
const GROUPS = [
  { id: 'diagram', title: 'Shapes' },
  { id: 'wireframe', title: 'Wireframe' },
].map((group) => ({
  ...group,
  options: SHAPE_OPTIONS.filter((option) => option.group === group.id),
}))

/**
 * @param {DragEvent} event
 * @param {string} shape
 */
function onDragStart(event, shape) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(SHAPE_DRAG_TYPE, shape)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <aside class="flex w-48 shrink-0 flex-col border-r border-line bg-surface" aria-label="Shapes">
    <div class="px-2 pt-3">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors"
        :class="canvas.pen ? 'bg-hover text-ink' : 'hover:bg-hover'"
        :aria-pressed="canvas.pen ? 'true' : 'false'"
        title="Draw by hand on the canvas (P). Escape puts the pen down"
        @click="canvas.togglePen"
      >
        <svg
          width="22"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-muted"
          aria-hidden="true"
        >
          <path d="M16 3.5a2.1 2.1 0 0 1 3 3L8 17.5l-4 1 1-4Z" />
          <path d="M3 21c3-1 5 1 8 0" />
        </svg>
        <span>Pen</span>
      </button>
    </div>

    <div class="scroll-panel min-h-0 flex-1 px-2 pb-4">
      <section v-for="group in GROUPS" :key="group.id" :aria-labelledby="`palette-${group.id}`">
        <h2
          :id="`palette-${group.id}`"
          class="px-2 pt-4 pb-2 text-xs font-semibold tracking-wide text-muted uppercase"
        >
          {{ group.title }}
        </h2>

        <ul class="space-y-0.5">
          <li v-for="option in group.options" :key="option.value">
            <button
              type="button"
              draggable="true"
              class="flex w-full cursor-grab items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-hover active:cursor-grabbing"
              :title="`${option.hint}. Drag onto the canvas, or click to add it in the middle`"
              :data-shape="option.value"
              @dragstart="onDragStart($event, option.value)"
              @click="emit('add', option.value)"
            >
              <ShapeIcon :shape="option.value" class="shrink-0 text-muted" />
              <span class="truncate">{{ option.label }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>
