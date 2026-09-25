<script setup>
import { computed, inject, ref } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core'

/** Carries its own remove control, since an edge is otherwise only deletable by key. */
const props = defineProps({
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: {
    type: /** @type {import('vue').PropType<import('@vue-flow/core').Position>} */ (String),
    required: true,
  },
  targetPosition: {
    type: /** @type {import('vue').PropType<import('@vue-flow/core').Position>} */ (String),
    required: true,
  },
  selected: { type: Boolean, default: false },
  label: { type: String, default: '' },
})

/** @type {(edgeId: string) => void} */
const detach = inject(DETACH_EDGE, () => {})

const edit = inject(EDIT_TEXT, null)
const isEditing = computed(() => edit?.editingId.value === props.id)

/** @param {string} label */
function relabel(label) {
  if (label.trim() !== props.label) edit?.relabelEdge(props.id, label)
  edit?.stop()
}
const hovered = ref(false)

const path = computed(() =>
  getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  }),
)

const sketch = inject(SKETCH, ref(false))
/** Drawn by hand, the line wobbles; the hit area below stays the clean path. */
const drawn = computed(() => (sketch.value ? sketchPath(path.value[0], props.id) : path.value[0]))

const showRemove = computed(() => props.selected || hovered.value)
</script>

<script>
import { DETACH_EDGE } from './connectKey.js'
import { EDIT_TEXT } from './editKey.js'
import InlineText from './InlineText.vue'
import { SKETCH } from './sketchKey.js'
import { sketchPath } from '@/domain/sketch.js'
</script>

<template>
  <BaseEdge
    :id="id"
    :path="drawn"
    :style="{ strokeWidth: selected ? 2.5 : 1.5 }"
    :class="selected ? 'stroke-focus' : ''"
  />

  <!-- A wide transparent path, so the thin line is easy to hit. -->
  <path
    :d="path[0]"
    fill="none"
    stroke="transparent"
    stroke-width="18"
    class="cursor-pointer"
    data-testid="edge-hit-area"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @dblclick.stop="edit?.start(id)"
  />

  <EdgeLabelRenderer>
    <div
      v-if="isEditing"
      class="nodrag nopan pointer-events-auto absolute w-40"
      :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
    >
      <InlineText
        class="text-xs"
        :value="label"
        label="Connection label"
        @save="relabel"
        @cancel="edit?.stop()"
      />
    </div>

    <div
      v-else-if="label || showRemove"
      class="nodrag nopan pointer-events-auto absolute flex items-center gap-1"
      :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <span
        v-if="label"
        class="rounded-full border border-line bg-surface px-2 py-0.5 font-medium text-muted"
        :class="sketch ? 'font-sketch text-[13px]' : 'text-[11px]'"
        data-testid="edge-label"
        title="Double-click to edit the label"
        @dblclick.stop="edit?.start(id)"
      >
        {{ label }}
      </span>

      <button
        v-if="showRemove"
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm hover:text-danger"
        :aria-label="`Remove this connection`"
        title="Remove this connection. Both nodes stay"
        @click.stop="detach(id)"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  </EdgeLabelRenderer>
</template>
