import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createWebHistory } from 'vue-router'

import payload from '@/tests/fixtures/payload.json'
import { resetFlow } from '@/api/flowApi.js'
import { createTestQueryClient, waitUntil } from '@/tests/utils.js'

/** Vue Flow measures real DOM, which happy-dom cannot provide; E2E covers the real thing. */
const fitView = vi.fn()
const setViewport = vi.fn()
// A tiny stand-in store, so the diff has something to read back.
const store = { nodes: [], edges: [] }
const addNodes = vi.fn((added) => store.nodes.push(...added))
const addEdges = vi.fn((added) => store.edges.push(...added))
const removeNodes = vi.fn((ids) => (store.nodes = store.nodes.filter((n) => !ids.includes(n.id))))
const removeEdges = vi.fn((ids) => (store.edges = store.edges.filter((e) => !ids.includes(e.id))))
const updateFlowNode = vi.fn()
const updateEdge = vi.fn()
// Measured nodes, which is what the canvas waits for before panning.
const findNode = vi.fn((id) => ({
  id,
  position: { x: 0, y: 0 },
  dimensions: { width: 160, height: 60 },
}))

const lastNodes = () => store.nodes
const lastEdges = () => store.edges

const VueFlowStub = defineComponent({
  name: 'VueFlow',
  setup(_props, { slots }) {
    return () => h('div', { class: 'vue-flow-stub' }, slots.default?.())
  },
})

vi.mock('@vue-flow/core', () => ({
  VueFlow: VueFlowStub,
  useVueFlow: () => ({
    fitView,
    findNode,
    setViewport,
    addNodes,
    addEdges,
    removeNodes,
    removeEdges,
    updateNode: updateFlowNode,
    updateEdge,
    getNodes: { value: store.nodes },
    getEdges: { value: store.edges },
    viewport: ref({ x: 0, y: 0, zoom: 1 }),
  }),
  Handle: { template: '<div />' },
  Position: { Top: 'top', Bottom: 'bottom' },
}))
vi.mock('@vue-flow/background', () => ({ Background: { template: '<div />' } }))

const { default: FlowCanvas } = await import('../FlowCanvas.vue')
const { useCanvasStore } = await import('@/stores/canvas.js')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/flow' },
    { path: '/flow', name: 'flow', component: { template: '<div />' } },
    { path: '/flow/node/:id', name: 'node-details', component: { template: '<div />' } },
  ],
})

const mountCanvas = (pinia = createPinia()) =>
  mount(FlowCanvas, {
    global: {
      plugins: [pinia, router, [VueQueryPlugin, { queryClient: createTestQueryClient() }]],
    },
  })

async function renderCanvas() {
  const wrapper = mountCanvas()
  await waitUntil(() => wrapper.findComponent(VueFlowStub).exists() && lastNodes().length > 0)
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  resetFlow()
  vi.clearAllMocks()
  store.nodes = []
  store.edges = []
  vi.stubEnv('VITE_PAYLOAD_URL', '')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => structuredClone(payload) })),
  )
})

describe('FlowCanvas', () => {
  it('shows loading first, then hands every node and edge to Vue Flow', async () => {
    const wrapper = mountCanvas()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    await waitUntil(() => lastNodes().length > 0)
    expect(lastNodes()).toHaveLength(payload.length)
    expect(lastEdges()).toHaveLength(payload.length - 1)
  })

  it('fits only once the nodes are measured, and not at all for a returning viewport', async () => {
    const wrapper = await renderCanvas()
    expect(fitView).not.toHaveBeenCalled()

    const flow = wrapper.findComponent(VueFlowStub)
    flow.vm.$emit('nodes-initialized')
    flow.vm.$emit('nodes-initialized')
    expect(fitView).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()
    store.nodes = []
    store.edges = []
    const pinia = createPinia()
    setActivePinia(pinia)
    useCanvasStore().setViewport({ x: 10, y: 20, zoom: 1.5 })

    const returning = mountCanvas(pinia)
    await waitUntil(() => returning.findComponent(VueFlowStub).exists())
    returning.findComponent(VueFlowStub).vm.$emit('nodes-initialized')

    expect(setViewport).toHaveBeenCalledWith({ x: 10, y: 20, zoom: 1.5 })
    expect(fitView).not.toHaveBeenCalled()
  })

  it('opens an openable node on click, ignores the rest, and persists a drag on drop', async () => {
    const wrapper = await renderCanvas()
    const push = vi.spyOn(router, 'push')
    const flow = wrapper.findComponent(VueFlowStub)

    flow.vm.$emit('node-click', { node: lastNodes().find((node) => node.id === 'b6a0c1') })
    expect(push).toHaveBeenCalledWith({ name: 'node-details', params: { id: 'b6a0c1' } })

    push.mockClear()
    for (const id of ['1', '161f52']) {
      flow.vm.$emit('node-click', { node: lastNodes().find((node) => node.id === id) })
    }
    expect(push).not.toHaveBeenCalled()

    flow.vm.$emit('node-drag-stop', { node: { id: 'b6a0c1', position: { x: 300, y: 500 } } })
    // Persisted through the mutation, then applied to the existing node.
    await waitUntil(() =>
      updateFlowNode.mock.calls.some(([id, patch]) => id === 'b6a0c1' && patch.position?.x === 300),
    )
  })
})
