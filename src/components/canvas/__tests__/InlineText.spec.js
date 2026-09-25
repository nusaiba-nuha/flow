import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import InlineText from '../InlineText.vue'

const render = (value = 'Away') =>
  mount(InlineText, { props: { value, label: 'Shape title' }, attachTo: document.body })

describe('InlineText', () => {
  it('starts focused with the text selected, ready to type over', () => {
    const wrapper = render()
    const input = /** @type {HTMLInputElement} */ (wrapper.find('input').element)

    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(4)
    wrapper.unmount()
  })

  it('saves on Enter, once, even though leaving the field follows', async () => {
    const wrapper = render()
    await wrapper.find('input').setValue('Out of hours')
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    await wrapper.find('input').trigger('blur')

    expect(wrapper.emitted('save')).toEqual([['Out of hours']])
    wrapper.unmount()
  })

  it('cancels on Escape, and saves nothing when focus then leaves', async () => {
    const wrapper = render()
    await wrapper.find('input').setValue('Discarded')
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })
    await wrapper.find('input').trigger('blur')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })
})
