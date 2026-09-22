import { ref } from 'vue'
import { defineStore } from 'pinia'

/** The half of the state the server has no opinion about, so it never belongs in the cache. */
export const useCanvasStore = defineStore('canvas', () => {
  /** @type {import('vue').Ref<{ x: number, y: number, zoom: number } | null>} */
  const viewport = ref(null)

  /** Node the canvas should pan to next, such as one just created. */
  const focusNodeId = ref('')

  /** @param {{ x: number, y: number, zoom: number }} next */
  function setViewport(next) {
    viewport.value = next
  }

  /** @param {string} id */
  function requestFocus(id) {
    focusNodeId.value = id
  }

  function clearFocus() {
    focusNodeId.value = ''
  }

  return { viewport, focusNodeId, setViewport, requestFocus, clearFocus }
})
