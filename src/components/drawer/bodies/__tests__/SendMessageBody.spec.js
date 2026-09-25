import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import payload from '@/tests/fixtures/diagram.json'
import SendMessageBody from '../SendMessageBody.vue'

const welcome = payload.find((node) => node.id === 'b0653a')

const render = (data = structuredClone(welcome.data)) =>
  mount(SendMessageBody, { props: { modelValue: data, 'onUpdate:modelValue': () => {} } })

describe('SendMessageBody', () => {
  it('shows every text and attachment the payload carries', () => {
    const wrapper = render()

    expect(wrapper.findAll('textarea')).toHaveLength(1)
    expect(wrapper.findAll('figure')).toHaveLength(1)
    expect(wrapper.find('textarea').element.value).toContain('Hello there')
  })

  it('removes the right part when texts and attachments are interleaved', async () => {
    const data = {
      payload: [
        { type: 'text', text: 'first' },
        { type: 'attachment', attachment: 'https://example.test/a.jpg' },
        { type: 'text', text: 'second' },
      ],
    }
    const wrapper = render(data)

    // The remove button beside the first text, not the first button on screen.
    await wrapper.findAll('button')[1].trigger('click')

    expect(data.payload.map((part) => part.text ?? part.attachment)).toEqual([
      'https://example.test/a.jpg',
      'second',
    ])
  })

  it('adds an empty text block on request', async () => {
    const data = { payload: [] }
    const wrapper = render(data)

    await wrapper.findAll('button')[0].trigger('click')
    expect(data.payload).toEqual([{ type: 'text', text: '' }])
  })
})
