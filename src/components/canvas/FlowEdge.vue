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
  target: { type: String, required: true },
  selected: { type: Boolean, default: false },
})

/** @type {(targetId: string) => void} */
const detach = inject(DETACH_EDGE, () => {})
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

const showRemove = computed(() => props.selected || hovered.value)
</script>

<script>
import { DETACH_EDGE } from './connectKey.js'
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
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
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  />

  <EdgeLabelRenderer>
    <div
      v-if="showRemove"
      class="nodrag nopan pointer-events-auto absolute"
      :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm hover:text-danger"
        :aria-label="`Remove this connection`"
        title="Remove this connection. The node stays, detached from the flow"
        @click.stop="detach(target)"
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
