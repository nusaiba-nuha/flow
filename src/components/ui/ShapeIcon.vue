<script setup>
import { computed } from 'vue'

import { shapePath } from '@/domain/shapes.js'
import { SHAPE } from '@/domain/constants.js'

/** A shape's own outline at icon size, so a picker shows what it will draw. */
const props = defineProps({
  shape: { type: String, required: true },
  width: { type: Number, default: 22 },
  height: { type: Number, default: 16 },
})

const d = computed(() => shapePath(props.shape, props.width, props.height, 1.5))
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-if="d" :d="d" />
    <text
      v-else-if="shape === SHAPE.TEXT"
      :x="width / 2"
      :y="height / 2"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="12"
      font-weight="600"
      fill="currentColor"
      stroke="none"
    >
      T
    </text>
  </svg>
</template>
