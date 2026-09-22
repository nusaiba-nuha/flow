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
import { CONNECT_STATE, DETACH_EDGE } from './connectKey.js'
import FlowEdge from './FlowEdge.vue'
import CanvasControls from './CanvasControls.vue'
import CanvasState from './CanvasState.vue'

const route = useRoute()
const router = useRouter()
const canvas = useCanvasStore()
const { nodes, edges, isLoading, isError, error, refetch } = useFlowQuery()
const moveNode = useMoveNode()
const updateNode = useUpdateNode()
const toasts = useToastStore()
const {
  addEdges,
  addNodes,
  findNode,
  getEdges,
  fitView,
  getNodes,
  removeNodes,
  setViewport,
  updateNode: updateFlowNode,
  viewport,
} = useVueFlow()

// These are component definitions, not reactive data: without markRaw Vue walks
// every component tree on each render.
const nodeTypes = /** @type {import('@vue-flow/core').NodeTypesObject} */ (
  /** @type {unknown} */ (markRaw(nodeComponents))
)

const edgeTypes = /** @type {any} */ (markRaw({ flow: FlowEdge }))

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
 * Applied as a diff, not with `setNodes`. Replacing the array throws away the
 * handle bounds Vue Flow measured, and an edge whose handles are gone is never
 * drawn, so every edge vanished after any save until the page was reloaded.
 *
 * A one-way `:nodes` prop is no good either: Vue Flow could not write a dragged
 * position back.
 *
 * @param {import('@/domain/types.js').VueFlowNode[]} nextNodes
 * @param {import('@/domain/types.js').VueFlowEdge[]} nextEdges
 * @param {string} openId
 */
function syncGraph(nextNodes, nextEdges, openId) {
  const known = new Map(getNodes.value.map((node) => [node.id, node]))
  const wanted = new Set(nextNodes.map((node) => node.id))

  const gone = [...known.keys()].filter((id) => !wanted.has(id))
  if (gone.length) removeNodes(gone)

  const fresh = nextNodes.filter((node) => !known.has(node.id))
  if (fresh.length) addNodes(fresh.map((node) => ({ ...node, selected: node.id === openId })))

  for (const node of nextNodes) {
    const current = known.get(node.id)
    if (!current) continue

    // The open node is the highlighted one, so a shared link marks it too.
    const update = { data: node.data, selected: node.id === openId }
    const moved =
      Math.abs(current.position.x - node.position.x) > 0.5 ||
      Math.abs(current.position.y - node.position.y) > 0.5

    updateFlowNode(node.id, moved ? { ...update, position: node.position } : update)
  }

  /*
   * Edges are updated in place and hidden when they go, never removed.
   * `setEdges` drops every edge, and `addEdges` is refused for a connection Vue
   * Flow still remembers, so an undone detach could never be drawn again.
   */
  const wantedEdges = new Map(nextEdges.map((edge) => [edge.id, edge]))

  for (const edge of getEdges.value) {
    const next = wantedEdges.get(edge.id)
    if (!next) {
      edge.hidden = true
      continue
    }

    if (edge.source !== next.source) edge.source = next.source
    if (edge.target !== next.target) edge.target = next.target
    edge.hidden = false
    wantedEdges.delete(edge.id)
  }

  if (wantedEdges.size) addEdges([...wantedEdges.values()].map((edge) => ({ ...edge })))
}

watch(
  [nodes, edges, () => route.params.id],
  ([nextNodes, nextEdges, openId]) => syncGraph(nextNodes, nextEdges, String(openId ?? '')),
  { immediate: true },
)

/** @param {{ node: import('@vue-flow/core').GraphNode }} event */
function onNodeClick({ node }) {
  if (!isOpenable(node.data.node)) return
  focus(node.id)
  router.push({ name: ROUTE.NODE_DETAILS, params: { id: node.id } })
}

/** The node a connection is being dragged from, or empty. */
const connectingFrom = ref('')

const flowNodes = () => nodes.value.map((node) => node.data.node)

provide(CONNECT_STATE, {
  from: connectingFrom,
  accepts: (/** @type {string} */ id) =>
    Boolean(connectingFrom.value) && canConnect(flowNodes(), connectingFrom.value, id) === null,
})

/** @param {{ nodeId?: string | null }} event */
function onConnectStart(event) {
  connectingFrom.value = toNodeId(event?.nodeId ?? '')
}

function onConnectEnd() {
  connectingFrom.value = ''
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

  return canConnect(flowNodes(), toNodeId(source), toNodeId(target)) === null
}

/** The payload gives a node one parent, so connecting re-parents rather than adding an edge. */
/** @param {{ source: string, target: string }} connection */
function onConnect({ source, target }) {
  const refusal = canConnect(flowNodes(), toNodeId(source), toNodeId(target))

  if (refusal) {
    toasts.push(refusal, { tone: 'danger' })
    return
  }

  const id = toNodeId(target)

  // Drawn here, with the id the adapter will use. Vue Flow remembers the
  // connection the drag just made and refuses to add it again afterwards, so an
  // edge left to the next sync never appears.
  addEdges([{ id: `e-${id}`, source: toNodeId(source), target: id, type: 'flow' }])

  updateNode.mutate({ id, patch: { parentId: toNodeId(source), position: pinnedPosition(id) } })
}

/**
 * Re-parenting changes where the layout would put a node, so its current position
 * is pinned in the same write. Otherwise detaching a node makes it jump.
 *
 * @param {string} id
 * @returns {{ x: number, y: number } | undefined}
 */
function pinnedPosition(id) {
  const node = findNode(id)
  return node ? { x: node.position.x, y: node.position.y } : undefined
}

/** @param {string} targetId */
function detach(targetId) {
  const id = toNodeId(targetId)
  updateNode.mutate({
    id,
    patch: { parentId: ROOT_PARENT_ID, position: pinnedPosition(id) },
  })
}

provide(DETACH_EDGE, detach)

/** Detach, rather than delete the node the edge points at. */
/** @param {{ edges: { target: string }[] }} event */
function onEdgesDelete({ edges: removed }) {
  for (const edge of removed) detach(edge.target)
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
  <div ref="container" class="h-full w-full" :class="connectingFrom ? 'is-connecting' : ''">
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
      :edge-types="edgeTypes"
      :default-edge-options="{ type: 'flow' }"
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
      @connect-start="onConnectStart"
      @connect-end="onConnectEnd"
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
