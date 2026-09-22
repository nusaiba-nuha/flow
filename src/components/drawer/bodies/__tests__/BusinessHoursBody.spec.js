import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'

import BusinessHoursBody from '../BusinessHoursBody.vue'

// The picker renders its own overlay and reads real layout; the conversions are
// covered in domain/time.spec.js.
vi.mock('@vuepic/vue-datepicker', () => ({
  VueDatePicker: { props: ['modelValue'], template: '<div class="picker" />' },
}))

// Reactive, as the drawer draft is: the body normalises the week on mount.
const render = async (data) => {
  const wrapper = mount(BusinessHoursBody, {
    props: { modelValue: reactive(data), 'onUpdate:modelValue': () => {} },
  })
  // The week is normalised on mount.
  await nextTick()
  return wrapper
}

describe('BusinessHoursBody', () => {
  it('renders seven rows even when the payload is missing days', async () => {
    const data = { times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }], timezone: 'UTC' }
    const wrapper = await render(data)

    expect(wrapper.findAll('li')).toHaveLength(7)
    expect(wrapper.findAll('.picker')).toHaveLength(14)
  })

  it('flags a row whose end is not after its start', async () => {
    const data = {
      times: [{ day: 'mon', startTime: '17:00', endTime: '09:00' }],
      timezone: 'UTC',
    }
    const wrapper = await render(data)

    expect(wrapper.find('[role="alert"]').text()).toMatch(/after start time/i)
  })

  it('keeps the node own zone rather than adopting the browser one', async () => {
    const data = { times: [], timezone: 'Asia/Karachi' }
    const wrapper = await render(data)

    expect(data.timezone).toBe('Asia/Karachi')
    expect(wrapper.find('select').element.value).toBe('Asia/Karachi')
  })
})
