import { CONNECTOR_TYPE, NODE_TYPE } from './constants.js'
import { edgeIdFor, toNodeId } from './document.js'
import { layoutTree } from './layout.js'

export { edgeIdFor, toNodeId }

/**
 * @param {Record<string, any>} raw
 * @returns {import('./types.js').FlowNode}
 */
export function normaliseNode(raw) {
  return {
    id: toNodeId(raw.id),
    type: raw.type,
    name: raw.name ?? (raw.type === NODE_TYPE.TRIGGER ? 'Trigger' : 'Untitled'),
    data: raw.data ?? {},
    position: raw.position ?? null,
  }
}

/**
 * Only edges whose ends both exist: a half-deleted edge has nothing to draw to.
 *
 * @param {import('./types.js').FlowEdge[]} edges
 * @param {Set<string>} ids
 * @returns {import('./types.js').VueFlowEdge[]}
 */
export function buildEdges(edges, ids) {
  return edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      type: 'flow',
      source: edge.source,
      target: edge.target,
      ...(edge.label ? { label: edge.label } : {}),
    }))
}

/**
 * @param {import('./types.js').FlowNode} node
 * @returns {string | null}
 */
export function connectorLabel(node) {
  if (node.type !== NODE_TYPE.DATE_TIME_CONNECTOR) return null
  return node.data.connectorType === CONNECTOR_TYPE.SUCCESS ? 'Success' : 'Failure'
}

/**
 * A dragged node keeps where it was put; everything else is laid out.
 * @param {import('./types.js').FlowDocument | null | undefined} document
 * @returns {{ nodes: import('./types.js').VueFlowNode[], edges: import('./types.js').VueFlowEdge[] }}
 */
export function documentToGraph(document) {
  const nodes = (document?.nodes ?? []).map(normaliseNode)
  const ids = new Set(nodes.map((node) => node.id))
  const edges = buildEdges(document?.edges ?? [], ids)
  const positions = layoutTree(nodes, edges)

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position ?? positions.get(node.id) ?? { x: 0, y: 0 },
      data: { node },
    })),
    edges,
  }
}

/**
 * A node goes with every edge that touches it. A dateTime node's branches go
 * too: they belong to it and mean nothing on their own.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string} id
 * @returns {import('./types.js').FlowDocument}
 */
export function withNodeRemoved(document, id) {
  if (!document.nodes.some((node) => toNodeId(node.id) === id)) return document

  const typeOf = new Map(document.nodes.map((node) => [toNodeId(node.id), node.type]))
  const branches = document.edges
    .filter(
      (edge) => edge.source === id && typeOf.get(edge.target) === NODE_TYPE.DATE_TIME_CONNECTOR,
    )
    .map((edge) => edge.target)

  const gone = new Set([id, ...branches])

  return {
    ...document,
    nodes: document.nodes.filter((node) => !gone.has(toNodeId(node.id))),
    edges: document.edges.filter((edge) => !gone.has(edge.source) && !gone.has(edge.target)),
  }
}

/**
 * @param {import('./types.js').FlowDocument} document
 * @param {string} source
 * @param {string} target
 * @returns {import('./types.js').FlowDocument}
 */
export function withEdge(document, source, target) {
  const id = edgeIdFor(source, target)
  if (document.edges.some((edge) => edge.id === id)) return document
  return { ...document, edges: [...document.edges, { id, source, target }] }
}

/**
 * @param {import('./types.js').FlowDocument} document
 * @param {string} id
 * @returns {import('./types.js').FlowDocument}
 */
export function withoutEdge(document, id) {
  return { ...document, edges: document.edges.filter((edge) => edge.id !== id) }
}

/**
 * Whether an edge may be drawn from one node to another. Any number in and out;
 * only a line to itself and a second copy of the same line are refused.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string} source
 * @param {string} target
 * @returns {string | null} why not, or null when it is allowed
 */
export function canConnect(document, source, target) {
  if (source === target) return 'A node cannot connect to itself.'

  const ids = new Set(document.nodes.map((node) => toNodeId(node.id)))
  if (!ids.has(source) || !ids.has(target)) return 'That node no longer exists.'

  if (document.edges.some((edge) => edge.source === source && edge.target === target)) {
    return 'These are already connected.'
  }

  return null
}
