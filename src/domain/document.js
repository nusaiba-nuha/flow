import { ROOT_PARENT_ID } from './constants.js'

export const DOCUMENT_VERSION = 2

export const DEFAULT_TITLE = 'Untitled diagram'

/**
 * Older documents mix a numeric id with hex strings; route params are strings.
 * @param {unknown} id
 * @returns {string}
 */
export const toNodeId = (id) => String(id)

/**
 * One edge per ordered pair, so the pair is the key: an undone removal draws
 * the same edge again rather than a second one beside it.
 * @param {string} source
 * @param {string} target
 */
export const edgeIdFor = (source, target) => `e-${source}-${target}`

/** @returns {import('./types.js').FlowDocument} */
export const emptyDocument = (title = DEFAULT_TITLE) => ({
  version: DOCUMENT_VERSION,
  title,
  nodes: [],
  edges: [],
})

/**
 * Anything Flow has ever stored, lifted to the current shape.
 *
 * v1 was a bare array of nodes whose one incoming edge was `parentId`.
 *
 * @param {unknown} raw
 * @returns {import('./types.js').FlowDocument}
 */
export function migrate(raw) {
  if (Array.isArray(raw)) return fromV1(raw)

  if (raw && typeof raw === 'object' && Array.isArray(/** @type {any} */ (raw).nodes)) {
    const document = /** @type {Record<string, any>} */ (raw)
    return {
      version: DOCUMENT_VERSION,
      title: typeof document.title === 'string' ? document.title : DEFAULT_TITLE,
      nodes: document.nodes.map((/** @type {Record<string, any>} */ node) => ({
        ...node,
        id: toNodeId(node.id),
      })),
      edges: (Array.isArray(document.edges) ? document.edges : []).map(
        (/** @type {Record<string, any>} */ edge) => ({
          ...edge,
          id: toNodeId(edge.id ?? edgeIdFor(edge.source, edge.target)),
          source: toNodeId(edge.source),
          target: toNodeId(edge.target),
        }),
      ),
    }
  }

  throw new Error('This is not a Flow document.')
}

/**
 * @param {Record<string, any>[]} list
 * @returns {import('./types.js').FlowDocument}
 */
function fromV1(list) {
  const ids = new Set(list.map((node) => toNodeId(node.id)))

  const edges = list
    .map((node) => ({
      source: toNodeId(node.parentId ?? ROOT_PARENT_ID),
      target: toNodeId(node.id),
    }))
    .filter(({ source, target }) => ids.has(source) && source !== target)
    .map(({ source, target }) => ({ id: edgeIdFor(source, target), source, target }))

  const nodes = list.map(({ parentId: _parentId, ...node }) => ({ ...node, id: toNodeId(node.id) }))

  return { version: DOCUMENT_VERSION, title: DEFAULT_TITLE, nodes, edges }
}
