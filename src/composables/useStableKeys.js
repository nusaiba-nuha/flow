/**
 * Keys for list items with no id. Index keys break on delete: Vue reuses the
 * wrong node and focus lands in the wrong field.
 */
export function useStableKeys() {
  /** @type {WeakMap<object, number>} */
  const keys = new WeakMap()
  let nextKey = 0

  /** @param {object} item */
  function keyFor(item) {
    const existing = keys.get(item)
    if (existing !== undefined) return existing

    nextKey += 1
    keys.set(item, nextKey)
    return nextKey
  }

  return { keyFor }
}
