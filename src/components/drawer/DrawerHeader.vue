<script setup>
import { computed } from 'vue'

import NodeIcon from '@/components/ui/NodeIcon.vue'
import { accentClasses } from '@/components/canvas/accents.js'

const props = defineProps({
  label: { type: String, default: 'Node' },
  icon: { type: String, default: '' },
  accent: { type: String, default: 'unknown' },
  name: { type: String, default: '' },
})

defineEmits(['close'])

const accentClass = computed(() => accentClasses(props.accent).icon)
</script>

<template>
  <header class="flex items-start gap-3 border-b border-line px-5 py-4">
    <NodeIcon v-if="icon" :name="icon" :size="18" :class="accentClass" class="mt-0.5" />

    <div class="min-w-0 flex-1">
      <p class="text-xs text-muted">{{ label }}</p>
      <h2 class="truncate text-sm font-semibold">{{ name }}</h2>
    </div>

    <button
      type="button"
      class="rounded-md p-1 text-muted hover:bg-hover"
      aria-label="Close details"
      title="Close details (Esc)"
      @click="$emit('close')"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  </header>
</template>
