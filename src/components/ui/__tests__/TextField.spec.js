import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TextField from '../TextField.vue'

const render = (props = {}) => mount(TextField, { props: { label: 'Title', ...props } })

describe('TextField', () => {
  it('labels the control it renders, input or textarea', () => {
    const input = render()
    expect(input.find('label').attributes('for')).toBe(input.find('input').attributes('id'))

    expect(render({ multiline: true }).find('textarea').exists()).toBe(true)
  })

  it('wires an error to the control for assistive tech', () => {
    const field = render({ error: 'Title is required.' })
    const describedBy = field.find('input').attributes('aria-describedby')

    expect(field.find('input').attributes('aria-invalid')).toBe('true')
    expect(field.find(`#${describedBy}`).text()).toBe('Title is required.')
  })

  it('counts down the remaining characters and flags an overrun', () => {
    expect(render({ maxlength: 10, modelValue: 'abc' }).text()).toContain('7')
    expect(render({ maxlength: 3, modelValue: 'abcde' }).find('span').classes()).toContain(
      'text-danger',
    )
  })
})
