<script setup>
import { computed, inject, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'

import NodeIcon from '@/components/ui/NodeIcon.vue'
import { metaFor } from '@/domain/nodeMeta.js'
import { truncate } from '@/domain/format.js'
import { NODE_SIZE } from '@/domain/constants.js'
import { accentClasses } from './accents.js'
import { FOCUSED_NODE_ID } from './focusKey.js'
import { CONNECT_STATE } from './connectKey.js'

/** One card for every node type; the registry supplies the rest. */
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

/** @type {import('vue').Ref<string>} */
const focusedId = inject(FOCUSED_NODE_ID, ref(''))
const isKeyboardFocused = computed(() => focusedId.value === props.id)

/** @type {import('./connectKey.js').ConnectContext} */
const connect = inject(CONNECT_STATE, { from: ref(''), accepts: () => false })

const isConnectSource = computed(() => connect.from.value === props.id)
const isDropTarget = computed(() => Boolean(connect.from.value) && !isConnectSource.value)
const acceptsDrop = computed(() => isDropTarget.value && connect.accepts(props.id))

const node = computed(() => props.data.node)
const meta = computed(() => metaFor(node.value.type))
const accent = computed(() => accentClasses(meta.value.accent))

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
      // While connecting, every card says whether it would take the drop.
      acceptsDrop ? 'ring-2 ring-node-message shadow-md' : '',
      isDropTarget && !acceptsDrop ? 'opacity-40' : '',
      selected || isKeyboardFocused ? `ring-2 ${accent.ring} shadow-md` : 'hover:shadow-md',
      isKeyboardFocused ? 'outline-2 outline-offset-2 outline-focus' : '',
      meta.openable ? 'cursor-pointer' : 'cursor-default',
    ]"
    :aria-current="isKeyboardFocused ? 'true' : undefined"
    :style="{ width: `${NODE_SIZE.WIDTH}px` }"
    :aria-label="`${meta.label}: ${node.name}`"
  >
    <!-- End only: dragging from the top of a card moves it, not a connection. -->
    <Handle
      type="target"
      :connectable-start="false"
      :position="Position.Top"
      class="!h-2 !w-2 !border-line !bg-surface"
    />

    <header class="flex items-center gap-2 border-b border-line px-3 py-2">
      <NodeIcon :name="meta.icon" :class="accent.icon" />
      <h3 class="truncate text-sm font-semibold">{{ node.name }}</h3>
    </header>

    <p class="px-3 py-2 text-xs leading-relaxed text-muted">
      {{ description }}
    </p>

    <Handle
      type="source"
      :connectable-end="false"
      :position="Position.Bottom"
      class="!h-2 !w-2 !border-line !bg-surface"
    />
  </div>
</template>
