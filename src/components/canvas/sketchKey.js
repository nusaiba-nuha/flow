/**
 * Whether the diagram is drawn by hand, injected so shapes and edges can read
 * the document's style without each querying it.
 */

/** @type {import('vue').InjectionKey<import('vue').Ref<boolean>>} */
export const SKETCH = Symbol('sketch')
