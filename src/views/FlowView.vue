<script setup>
import { RouterView } from 'vue-router'

import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <FlowCanvas />

    <!-- Nested, so opening a node never unmounts the canvas. -->
    <RouterView />
  </div>
</template>
