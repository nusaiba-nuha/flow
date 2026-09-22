<script setup>
import { computed, markRaw, nextTick, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useMoveNode } from '@/composables/useNodeMutations.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useCanvasKeyboard } from '@/composables/useCanvasKeyboard.js'
import { isOpenable, metaFor } from '@/domain/nodeMeta.js'
import { ROUTE } from '@/router/index.js'
import { nodeComponents } from './nodeComponents.js'
import { FOCUSED_NODE_ID } from './focusKey.js'
import CanvasControls from './CanvasControls.vue'
import CanvasState from './CanvasState.vue'

const route = useRoute()
const router = useRouter()
const canvas = useCanvasStore()
const { nodes, edges, isLoading, isError, error, refetch } = useFlowQuery()
const moveNode = useMoveNode()
const { fitView, setViewport, setNodes, setEdges, viewport } = useVueFlow()

// These are component definitions, not reactive data: without markRaw Vue walks
// every component tree on each render.
const nodeTypes = /** @type {import('@vue-flow/core').NodeTypesObject} */ (
  /** @type {unknown} */ (markRaw(nodeComponents))
)

const hasFitted = ref(false)

/** The drawer and the create dialog own the keyboard while they are open. */
const {
  focusedId,
  focus,
  clear: clearFocus,
} = useCanvasKeyboard({
  nodes,
  onOpen: (id) => router.push({ name: ROUTE.NODE_DETAILS, params: { id } }),
  isActive: () => !document.querySelector('[role="dialog"][aria-modal="true"]'),
})

provide(FOCUSED_NODE_ID, focusedId)

const focusAnnouncement = computed(() => {
  if (!focusedId.value) return ''
  const node = nodes.value.find((candidate) => candidate.id === focusedId.value)?.data.node
  return node ? `${node.name}, ${metaFor(node.type).label}. Press Enter to open details.` : ''
})

// However the drawer was opened, the open node is the focused node.
watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string' && id) focus(id)
    else clearFocus()
  },
  { immediate: true },
)

// Pan a focused node into view without changing the zoom.
watch(focusedId, async (id) => {
  if (!id) return
  await nextTick()
  fitView({
    nodes: [id],
    duration: 180,
    minZoom: viewport.value.zoom,
    maxZoom: viewport.value.zoom,
  })
})

/**
 * Handed over with `setNodes`, not a `:nodes` prop: a one-way prop leaves Vue Flow
 * unable to write a dragged position back, and the node does not move.
 */
watch(
  [nodes, edges, () => route.params.id],
  ([nextNodes, nextEdges, openId]) => {
    // The open node is the highlighted one, so a shared link marks it too.
    setNodes(nextNodes.map((node) => ({ ...node, selected: node.id === openId })))
    setEdges(nextEdges)
  },
  { immediate: true },
)

/** @param {{ node: import('@vue-flow/core').GraphNode }} event */
function onNodeClick({ node }) {
  if (!isOpenable(node.data.node)) return
  focus(node.id)
  router.push({ name: ROUTE.NODE_DETAILS, params: { id: node.id } })
}

/** @param {{ node: import('@vue-flow/core').GraphNode }} event */
function onNodeDragStop({ node }) {
  // A plain object, not Vue Flow's reactive position.
  moveNode.mutate({ id: node.id, position: { x: node.position.x, y: node.position.y } })
}

/**
 * Vue Flow measures nodes after they mount, and `fitView` needs those dimensions.
 * Called any earlier it fits an unmeasured graph and clips the edge.
 */
function onNodesInitialized() {
  if (hasFitted.value) return
  hasFitted.value = true

  if (canvas.viewport) setViewport(canvas.viewport)
  else fitView({ padding: 0.2, duration: 0 })
}

watch(
  () => canvas.focusNodeId,
  async (id) => {
    if (!id) return
    // Wait for the node to exist and be measured before panning to it.
    await nextTick()
    fitView({ nodes: [id], padding: 0.6, duration: 400 })
    canvas.clearFocus()
  },
)
</script>

<template>
  <div class="h-full w-full">
    <CanvasState
      v-if="isLoading || isError || !nodes.length"
      :is-loading="isLoading"
      :is-error="isError"
      :message="error?.message"
      @retry="refetch"
    />

    <VueFlow
      v-else
      :node-types="nodeTypes"
      :default-edge-options="{ type: 'smoothstep', style: { strokeWidth: 1.5 } }"
      :min-zoom="0.2"
      :max-zoom="2"
      :nodes-connectable="false"
      :elevate-nodes-on-select="true"
      class="h-full w-full"
      @nodes-initialized="onNodesInitialized"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
      @viewport-change="canvas.setViewport"
    >
      <Background :gap="18" :size="1.2" />
      <CanvasControls />

      <!-- The canvas is a graph, so a screen reader has nothing else to go on. -->
      <div class="sr-only" role="status" aria-live="polite">{{ focusAnnouncement }}</div>
    </VueFlow>
  </div>
</template>
