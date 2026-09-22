<script setup>
import { useToastStore } from '@/stores/toasts.js'

const toasts = useToastStore()

/** @param {{ id: number, action?: { run: () => void } }} toast */
function run(toast) {
  toast.action?.run()
  toasts.dismiss(toast.id)
}
</script>

<template>
  <Teleport to="body">
    <!-- Polite, not assertive: a confirmation should not interrupt a screen reader. -->
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg"
        >
          <span>{{ toast.message }}</span>

          <button
            v-if="toast.action"
            type="button"
            class="text-xs font-medium text-focus hover:underline"
            :title="`${toast.action.label} this change`"
            @click="run(toast)"
          >
            {{ toast.action.label }}
          </button>

          <button
            type="button"
            class="rounded-md p-0.5 text-muted hover:bg-hover"
            aria-label="Dismiss"
            title="Dismiss this message"
            @click="toasts.dismiss(toast.id)"
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
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
