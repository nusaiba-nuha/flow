<script setup>
import { computed, useId } from 'vue'

/** Wired for errors the same way TextField is. */
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  options: {
    type: /** @type {import('vue').PropType<{ value: string, label: string }[]>} */ (Array),
    required: true,
  },
  error: { type: /** @type {import('vue').PropType<string | null>} */ (String), default: null },
  placeholder: { type: String, default: 'Select an option' },
})

const emit = defineEmits(['update:modelValue', 'blur'])

/** @param {Event} event */
function onChange(event) {
  emit('update:modelValue', /** @type {HTMLSelectElement} */ (event.target).value)
}

const id = useId()
const errorId = computed(() => `${id}-error`)
</script>

<template>
  <div>
    <label :for="id" class="mb-1 block text-xs font-medium text-muted">{{ label }}</label>

    <select
      :id="id"
      :value="modelValue"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      class="w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors"
      :class="error ? 'border-danger' : 'border-line focus:border-line-strong'"
      @change="onChange"
      @blur="emit('blur')"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p v-if="error" :id="errorId" class="mt-1 text-xs text-danger">{{ error }}</p>
  </div>
</template>
