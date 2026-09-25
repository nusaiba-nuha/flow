<script setup>
import { SAMPLES } from '@/domain/samples.js'

defineProps({
  isLoading: { type: Boolean, default: false },
  isError: { type: Boolean, default: false },
  message: { type: String, default: '' },
})

defineEmits(['retry', 'sample'])
</script>

<template>
  <div class="flex h-full w-full items-center justify-center p-8">
    <div v-if="isLoading" class="flex items-center gap-3 text-muted" role="status">
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-muted"
        aria-hidden="true"
      />
      Loading diagram
    </div>

    <div v-else-if="isError" class="max-w-sm text-center" role="alert">
      <p class="text-sm font-medium">The diagram could not be loaded.</p>
      <p class="mt-1 text-xs text-muted">{{ message }}</p>
      <button
        type="button"
        class="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-hover"
        title="Load the diagram again"
        @click="$emit('retry')"
      >
        Try again
      </button>
    </div>

    <div v-else class="pointer-events-auto max-w-sm text-center">
      <p class="text-sm font-medium">An empty diagram</p>
      <p class="mt-1 text-xs text-muted">Drag a shape in from the left, or start from a sample.</p>

      <ul class="mt-4 grid gap-2">
        <li v-for="sample in SAMPLES" :key="sample.id">
          <button
            type="button"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:bg-hover"
            :title="`Open the ${sample.title.toLowerCase()} sample. Undo brings back the empty diagram`"
            @click="$emit('sample', sample.id)"
          >
            <span class="block text-sm font-medium">{{ sample.title }}</span>
            <span class="block text-xs text-muted">{{ sample.description }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
