import { shallowRef, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * The file the diagram was opened from or last saved to. The handle cannot be
 * stored, so it lasts for the visit; the diagram itself is saved regardless.
 */
export const useFileStore = defineStore('file', () => {
  /** @type {import('vue').ShallowRef<any>} a FileSystemFileHandle, where the browser has them */
  const handle = shallowRef(null)
  const name = ref('')

  /** @param {any} next @param {string} fileName */
  function remember(next, fileName) {
    handle.value = next
    name.value = fileName
  }

  function forget() {
    handle.value = null
    name.value = ''
  }

  return { handle, name, remember, forget }
})
