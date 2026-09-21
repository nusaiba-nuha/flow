import { CONNECTOR_TYPE, NODE_TYPE, ROOT_PARENT_ID } from './constants.js'

/**
 * The payload mixes a numeric trigger id with hex strings, and route params are
 * always strings, so every id is normalised once, here.
 * @param {unknown} id
 * @returns {string}
 */
export const toNodeId = (id) => String(id)

/**
 * @param {Record<string, any>} raw
 * @returns {import('./types.js').FlowNode}
 */
export function normaliseNode(raw) {
  return {
    id: toNodeId(raw.id),
    parentId: toNodeId(raw.parentId ?? ROOT_PARENT_ID),
    type: raw.type,
    name: raw.name ?? (raw.type === NODE_TYPE.TRIGGER ? 'Trigger' : 'Untitled'),
    data: raw.data ?? {},
    position: raw.position ?? null,
  }
}

/**
 * Edges come from `parentId` alone. The dateTime node also lists its children in
 * `data.connectors`, but two sources that can disagree is a bug waiting to happen.
 *
 * Unlabelled: a branch is already named by its connector node.
 *
 * @param {import('./types.js').FlowNode[]} nodes
 * @returns {import('./types.js').VueFlowEdge[]}
 */
export function buildEdges(nodes) {
  const ids = new Set(nodes.map((node) => node.id))

  return nodes
    .filter((node) => node.parentId !== ROOT_PARENT_ID && ids.has(node.parentId))
    .map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      source: node.parentId,
      target: node.id,
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
 * Raw payload in, Vue Flow graph out, so the canvas never sees the payload shape.
 * Positions are wired to the layout at FL-07.
 *
 * @param {Record<string, any>[]} payload
 * @returns {{ nodes: import('./types.js').VueFlowNode[], edges: import('./types.js').VueFlowEdge[] }}
 */
export function payloadToGraph(payload) {
  const nodes = (payload ?? []).map(normaliseNode)

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position ?? { x: 0, y: 0 },
      data: { node },
    })),
    edges: buildEdges(nodes),
  }
}

/**
 * Remove a node, returning a new list.
 *
 * Children are re-parented rather than cascaded, so a delete never destroys work
 * nobody asked to remove. A dateTime node's connectors are the exception: they
 * are part of that node, so they go with it and their children move up instead.
 *
 * @param {Record<string, any>[]} flow
 * @param {string} id
 * @returns {Record<string, any>[]}
 */
export function withNodeRemoved(flow, id) {
  const removed = flow.find((node) => toNodeId(node.id) === id)
  if (!removed) return flow

  const connectorIds = flow
    .filter((node) => toNodeId(node.parentId) === id && node.type === NODE_TYPE.DATE_TIME_CONNECTOR)
    .map((node) => toNodeId(node.id))

  const gone = new Set([id, ...connectorIds])
  const inheritedParent = toNodeId(removed.parentId ?? ROOT_PARENT_ID)

  return flow
    .filter((node) => !gone.has(toNodeId(node.id)))
    .map((node) =>
      gone.has(toNodeId(node.parentId)) ? { ...node, parentId: inheritedParent } : node,
    )
}
