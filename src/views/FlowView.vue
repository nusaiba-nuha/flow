<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <!-- Placeholder until FL-14 brings the canvas. -->
    <p class="p-6 text-sm">Canvas</p>

    <!-- The drawer renders here, inside the view, so opening a node never
         unmounts what is behind it. -->
    <RouterView />
  </div>
</template>
