<script setup>
import { computed } from 'vue'

import { keyLabel } from '@/domain/shortcuts.js'

const props = defineProps({
  value: { type: String, required: true },
  isMac: { type: Boolean, default: false },
})

const label = computed(() => keyLabel(props.value, props.isMac))
</script>

<template>
  <kbd
    class="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-line bg-sunken px-1.5 font-sans text-xs leading-none font-medium text-ink shadow-[0_1px_0_var(--line)]"
  >
    {{ label }}
  </kbd>
</template>
