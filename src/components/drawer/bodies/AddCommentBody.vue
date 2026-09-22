<script setup>
import TextField from '@/components/ui/TextField.vue'
import { FIELD_LIMIT } from '@/domain/validators.js'

const data = defineModel({ type: Object, required: true })

/** Explicit, so an accidental select-all-delete is obvious. */
function clear() {
  data.value.comment = ''
}
</script>

<template>
  <section class="space-y-2 border-t border-line pt-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">Comment</h3>
      <span
        :title="data.comment ? 'Empty the comment. Save to keep the change' : 'Nothing to clear'"
      >
        <button
          type="button"
          class="text-xs font-medium text-ink hover:underline disabled:opacity-40"
          :disabled="!data.comment"
          @click="clear"
        >
          Clear
        </button>
      </span>
    </div>

    <TextField
      v-model="data.comment"
      label="Internal comment"
      multiline
      placeholder="Only your team sees this"
      :maxlength="FIELD_LIMIT.COMMENT_MAX"
    />
  </section>
</template>
