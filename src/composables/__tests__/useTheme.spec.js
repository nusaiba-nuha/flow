import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { THEME, useThemeStore } from '@/stores/theme.js'
import { useTheme } from '../useTheme.js'
import { withSetup } from '@/tests/utils.js'

const root = () => document.documentElement

beforeEach(() => {
  localStorage.clear()
  root().removeAttribute('data-theme')
  setActivePinia(createPinia())
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})

describe('theme', () => {
  it('starts on system and writes no attribute, so the media query decides', () => {
    const store = useThemeStore()

    expect(store.preference).toBe(THEME.SYSTEM)
    expect(root().hasAttribute('data-theme')).toBe(false)
  })

  it('marks an explicit choice on the root and remembers it', async () => {
    const store = useThemeStore()

    store.set(THEME.LIGHT)
    await nextTick()
    expect(root().getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('flow-builder:theme')).toBe('light')

    store.cycle()
    expect(store.preference).toBe(THEME.DARK)
  })

  it('describes what system currently resolves to', () => {
    const { result } = withSetup(() => useTheme())

    expect(result.resolved.value).toBe(THEME.DARK)
    expect(result.label.value).toBe('System theme (dark)')
  })
})
