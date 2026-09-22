import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AddCommentBody from '../AddCommentBody.vue'

const render = (comment) =>
  mount(AddCommentBody, { props: { modelValue: { comment }, 'onUpdate:modelValue': () => {} } })

describe('AddCommentBody', () => {
  it('shows the existing comment and clears it on request', async () => {
    const wrapper = render('User message during off hours')
    expect(wrapper.find('textarea').element.value).toBe('User message during off hours')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('offers nothing to clear when the comment is already empty', () => {
    expect(render('').find('button').attributes('disabled')).toBeDefined()
  })
})
