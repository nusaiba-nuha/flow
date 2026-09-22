<script setup>
import { ref } from 'vue'

/** Owns only the two-step delete, which has no meaning outside this strip. */
defineProps({
  isDirty: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  isDeleting: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  error: { type: /** @type {import('vue').PropType<string | null>} */ (String), default: null },
})

const emit = defineEmits(['save', 'cancel', 'delete'])

const confirming = ref(false)

function cancelConfirm() {
  confirming.value = false
}

defineExpose({ cancelConfirm, confirming })
</script>

<template>
  <footer class="space-y-3 border-t border-line px-5 py-4">
    <!-- Titles sit on the wrappers: Chrome shows none on a disabled button. -->
    <div class="flex gap-2">
      <span class="flex-1" :title="isDirty ? 'Save your changes' : 'No changes to save'">
        <button
          type="button"
          class="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink transition-opacity disabled:opacity-40"
          :disabled="!isDirty || isSaving"
          @click="emit('save')"
        >
          {{ isSaving ? 'Saving' : 'Save changes' }}
        </button>
      </span>

      <span :title="isDirty ? 'Discard your unsaved edits' : 'Nothing to discard'">
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-2 text-sm transition-opacity disabled:opacity-40"
          :disabled="!isDirty"
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </span>
    </div>

    <p v-if="error" class="text-xs text-danger" role="alert">{{ error }}</p>

    <div v-if="canDelete" class="flex items-center justify-between">
      <button
        v-if="!confirming"
        type="button"
        class="text-xs font-medium text-danger hover:underline"
        title="Delete this node. Its children move up to its parent"
        @click="confirming = true"
      >
        Delete node
      </button>

      <template v-else>
        <span class="text-xs text-muted">Delete this node?</span>
        <span class="flex gap-2">
          <!-- Not "Cancel": the footer already has one, and two controls with the
               same name in one region are ambiguous by voice or screen reader. -->
          <button
            type="button"
            class="text-xs text-muted hover:underline"
            title="Leave this node alone"
            @click="cancelConfirm"
          >
            Keep node
          </button>
          <button
            type="button"
            class="rounded-md bg-danger px-2 py-1 text-xs font-medium text-brand-ink disabled:opacity-40"
            title="Delete now"
            :disabled="isDeleting"
            @click="emit('delete')"
          >
            Confirm delete
          </button>
        </span>
      </template>
    </div>
  </footer>
</template>
