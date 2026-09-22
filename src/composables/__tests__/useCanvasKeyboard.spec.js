import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import payload from '@/tests/fixtures/payload.json'
import { payloadToGraph } from '@/domain/graph.js'
import { useCanvasKeyboard } from '../useCanvasKeyboard.js'

const graph = payloadToGraph(payload)

const press = (key) => window.dispatchEvent(new KeyboardEvent('keydown', { key }))

/** Mounted, so the keydown listener is bound the way it is in the canvas. */
function setup({ isActive = () => true } = {}) {
  const onOpen = vi.fn()
  const source = ref(graph.nodes)
  let api

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useCanvasKeyboard({ nodes: computed(() => source.value), onOpen, isActive })
        return () => h('div')
      },
    }),
  )

  return { api: /** @type {any} */ (api), onOpen, source, unmount: () => wrapper.unmount() }
}

let active

beforeEach(() => {
  active = setup()
})

describe('useCanvasKeyboard', () => {
  it('walks openable nodes in reading order, skipping display only ones', () => {
    const { api } = active

    press('ArrowDown')
    const first = api.focusedId.value
    press('ArrowDown')

    expect(api.reachable.value.map((node) => node.id)).not.toContain('161f52')
    expect(api.focusedId.value).not.toBe(first)
    expect(api.reachable.value[0].id).toBe(first)
  })

  it('opens the focused node, and Escape clears the focus', () => {
    const { api, onOpen } = active

    press('End')
    const last = api.focusedId.value
    press('Enter')
    expect(onOpen).toHaveBeenCalledWith(last)

    press('Escape')
    expect(api.focusedId.value).toBe('')
  })

  it('stands down while a dialog is open', () => {
    active.unmount()
    const { api } = setup({ isActive: () => false })

    press('ArrowDown')
    expect(api.focusedId.value).toBe('')
  })
})
