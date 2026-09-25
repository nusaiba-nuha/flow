import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { SHAPE_OPTIONS } from '@/domain/nodeMeta.js'
import ShapePalette from '../ShapePalette.vue'
import { SHAPE_DRAG_TYPE } from '../dragType.js'

describe('ShapePalette', () => {
  it('lists every shape, each explaining how to use it', () => {
    const buttons = mount(ShapePalette).findAll('button')

    expect(buttons.map((button) => button.find('span').text())).toEqual(
      SHAPE_OPTIONS.map((o) => o.label),
    )
    buttons.forEach((button) => expect(button.attributes('title')).toMatch(/drag onto the canvas/i))
  })

  it('lists the wireframe shapes in a section of their own', () => {
    const sections = mount(ShapePalette).findAll('section')

    expect(sections.map((section) => section.find('h2').text())).toEqual(['Shapes', 'Wireframe'])
    expect(
      sections[1].findAll('[data-shape]').map((button) => button.attributes('data-shape')),
    ).toEqual(['screen', 'button', 'input', 'card', 'list', 'image'])
  })

  it('asks for a shape on click, and carries it on a drag', async () => {
    const wrapper = mount(ShapePalette)
    const decision = wrapper.find('[data-shape="decision"]')

    await decision.trigger('click')
    expect(wrapper.emitted('add')).toEqual([['decision']])

    const data = new Map()
    const dataTransfer = { setData: (type, value) => data.set(type, value), effectAllowed: '' }
    await decision.trigger('dragstart', { dataTransfer })
    expect(data.get(SHAPE_DRAG_TYPE)).toBe('decision')
    expect(dataTransfer.effectAllowed).toBe('copy')
  })
})
