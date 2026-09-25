import { readonly, ref } from 'vue'

const held = ref(false)
let listening = false

/** @param {KeyboardEvent} event */
const track = (event) => (held.value = event.shiftKey)

/**
 * Whether Shift is down, shared by every caller through one pair of window
 * listeners, rather than a pair per shape on the canvas.
 */
export function useShiftKey() {
  if (!listening) {
    listening = true
    window.addEventListener('keydown', track)
    window.addEventListener('keyup', track)
    window.addEventListener('blur', () => (held.value = false))
  }
  return readonly(held)
}
