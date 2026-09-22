<script setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'

import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
import CreateNodeDialog from '@/components/canvas/CreateNodeDialog.vue'
import FlowToolbar from '@/components/canvas/FlowToolbar.vue'

// The route view stays a composition surface: layout, and what is on screen.
const isCreating = ref(false)
</script>

<template>
  <div class="flex h-full w-full flex-col bg-canvas">
    <header class="flex items-center justify-between border-b border-line bg-surface px-5 py-3">
      <div>
        <h1 class="text-sm font-semibold">Flow Builder</h1>
        <p class="text-xs text-muted">Click a node to open its details</p>
      </div>

      <FlowToolbar @create="isCreating = true" />
    </header>

    <main class="relative min-h-0 flex-1">
      <FlowCanvas />

      <!-- Nested, so the drawer mounts over the canvas without unmounting it. -->
      <RouterView v-slot="{ Component }">
        <Transition name="drawer">
          <component :is="Component" />
        </Transition>
      </RouterView>

      <CreateNodeDialog v-if="isCreating" @close="isCreating = false" />
    </main>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
