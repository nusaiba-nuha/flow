import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createWebHistory } from 'vue-router'

import payload from '@/tests/fixtures/payload.json'
import * as flowApi from '@/api/flowApi.js'
import { createTestQueryClient, waitUntil } from '@/tests/utils.js'
import TextField from '@/components/ui/TextField.vue'
import SelectField from '@/components/ui/SelectField.vue'
import CreateNodeDialog from '../CreateNodeDialog.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/flow' },
    { path: '/flow', name: 'flow', component: { template: '<div />' } },
    { path: '/flow/node/:id', name: 'node-details', component: { template: '<div />' } },
  ],
})

// The panel is teleported to the body, so the DOM is queried there.
const $ = (selector) => /** @type {HTMLElement} */ (document.querySelector(selector))
const $$ = (selector) => Array.from(document.querySelectorAll(selector))

const render = () =>
  mount(CreateNodeDialog, {
    global: {
      plugins: [createPinia(), router, [VueQueryPlugin, { queryClient: createTestQueryClient() }]],
    },
  })

const submit = async (wrapper) => {
  $('form').dispatchEvent(new Event('submit'))
  await wrapper.vm.$nextTick()
}

const fill = async (wrapper, { title, type }) => {
  await wrapper.findComponent(TextField).find('input').setValue(title)
  await wrapper.findComponent(SelectField).find('select').setValue(type)
}

beforeEach(async () => {
  flowApi.resetFlow()
  vi.restoreAllMocks()
  vi.stubEnv('VITE_PAYLOAD_URL', '')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => structuredClone(payload) })),
  )
  await router.push('/flow')
})

describe('CreateNodeDialog', () => {
  it('offers the three types the brief names', () => {
    const wrapper = render()

    expect($$('option').map((option) => option.textContent?.trim())).toEqual([
      'Select a node type',
      'Send Message',
      'Add Comments',
      'Business Hours',
    ])
    wrapper.unmount()
  })

  it('refuses to create without a title and a type', async () => {
    const create = vi.spyOn(flowApi, 'createNode')
    const wrapper = render()

    await submit(wrapper)

    expect(create).not.toHaveBeenCalled()
    expect(document.body.textContent).toMatch(/title is required/i)
    wrapper.unmount()
  })

  it('creates the node, then opens its details', async () => {
    const create = vi.spyOn(flowApi, 'createNode')
    const push = vi.spyOn(router, 'push')
    const wrapper = render()

    await fill(wrapper, { title: 'Follow up', type: 'sendMessage' })
    await submit(wrapper)
    await waitUntil(() => wrapper.emitted('close') !== undefined)

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Follow up', nodeType: 'sendMessage' }),
    )
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'node-details' }))
    wrapper.unmount()
  })
})
