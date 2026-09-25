<script setup>
import { computed, useId } from 'vue'

/** Input and textarea in one component, so their styling and a11y wiring cannot drift. */
const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  error: { type: /** @type {import('vue').PropType<string | null>} */ (String), default: null },
  multiline: { type: Boolean, default: false },
  maxlength: { type: Number, default: null },
  placeholder: { type: String, default: '' },
  /** A line under the field saying what it is for. */
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'blur'])

const id = useId()
const errorId = computed(() => `${id}-error`)
const hintId = computed(() => `${id}-hint`)
const describedBy = computed(
  () =>
    [props.hint ? hintId.value : '', props.error ? errorId.value : ''].filter(Boolean).join(' ') ||
    undefined,
)
const remaining = computed(() =>
  props.maxlength === null ? null : props.maxlength - props.modelValue.length,
)

/** @param {Event} event */
function onInput(event) {
  const target = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (event.target)
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-baseline justify-between">
      <label :for="id" class="text-xs font-medium text-muted">{{ label }}</label>
      <span
        v-if="remaining !== null"
        class="text-[11px]"
        :class="remaining < 0 ? 'text-danger' : 'text-muted'"
      >
        {{ remaining }}
      </span>
    </div>

    <component
      :is="multiline ? 'textarea' : 'input'"
      :id="id"
      :value="modelValue"
      :rows="multiline ? 3 : undefined"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors disabled:bg-sunken"
      :class="error ? 'border-danger focus:border-danger' : 'border-line focus:border-line-strong'"
      @input="onInput"
      @blur="emit('blur')"
    />

    <p v-if="hint" :id="hintId" class="mt-1 text-xs text-muted">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="mt-1 text-xs text-danger">{{ error }}</p>
  </div>
</template>
