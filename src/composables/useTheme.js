import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { THEME, useThemeStore } from '@/stores/theme.js'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * The stylesheet already handles the system case. This watches the query only so
 * the interface can describe the active theme.
 */
export function useTheme() {
  const store = useThemeStore()
  const prefersDark = ref(matches())

  /** @type {MediaQueryList | null} */
  let query = null
  /** @param {MediaQueryListEvent} event */
  const onChange = (event) => (prefersDark.value = event.matches)

  onMounted(() => {
    query = window.matchMedia?.(DARK_QUERY) ?? null
    query?.addEventListener('change', onChange)
    prefersDark.value = matches()
  })

  onBeforeUnmount(() => query?.removeEventListener('change', onChange))

  const resolved = computed(() => {
    if (store.preference === THEME.SYSTEM) return prefersDark.value ? THEME.DARK : THEME.LIGHT
    return store.preference
  })

  const isDark = computed(() => resolved.value === THEME.DARK)

  const label = computed(() => {
    if (store.preference === THEME.SYSTEM) return `System theme (${resolved.value})`
    return store.preference === THEME.DARK ? 'Dark theme' : 'Light theme'
  })

  return {
    preference: computed(() => store.preference),
    resolved,
    isDark,
    label,
    cycle: store.cycle,
    set: store.set,
  }
}

function matches() {
  try {
    return window.matchMedia?.(DARK_QUERY).matches ?? false
  } catch {
    return false
  }
}
