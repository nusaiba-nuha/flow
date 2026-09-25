<script setup>
import { RouterView } from 'vue-router'

import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
import FlowToolbar from '@/components/canvas/FlowToolbar.vue'
import ShapePalette from '@/components/palette/ShapePalette.vue'
import TextPanel from '@/components/text/TextPanel.vue'
import HelpDialog from '@/components/ui/HelpDialog.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useHelpDialog } from '@/composables/useHelpDialog.js'
import { useCanvasStore } from '@/stores/canvas.js'

// The route view stays a composition surface: layout, and what is on screen.
const canvas = useCanvasStore()
// Bound at the shell: a dialog that is not mounted cannot listen for its own key.
const help = useHelpDialog()
</script>

<template>
  <div class="flex h-full w-full flex-col bg-canvas">
    <header class="flex items-center justify-between border-b border-line bg-surface px-5 py-3">
      <div>
        <h1 class="text-sm font-semibold">Flow</h1>
        <p class="text-xs text-muted">Drag a shape in, click one to open its details</p>
      </div>

      <FlowToolbar @help="help.open" />
    </header>

    <div class="flex min-h-0 flex-1">
      <ShapePalette @add="canvas.requestShape" />
      <TextPanel v-if="canvas.isTextOpen" />

      <main class="relative min-w-0 flex-1">
        <FlowCanvas />

        <!-- Nested, so the drawer mounts over the canvas without unmounting it. -->
        <RouterView v-slot="{ Component }">
          <Transition name="drawer">
            <component :is="Component" />
          </Transition>
        </RouterView>

        <HelpDialog v-if="help.isOpen.value" @close="help.close" />
        <ToastHost />
      </main>
    </div>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform var(--slow) var(--ease);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
