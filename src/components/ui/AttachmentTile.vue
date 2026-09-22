<script setup>
import { computed } from 'vue'

import { attachmentName } from '@/domain/format.js'

const props = defineProps({
  attachment: { type: String, required: true },
  name: { type: String, default: '' },
})

defineEmits(['remove'])

const label = computed(() => props.name || attachmentName(props.attachment))

/** A blocked image should fade, not leave an empty hole. @param {Event} event */
function onImageError(event) {
  ;/** @type {HTMLImageElement} */ (event.target).style.opacity = '0.15'
}
</script>

<template>
  <figure class="group relative overflow-hidden rounded-lg border border-line bg-sunken">
    <img
      :src="attachment"
      :alt="label"
      class="h-20 w-full object-cover"
      loading="lazy"
      @error="onImageError"
    />

    <figcaption class="truncate px-2 py-1 text-[11px] text-muted" :title="label">
      {{ label }}
    </figcaption>

    <button
      type="button"
      class="absolute top-1 right-1 rounded-md bg-surface/90 p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-danger"
      :aria-label="`Remove ${label}`"
      :title="`Remove ${label} from this message`"
      @click="$emit('remove')"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  </figure>
</template>
