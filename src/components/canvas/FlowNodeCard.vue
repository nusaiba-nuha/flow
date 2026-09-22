<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

import NodeIcon from '@/components/ui/NodeIcon.vue'
import { metaFor } from '@/domain/nodeMeta.js'
import { truncate } from '@/domain/format.js'
import { NODE_SIZE } from '@/domain/constants.js'
import { accentClasses } from './accents.js'

/** One card for every node type: the registry supplies icon, label, accent and summary. */
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const node = computed(() => props.data.node)
const meta = computed(() => metaFor(node.value.type))
const accent = computed(() => accentClasses(meta.value.accent))

// A user supplied description wins over the type's generated summary.
const description = computed(() =>
  node.value.data.description
    ? truncate(node.value.data.description)
    : meta.value.summary(node.value),
)
</script>

<template>
  <div
    class="rounded-xl border border-line bg-surface shadow-sm transition-shadow duration-150"
    :class="[
      selected ? `ring-2 ${accent.ring} shadow-md` : 'hover:shadow-md',
      meta.openable ? 'cursor-pointer' : 'cursor-default',
    ]"
    :style="{ width: `${NODE_SIZE.WIDTH}px` }"
    :aria-label="`${meta.label}: ${node.name}`"
  >
    <Handle type="target" :position="Position.Top" class="!h-2 !w-2 !border-line !bg-surface" />

    <header class="flex items-center gap-2 border-b border-line px-3 py-2">
      <NodeIcon :name="meta.icon" :class="accent.icon" />
      <h3 class="truncate text-sm font-semibold">{{ node.name }}</h3>
    </header>

    <p class="px-3 py-2 text-xs leading-relaxed text-muted">
      {{ description }}
    </p>

    <Handle type="source" :position="Position.Bottom" class="!h-2 !w-2 !border-line !bg-surface" />
  </div>
</template>
