import { ref } from 'vue'
import { defineStore } from 'pinia'

const DISMISS_MS = 4000

/**
 * Short confirmations of things that already happened.
 *
 * @typedef {'success' | 'danger'} ToastTone
 * @typedef {{ id: number, message: string, tone: ToastTone, action?: { label: string, run: () => void } }} Toast
 */
export const useToastStore = defineStore('toasts', () => {
  /** @type {import('vue').Ref<Toast[]>} */
  const toasts = ref([])
  let nextId = 0

  /**
   * @param {string} message
   * @param {{ action?: { label: string, run: () => void }, tone?: ToastTone }} [options]
   */
  function push(message, { action, tone = 'success' } = {}) {
    nextId += 1
    const id = nextId

    toasts.value = [...toasts.value, { id, message, tone, action }]
    setTimeout(() => dismiss(id), DISMISS_MS)
    return id
  }

  /** @param {number} id */
  function dismiss(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { toasts, push, dismiss }
})
