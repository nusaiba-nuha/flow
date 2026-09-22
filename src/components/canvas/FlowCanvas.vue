<script setup>
import { markRaw, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useMoveNode } from '@/composables/useNodeMutations.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { isOpenable } from '@/domain/nodeMeta.js'
import { ROUTE } from '@/router/index.js'
import { nodeComponents } from './nodeComponents.js'
import CanvasState from './CanvasState.vue'

const route = useRoute()
const router = useRouter()
const canvas = useCanvasStore()
const { nodes, edges, isLoading, isError, error, refetch } = useFlowQuery()
const moveNode = useMoveNode()
const { fitView, setViewport, setNodes, setEdges } = useVueFlow()

// These are component definitions, not reactive data: without markRaw Vue walks
// every component tree on each render.
const nodeTypes = /** @type {import('@vue-flow/core').NodeTypesObject} */ (
  /** @type {unknown} */ (markRaw(nodeComponents))
)

const hasFitted = ref(false)

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
    </VueFlow>
  </div>
</template>
