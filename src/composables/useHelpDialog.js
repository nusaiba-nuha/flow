import { onBeforeUnmount, onMounted, ref } from 'vue'

import { HELP_KEY } from '@/domain/shortcuts.js'

const TYPING = /^(INPUT|TEXTAREA|SELECT)$/

/** Bound at the shell: a dialog that is not mounted cannot listen for the key that mounts it. */
export function useHelpDialog() {
  const isOpen = ref(false)

  const open = () => (isOpen.value = true)
  const close = () => (isOpen.value = false)

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (event.key !== HELP_KEY || event.ctrlKey || event.metaKey || event.altKey) return

    // A question mark typed into a field is punctuation, not a command.
    const target = /** @type {HTMLElement | null} */ (event.target)
    if (target && TYPING.test(target.tagName)) return

    event.preventDefault()
    isOpen.value = !isOpen.value
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

  return { isOpen, open, close }
}
