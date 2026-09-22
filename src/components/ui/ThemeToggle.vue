<script setup>
import { computed } from 'vue'

import { THEME } from '@/stores/theme.js'
import { useTheme } from '@/composables/useTheme.js'

/** System is a visible state, not an invisible default: it is a choice people make. */
const { preference, label, cycle } = useTheme()

const icon = computed(() => {
  if (preference.value === THEME.LIGHT) return 'sun'
  if (preference.value === THEME.DARK) return 'moon'
  return 'system'
})
</script>

<template>
  <button
    type="button"
    class="rounded-lg border border-line bg-surface px-2.5 py-2 text-ink transition-colors hover:bg-hover"
    :title="`${label}. Click to change.`"
    :aria-label="label"
    @click="cycle"
  >
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="icon === 'sun'">
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
        />
      </template>

      <template v-else-if="icon === 'moon'">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </template>

      <template v-else>
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </template>
    </svg>
  </button>
</template>
