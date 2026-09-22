import { computed, reactive, ref, watch } from 'vue'

import { validate } from '@/domain/validators.js'

/**
 * Edits stay out of the query cache until saved, so a refetch cannot overwrite
 * what the user is typing.
 *
 * @template {Record<string, any>} T
 * @param {import('vue').ComputedRef<T | null>} source
 * @param {Record<string, import('@/domain/validators.js').Validator[]>} rules
 */
export function useDraft(source, rules) {
  /** @type {Record<string, any>} */
  const draft = reactive({})
  const touched = ref(new Set())

  function reset() {
    Object.keys(draft).forEach((key) => delete draft[key])
    // JSON round trip: the source is a reactive proxy, which structuredClone refuses.
    Object.assign(draft, JSON.parse(JSON.stringify(source.value ?? {})))
    touched.value = new Set()
  }

  // Re-seed on a different node, but leave an open form alone mid-edit.
  watch(
    source,
    (next, previous) => {
      if (!previous || next?.id !== previous?.id) reset()
    },
    { immediate: true },
  )

  const errors = computed(() =>
    Object.fromEntries(
      Object.entries(rules).map(([field, checks]) => [field, validate(draft[field], checks)]),
    ),
  )

  /** Hidden until the user has been near the field, so a fresh form stays quiet. */
  const visibleErrors = computed(() =>
    Object.fromEntries(
      Object.entries(errors.value).map(([field, message]) => [
        field,
        touched.value.has(field) ? message : null,
      ]),
    ),
  )

  const isValid = computed(() => Object.values(errors.value).every((message) => message === null))

  const isDirty = computed(() =>
    Object.keys(rules).some((field) => !isSame(draft[field], source.value?.[field])),
  )

  /** Cloned object fields always fail reference equality, and every value here is JSON. */
  /** @param {unknown} a @param {unknown} b */
  function isSame(a, b) {
    if (a === b) return true
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
    return JSON.stringify(a) === JSON.stringify(b)
  }

  /** @param {string} field */
  function touch(field) {
    touched.value = new Set(touched.value).add(field)
  }

  /** Reveal every problem at once after a failed save. */
  function touchAll() {
    touched.value = new Set(Object.keys(rules))
  }

  return { draft, errors: visibleErrors, isValid, isDirty, touch, touchAll, reset }
}
