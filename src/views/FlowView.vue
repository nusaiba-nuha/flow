<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <p class="p-6 text-sm">Canvas</p>

    <!-- Nested, so opening a node never unmounts the canvas. -->
    <RouterView />
  </div>
</template>
