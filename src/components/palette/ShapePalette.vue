<script setup>
import ShapeIcon from '@/components/ui/ShapeIcon.vue'
import { SHAPE_OPTIONS } from '@/domain/nodeMeta.js'
import { SHAPE_DRAG_TYPE } from './dragType.js'

/** Every shape in the registry. Drag one onto the canvas, or click to add it in the middle. */
const emit = defineEmits(['add'])

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
