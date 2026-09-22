import { ref } from 'vue'
import { defineStore } from 'pinia'

/** The half of the state the server has no opinion about, so it never belongs in the cache. */
export const useCanvasStore = defineStore('canvas', () => {
  /** @type {import('vue').Ref<{ x: number, y: number, zoom: number } | null>} */
  const viewport = ref(null)

  /** @param {{ x: number, y: number, zoom: number }} next */
  function setViewport(next) {
    viewport.value = next
  }

  return { viewport, setViewport }
})
