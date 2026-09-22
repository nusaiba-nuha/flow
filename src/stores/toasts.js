import { ref } from 'vue'
import { defineStore } from 'pinia'

const DISMISS_MS = 4000

/**
 * Short confirmations of things that already happened.
 *
 * @typedef {{ id: number, message: string, action?: { label: string, run: () => void } }} Toast
 */
export const useToastStore = defineStore('toasts', () => {
  /** @type {import('vue').Ref<Toast[]>} */
  const toasts = ref([])
  let nextId = 0

  /**
   * @param {string} message
   * @param {{ label: string, run: () => void }} [action]
   */
  function push(message, action) {
    nextId += 1
    const id = nextId

    toasts.value = [...toasts.value, { id, message, action }]
    setTimeout(() => dismiss(id), DISMISS_MS)
    return id
  }

  /** @param {number} id */
  function dismiss(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { toasts, push, dismiss }
})
