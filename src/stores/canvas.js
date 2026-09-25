import { ref } from 'vue'
import { defineStore } from 'pinia'

/** The half of the state the server has no opinion about, so it never belongs in the cache. */
export const useCanvasStore = defineStore('canvas', () => {
  /** @type {import('vue').Ref<{ x: number, y: number, zoom: number } | null>} */
  const viewport = ref(null)

  /** Node the canvas should pan to next, such as one just created. */
  const focusNodeId = ref('')

  /** Whether the text pane is open beside the canvas. */
  const isTextOpen = ref(false)

  function toggleText() {
    isTextOpen.value = !isTextOpen.value
  }

  /**
   * A shape asked for from outside the canvas, which alone knows where the
   * middle of the view is in diagram coordinates.
   */
  const pendingShape = ref('')

  /** @param {string} shape */
  function requestShape(shape) {
    pendingShape.value = shape
  }

  function clearShapeRequest() {
    pendingShape.value = ''
  }

  /** @param {{ x: number, y: number, zoom: number }} next */
  function setViewport(next) {
    viewport.value = next
  }

  /** A different diagram should be fitted to the screen, not shown where the last one was. */
  function forgetViewport() {
    viewport.value = null
  }

  /** @param {string} id */
  function requestFocus(id) {
    focusNodeId.value = id
  }

  function clearFocus() {
    focusNodeId.value = ''
  }

  return {
    viewport,
    focusNodeId,
    pendingShape,
    isTextOpen,
    toggleText,
    setViewport,
    forgetViewport,
    requestFocus,
    clearFocus,
    requestShape,
    clearShapeRequest,
  }
})
