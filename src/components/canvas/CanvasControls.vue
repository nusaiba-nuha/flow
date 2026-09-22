<script setup>
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'

import IconButton from '@/components/ui/IconButton.vue'

/**
 * Instead of `@vue-flow/controls`, whose buttons carry no accessible name or
 * tooltip and style themselves outside our tokens. Same `useVueFlow` API.
 */
const { zoomIn, zoomOut, fitView, zoomTo, viewport } = useVueFlow()

const percentage = computed(() => `${Math.round(viewport.value.zoom * 100)}%`)

const ZOOM_STEP = { duration: 140 }
</script>

<template>
  <div class="absolute bottom-4 left-4 z-10 flex flex-col items-stretch gap-1">
    <IconButton
      label="Zoom in"
      title="Zoom in. Scrolling on the canvas zooms too"
      @click="zoomIn(ZOOM_STEP)"
    >
      <path d="M12 5v14M5 12h14" />
    </IconButton>

    <IconButton
      label="Zoom out"
      title="Zoom out. Scrolling on the canvas zooms too"
      @click="zoomOut(ZOOM_STEP)"
    >
      <path d="M5 12h14" />
    </IconButton>

    <IconButton
      label="Fit to screen"
      title="Bring every node into view"
      @click="fitView({ padding: 0.2, duration: 200 })"
    >
      <path
        d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
      />
    </IconButton>

    <!-- The zoom level doubles as the control that resets it. -->
    <span :title="`Zoom is ${percentage}. Click to reset to 100%`">
      <button
        type="button"
        class="w-full rounded-lg border border-line bg-surface px-1 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-hover"
        aria-label="Reset zoom to 100 percent"
        @click="zoomTo(1, ZOOM_STEP)"
      >
        {{ percentage }}
      </button>
    </span>
  </div>
</template>
