import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createWebHistory } from 'vue-router'

import * as flowApi from '@/api/flowApi.js'
import { createTestQueryClient, waitUntil } from '@/tests/utils.js'
import TextField from '@/components/ui/TextField.vue'
import SelectField from '@/components/ui/SelectField.vue'
import { SHAPE_OPTIONS } from '@/domain/nodeMeta.js'
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
  await router.push('/flow')
})

describe('CreateNodeDialog', () => {
  it('offers every shape in the registry', () => {
    const wrapper = render()

    expect($$('option').map((option) => option.textContent?.trim())).toEqual([
      'Select a shape',
      ...SHAPE_OPTIONS.map((option) => option.label),
    ])
    wrapper.unmount()
  })

  it('refuses to create without a title and a shape', async () => {
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

    await fill(wrapper, { title: 'Follow up', type: 'process' })
    await submit(wrapper)
    await waitUntil(() => wrapper.emitted('close') !== undefined)

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Follow up', shape: 'process' }),
    )
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'node-details' }))
    wrapper.unmount()
  })
})
