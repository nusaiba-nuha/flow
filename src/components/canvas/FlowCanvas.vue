<script setup>
import { computed, markRaw, nextTick, provide, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'

import { useFlowQuery } from '@/composables/useFlowQuery.js'
import { useMoveNode, useUpdateNode } from '@/composables/useNodeMutations.js'
import { useCanvasStore } from '@/stores/canvas.js'
import { useCanvasKeyboard } from '@/composables/useCanvasKeyboard.js'
import { isOpenable, metaFor } from '@/domain/nodeMeta.js'
import { canConnect, toNodeId } from '@/domain/graph.js'
import { ROOT_PARENT_ID } from '@/domain/constants.js'
import { useToastStore } from '@/stores/toasts.js'
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
const updateNode = useUpdateNode()
const toasts = useToastStore()
const { fitView, findNode, setViewport, setNodes, setEdges, viewport } = useVueFlow()

// These are component definitions, not reactive data: without markRaw Vue walks
// every component tree on each render.
const nodeTypes = /** @type {import('@vue-flow/core').NodeTypesObject} */ (
  /** @type {unknown} */ (markRaw(nodeComponents))
)

const hasFitted = ref(false)

/** Matches the drawer width in NodeDetailsDrawer. */
const DRAWER_WIDTH = 380
const PAN_MS = 420

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const container = useTemplateRef('container')

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
  // A node the canvas is already moving to owns the movement: two pans at once
  // read as the screen lurching twice.
  if (!id || canvas.focusNodeId === id) return

  await nextTick()
  const node = findNode(id)
  if (node?.dimensions?.width) centreOn(node)
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

/**
 * Checked while the line is being dragged, so an invalid target refuses the drop
 * instead of explaining itself afterwards.
 *
 * @param {{ source: string | null, target: string | null }} connection
 * @returns {boolean}
 */
function isValidConnection({ source, target }) {
  if (!source || !target) return false
  const flow = nodes.value.map((node) => node.data.node)

  return canConnect(flow, toNodeId(source), toNodeId(target)) === null
}

/** The payload gives a node one parent, so connecting re-parents rather than adding an edge. */
/** @param {{ source: string, target: string }} connection */
function onConnect({ source, target }) {
  const flow = nodes.value.map((node) => node.data.node)
  const refusal = canConnect(flow, toNodeId(source), toNodeId(target))

  if (refusal) {
    toasts.push(refusal, { tone: 'danger' })
    return
  }

  updateNode.mutate({ id: toNodeId(target), patch: { parentId: toNodeId(source) } })
}

/** Detach, rather than delete the node the edge points at. */
/** @param {{ edges: { target: string }[] }} event */
function onEdgesDelete({ edges: removed }) {
  for (const edge of removed) {
    updateNode.mutate({ id: toNodeId(edge.target), patch: { parentId: ROOT_PARENT_ID } })
  }
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

/**
 * A created node is asked for by its server id, but the cache still holds the
 * optimistic one until the refetch lands, so Vue Flow does not know the id yet
 * and an immediate fitView is a silent no-op.
 *
 * @param {string} id
 */
async function waitForNode(id) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const node = findNode(id)
    if (node?.dimensions?.width) return node
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return null
}

/**
 * Centre a node in the space the drawer leaves. Computed rather than `fitView`,
 * which does not move for a single node once the flow is already fitted.
 *
 * @param {import('@vue-flow/core').GraphNode} node
 */
function centreOn(node) {
  const pane = container.value?.getBoundingClientRect()
  if (!pane) return

  const { zoom } = viewport.value
  const visibleWidth = pane.width - (route.params.id ? DRAWER_WIDTH : 0)

  setViewport(
    {
      x: visibleWidth / 2 - (node.position.x + (node.dimensions.width || 0) / 2) * zoom,
      y: pane.height / 2 - (node.position.y + (node.dimensions.height || 0) / 2) * zoom,
      zoom,
    },
    { duration: reducedMotion() ? 0 : PAN_MS },
  )
}

watch(
  () => canvas.focusNodeId,
  async (id) => {
    if (!id) return

    const node = await waitForNode(id)
    if (node) centreOn(node)
    canvas.clearFocus()
  },
)
</script>

<template>
  <div ref="container" class="h-full w-full">
    <CanvasState
      v-if="isLoading || isError || !nodes.length"
      :is-loading="isLoading"
      :is-error="isError"
      :message="error?.message"
      @retry="refetch"
    />

    <!-- nodes-deletable stays false: deleting a node keeps its confirmation. -->
    <VueFlow
      v-else
      :node-types="nodeTypes"
      :default-edge-options="{ type: 'smoothstep', style: { strokeWidth: 1.5 } }"
      :min-zoom="0.2"
      :max-zoom="2"
      :nodes-connectable="true"
      :is-valid-connection="isValidConnection"
      :connection-radius="28"
      :nodes-deletable="false"
      :delete-key-code="['Delete', 'Backspace']"
      :elevate-nodes-on-select="true"
      class="h-full w-full"
      @nodes-initialized="onNodesInitialized"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @edges-delete="onEdgesDelete"
      @viewport-change="canvas.setViewport"
    >
      <Background :gap="18" :size="1.2" />
      <CanvasControls />

      <!-- The canvas is a graph, so a screen reader has nothing else to go on. -->
      <div class="sr-only" role="status" aria-live="polite">{{ focusAnnouncement }}</div>
    </VueFlow>
  </div>
</template>
