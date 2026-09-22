import { computed, onBeforeUnmount, onMounted, readonly, ref, watch } from 'vue'

import { isOpenable } from '@/domain/nodeMeta.js'

/**
 * A flow is a graph but a keyboard is linear, so nodes are walked in reading
 * order: top to bottom, then left to right. Display-only nodes are skipped,
 * since landing on one is a dead end.
 *
 * @param {{
 *   nodes: import('vue').ComputedRef<import('@/domain/types.js').VueFlowNode[]>,
 *   onOpen: (id: string) => void,
 *   isActive: () => boolean,
 * }} options
 */
export function useCanvasKeyboard({ nodes, onOpen, isActive }) {
  /** @type {import('vue').Ref<string>} */
  const focusedId = ref('')

  const reachable = computed(() =>
    [...nodes.value]
      .filter((node) => isOpenable(node.data.node))
      .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x),
  )

  const focusedIndex = computed(() =>
    reachable.value.findIndex((node) => node.id === focusedId.value),
  )

  /** @param {number} step */
  function move(step) {
    if (!reachable.value.length) return

    // From nothing, the arrows enter at the first node.
    const next = focusedIndex.value === -1 ? 0 : focusedIndex.value + step
    const clamped = (next + reachable.value.length) % reachable.value.length
    focusedId.value = reachable.value[clamped].id
  }

  function clear() {
    focusedId.value = ''
  }

  /** Carry on from wherever a click left off. @param {string} id */
  function focus(id) {
    focusedId.value = id
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    // Never steal keys from a field or an open dialog.
    if (!isActive()) return
    const target = /** @type {HTMLElement | null} */ (event.target)
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        move(1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        if (reachable.value.length) focusedId.value = reachable.value[0].id
        break
      case 'End': {
        event.preventDefault()
        const last = reachable.value.at(-1)
        if (last) focusedId.value = last.id
        break
      }
      case 'Enter':
      case ' ':
        if (!focusedId.value) return
        event.preventDefault()
        onOpen(focusedId.value)
        break
      case 'Escape':
        clear()
        break
      default:
    }
  }

  // A focused node that gets deleted must not leave a dangling selection.
  watch(reachable, (list) => {
    if (focusedId.value && !list.some((node) => node.id === focusedId.value)) clear()
  })

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

  // Readonly outwards: a caller assigning it would be a second source of truth.
  return { focusedId: readonly(focusedId), reachable, focus, move, clear }
}
