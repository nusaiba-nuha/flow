/**
 * Saves a finished resize, injected so a shape can offer handles without
 * owning a mutation. The box is the node's new position and size.
 *
 * @typedef {(id: string, box: { x: number, y: number, width: number, height: number }) => void} ResizeNode
 */

/** @type {import('vue').InjectionKey<ResizeNode>} */
export const RESIZE_NODE = Symbol('resize-node')
