import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useToastStore } from '../toasts.js'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

describe('toasts', () => {
  it('stacks messages and dismisses them on their own', () => {
    const toasts = useToastStore()

    toasts.push('Changes saved')
    toasts.push('Node deleted')
    expect(toasts.toasts).toHaveLength(2)

    vi.advanceTimersByTime(4000)
    expect(toasts.toasts).toEqual([])
  })

  it('carries an action, which the host runs', () => {
    const toasts = useToastStore()
    const run = vi.fn()

    const id = toasts.push('Node deleted', { action: { label: 'Undo', run } })
    toasts.toasts[0].action.run()
    toasts.dismiss(id)

    expect(run).toHaveBeenCalled()
    expect(toasts.toasts).toEqual([])
    expect(toasts.toasts).toEqual([])
  })
})
