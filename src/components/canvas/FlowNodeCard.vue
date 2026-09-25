<script setup>
import { computed, inject, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'

import { metaFor } from '@/domain/nodeMeta.js'
import { NODE_SIZE, SHAPE } from '@/domain/constants.js'
import { shapePath, textInset } from '@/domain/shapes.js'
import { accentClasses } from './accents.js'
import { FOCUSED_NODE_ID } from './focusKey.js'
import { CONNECT_STATE } from './connectKey.js'

/** One card for every shape: the registry supplies the meaning, `shapes.js` the outline. */
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

const description = computed(() => meta.value.summary(node.value))

const outline = computed(() => shapePath(node.value.type, NODE_SIZE.WIDTH, NODE_SIZE.HEIGHT, 1.5))
const inset = computed(() => textInset(node.value.type, NODE_SIZE.WIDTH, NODE_SIZE.HEIGHT))
const isText = computed(() => node.value.type === SHAPE.TEXT)

/** Selection and keyboard focus draw on the outline itself, since a ring would be a rectangle. */
const strokeWidth = computed(() => (props.selected || isKeyboardFocused.value ? 3 : 1.5))
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center text-center transition-opacity duration-150"
    :class="[
      isDropTarget && !acceptsDrop ? 'opacity-40' : '',
      isKeyboardFocused ? 'outline-2 outline-offset-4 outline-focus' : '',
      meta.openable ? 'cursor-pointer' : 'cursor-default',
    ]"
    :aria-current="isKeyboardFocused ? 'true' : undefined"
    :style="{
      width: `${NODE_SIZE.WIDTH}px`,
      height: `${NODE_SIZE.HEIGHT}px`,
      padding: `${inset.y + 8}px ${inset.x + 12}px`,
    }"
    :aria-label="`${meta.label}: ${node.name}`"
    :data-shape="node.type"
  >
    <svg
      v-if="outline"
      class="pointer-events-none absolute inset-0 overflow-visible"
      :class="acceptsDrop ? 'text-node-message' : accent.icon"
      :width="NODE_SIZE.WIDTH"
      :height="NODE_SIZE.HEIGHT"
      :viewBox="`0 0 ${NODE_SIZE.WIDTH} ${NODE_SIZE.HEIGHT}`"
      aria-hidden="true"
    >
      <path
        :d="outline"
        class="fill-surface transition-[stroke-width] duration-150"
        stroke="currentColor"
        :stroke-width="acceptsDrop ? 3 : strokeWidth"
        stroke-linejoin="round"
      />
    </svg>

    <!-- End only: dragging from the top of a shape moves it, not a connection. -->
    <Handle
      type="target"
      :connectable-start="false"
      :position="Position.Top"
      class="!h-2 !w-2 !border-line !bg-surface"
    />

    <h3
      class="relative line-clamp-2 w-full font-semibold break-words"
      :class="isText ? 'text-base' : 'text-sm'"
    >
      {{ node.name }}
    </h3>

    <p
      v-if="description"
      class="relative mt-0.5 line-clamp-2 w-full text-xs leading-snug text-muted"
    >
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
