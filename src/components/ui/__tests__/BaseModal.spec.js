import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseModal from '../BaseModal.vue'

// The panel is teleported to the body, so assertions query the document.
const render = () =>
  mount(BaseModal, {
    props: { title: 'Create new node' },
    slots: { default: '<input class="first" /><button class="last">Save</button>' },
  })

const $ = (selector) => /** @type {HTMLElement} */ (document.querySelector(selector))

describe('BaseModal', () => {
  it('opens on the first field and labels itself for assistive tech', () => {
    const wrapper = render()

    expect(document.activeElement).toBe($('input.first'))
    expect($('[role="dialog"]').getAttribute('aria-label')).toBe('Create new node')
    wrapper.unmount()
  })

  it('closes on Escape and on the backdrop, but not from inside the panel', async () => {
    const wrapper = render()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    $('[data-testid="modal-backdrop"]').click()
    $('[role="dialog"]').click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toHaveLength(2)
    wrapper.unmount()
  })

  it('returns focus where it came from', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    render().unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})
