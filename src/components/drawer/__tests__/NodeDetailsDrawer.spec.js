import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createWebHistory } from 'vue-router'

import payload from '@/tests/fixtures/payload.json'
import * as flowApi from '@/api/flowApi.js'
import { createTestQueryClient, waitUntil } from '@/tests/utils.js'
import NodeDetailsDrawer from '../NodeDetailsDrawer.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/flow' },
    { path: '/flow', name: 'flow', component: { template: '<div />' } },
    { path: '/flow/node/:id', name: 'node-details', component: { template: '<div />' } },
  ],
})

async function renderDrawer(id) {
  const wrapper = mount(NodeDetailsDrawer, {
    props: { id },
    global: {
      plugins: [createPinia(), router, [VueQueryPlugin, { queryClient: createTestQueryClient() }]],
    },
  })
  await waitUntil(() => wrapper.find('input').exists() || wrapper.find('[role="alert"]').exists())
  return wrapper
}

const buttonWith = (wrapper, text) =>
  wrapper.findAll('button').find((button) => button.text().includes(text))

beforeEach(async () => {
  flowApi.resetFlow()
  vi.restoreAllMocks()
  vi.stubEnv('VITE_PAYLOAD_URL', '')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => structuredClone(payload) })),
  )
  await router.push('/flow/node/b6a0c1')
})

describe('NodeDetailsDrawer', () => {
  it('loads the node named by the route param, and says so when it is gone', async () => {
    const wrapper = await renderDrawer('b6a0c1')
    expect(wrapper.find('input').element.value).toBe('Away Message')
    expect(wrapper.text()).toContain('Send Message')

    const missing = await renderDrawer('ghost')
    expect(missing.find('[role="alert"]').text()).toContain('no longer exists')
  })

  it('saves an edited title and refuses to save an empty one', async () => {
    const update = vi.spyOn(flowApi, 'updateNode')
    const wrapper = await renderDrawer('b6a0c1')

    await wrapper.find('input').setValue('')
    await buttonWith(wrapper, 'Save changes').trigger('click')
    expect(update).not.toHaveBeenCalled()
    expect(wrapper.text()).toMatch(/required/i)

    await wrapper.find('input').setValue('Renamed')
    await buttonWith(wrapper, 'Save changes').trigger('click')
    await waitUntil(() => update.mock.calls.length > 0)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'b6a0c1',
        patch: expect.objectContaining({ name: 'Renamed' }),
      }),
    )
  })

  it('deletes only after a confirmation, which Escape backs out of', async () => {
    const remove = vi.spyOn(flowApi, 'deleteNode')
    const wrapper = await renderDrawer('b6a0c1')

    await buttonWith(wrapper, 'Delete node').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(buttonWith(wrapper, 'Confirm delete')).toBeUndefined()
    expect(remove).not.toHaveBeenCalled()

    await buttonWith(wrapper, 'Delete node').trigger('click')
    await buttonWith(wrapper, 'Confirm delete').trigger('click')
    await waitUntil(() => remove.mock.calls.length > 0)
    expect(remove).toHaveBeenCalledWith({ id: 'b6a0c1' })
  })
})
