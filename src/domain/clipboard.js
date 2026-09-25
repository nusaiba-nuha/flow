import { sizeOf } from './constants.js'
import { edgeIdFor } from './document.js'
import { documentPositions } from './graph.js'

/**
 * Copy and paste as documents: a copy is the selected shapes, the edges
 * between them and where they sit, so it travels as `.flow` text between
 * tabs, and into a text editor or an agent, and back.
 */

/**
 * A deep copy that also takes a reactive proxy, which structuredClone refuses.
 * @template T
 * @param {T} value
 * @returns {T}
 */
const clone = (value) => JSON.parse(JSON.stringify(value))

/** How far each paste lands from the last, so copies never hide their source. */
export const PASTE_OFFSET = 32

/**
 * The selected shapes, with every edge between two of them and a position for
 * each, even those the layout placed.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string[]} ids
 * @returns {import('./types.js').FlowDocument}
 */
export function copySelection(document, ids) {
  const chosen = new Set(ids)
  const positions = documentPositions(document)
  return {
    version: document.version,
    title: document.title,
    nodes: document.nodes
      .filter((node) => chosen.has(node.id))
      .map((node) => clone({ ...node, position: node.position ?? positions.get(node.id) })),
    edges: document.edges
      .filter((edge) => chosen.has(edge.source) && chosen.has(edge.target))
      .map((edge) => clone(edge)),
  }
}

/**
 * The document with a copy added: fresh ids where the old ones are taken,
 * edges following them, and everything moved by `times` offsets. A copy with
 * no positions, such as hand-written text, lands to the right of the diagram.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {import('./types.js').FlowDocument} copy
 * @param {number} [times] how many pastes this is since the copy, for the offset
 * @returns {{ document: import('./types.js').FlowDocument, ids: string[] }}
 */
export function pasteInto(document, copy, times = 1) {
  const taken = new Set(document.nodes.map((node) => node.id))
  /** @type {Map<string, string>} */
  const renamed = new Map()
  copy.nodes.forEach((node) => {
    const base = String(node.id).replace(/-\d+$/, '')
    let id = node.id
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`
    taken.add(id)
    renamed.set(node.id, id)
  })

  const placed = copy.nodes.every((node) => node.position)
  const layout = documentPositions(copy)
  const shift = placed
    ? { x: PASTE_OFFSET * times, y: PASTE_OFFSET * times }
    : besideOf(document, copy)

  const nodes = copy.nodes.map((node) => {
    const at = node.position ?? layout.get(node.id) ?? { x: 0, y: 0 }
    // A copy is yours: a re-import must not take it for one of its own.
    const data = clone(node.data ?? {})
    delete data.origin
    return {
      ...clone(node),
      data,
      id: /** @type {string} */ (renamed.get(node.id)),
      position: { x: Math.round(at.x + shift.x), y: Math.round(at.y + shift.y) },
    }
  })

  const edges = copy.edges
    .filter((edge) => renamed.has(edge.source) && renamed.has(edge.target))
    .map((edge) => {
      const source = /** @type {string} */ (renamed.get(edge.source))
      const target = /** @type {string} */ (renamed.get(edge.target))
      const copied = { ...clone(edge), id: edgeIdFor(source, target), source, target }
      delete copied.origin
      return copied
    })

  return {
    document: {
      ...document,
      nodes: [...document.nodes, ...nodes],
      edges: [...document.edges, ...edges],
    },
    ids: nodes.map((node) => node.id),
  }
}

/**
 * The move that puts an unplaced copy just right of everything already drawn.
 * @param {import('./types.js').FlowDocument} document
 * @param {import('./types.js').FlowDocument} copy
 */
function besideOf(document, copy) {
  if (!document.nodes.length) return { x: 0, y: 0 }
  const positions = documentPositions(document)
  const right = Math.max(
    ...document.nodes.map((node) => (positions.get(node.id)?.x ?? 0) + sizeOf(node).width),
  )
  const top = Math.min(...document.nodes.map((node) => positions.get(node.id)?.y ?? 0))
  const layout = documentPositions(copy)
  const left = Math.min(...copy.nodes.map((node) => layout.get(node.id)?.x ?? 0))
  const copyTop = Math.min(...copy.nodes.map((node) => layout.get(node.id)?.y ?? 0))
  return { x: right + 80 - left, y: top - copyTop }
}
