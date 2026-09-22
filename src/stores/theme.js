import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'flow-builder:theme'

/** @typedef {'system' | 'light' | 'dark'} ThemePreference */

export const THEME = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
})

/** @param {unknown} value @returns {value is ThemePreference} */
const isPreference = (value) => Object.values(THEME).includes(/** @type {any} */ (value))

/**
 * Three states, not two. An app that starts light on a machine set to dark has
 * ignored something the user already said. Only an explicit choice writes
 * `data-theme`; on system the stylesheet's media query does the work.
 */
export const useThemeStore = defineStore('theme', () => {
  /** @type {import('vue').Ref<ThemePreference>} */
  const preference = ref(read())

  const isExplicit = computed(() => preference.value !== THEME.SYSTEM)

  /** @param {ThemePreference} next */
  function set(next) {
    if (!isPreference(next)) return
    preference.value = next
  }

  function cycle() {
    const order = [THEME.SYSTEM, THEME.LIGHT, THEME.DARK]
    set(order[(order.indexOf(preference.value) + 1) % order.length])
  }

  watch(preference, apply, { immediate: true })

  return { preference, isExplicit, set, cycle }
})

/** localStorage throws in a private window, and a theme must not stop the app. */
function read() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return isPreference(saved) ? /** @type {ThemePreference} */ (saved) : THEME.SYSTEM
  } catch {
    return THEME.SYSTEM
  }
}

/** @param {ThemePreference} next */
function apply(next) {
  const root = document.documentElement

  if (next === THEME.SYSTEM) root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', next)

  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Still applied for this session.
  }
}
