import { computed } from 'vue'

import { isMacPlatform } from '@/domain/platform.js'

/** `navigator.platform` is deprecated, so it is the fallback rather than the source. */
export function usePlatform() {
  const isMac = computed(() => isMacPlatform(platformString()))

  return { isMac }
}

/** @returns {string} */
function platformString() {
  if (typeof navigator === 'undefined') return ''

  const modern = /** @type {any} */ (navigator).userAgentData?.platform
  return modern || navigator.platform || navigator.userAgent || ''
}
