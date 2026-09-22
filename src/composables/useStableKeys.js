/**
 * Keys for list items that carry no id.
 *
 * The index is wrong for a list you can delete from: removing the first of three
 * shifts every later index and Vue reuses the wrong DOM node, carrying focus to
 * the wrong field. Keying by content is worse, since it remounts the input on
 * every keystroke. So identity is tracked per object, and entries are collected
 * once a part is dropped.
 *
 * @returns {{ keyFor: (item: object) => number }}
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
