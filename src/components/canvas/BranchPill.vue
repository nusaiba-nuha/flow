<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

import { connectorLabel } from '@/domain/graph.js'

/** Display only per the brief. */
const props = defineProps({
  data: { type: Object, required: true },
})

const label = computed(() => connectorLabel(props.data.node))
</script>

<template>
  <div class="flex justify-center">
    <Handle type="target" :position="Position.Top" class="!h-2 !w-2 !border-line !bg-surface" />

    <span
      class="rounded-md bg-branch-bg px-2.5 py-1 text-xs font-medium text-branch-ink select-none"
    >
      {{ label }}
    </span>

    <Handle type="source" :position="Position.Bottom" class="!h-2 !w-2 !border-line !bg-surface" />
  </div>
</template>
