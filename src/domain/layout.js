import { NODE_GAP, NODE_SIZE, NODE_TYPE } from './constants.js'

const STEP_X = NODE_SIZE.WIDTH + NODE_GAP.X
const STEP_Y = NODE_SIZE.HEIGHT + NODE_GAP.Y

/**
 * Tidy top-down tree: leaves take a left-to-right cursor, a parent centres over
 * its outermost children, depth maps to `y`.
 *
 * A graph is laid out along a spanning tree: a node sits under the source of
 * its first incoming edge, and any other edge into it is drawn but does not
 * move it. Real graph layout is FL-61.
 *
 * Hand written rather than dagre: a pure function tests without a canvas.
 *
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {{ source: string, target: string }[]} [edges]
 * @returns {Map<string, { x: number, y: number }>}
 */
export function layoutTree(nodes, edges = []) {
  const positions = new Map()
  if (!nodes?.length) return positions

  const parentOf = treeParents(nodes, edges)
  const childrenOf = groupChildren(nodes, parentOf)
  const roots = nodes.filter((node) => !parentOf.has(node.id))

  const visited = new Set()
  let cursor = 0

  /**
   * @param {string} id
   * @param {number} depth
   * @returns {number} the x this node was given
   */
  function place(id, depth) {
    if (visited.has(id)) return cursor
    visited.add(id)

    const children = childrenOf.get(id) ?? []
    let x

    if (children.length === 0) {
      x = cursor
      cursor += STEP_X
    } else {
      const childXs = children.map((child) => place(child.id, depth + 1))
      x = (childXs[0] + childXs[childXs.length - 1]) / 2
    }

    positions.set(id, { x, y: depth * STEP_Y })
    return x
  }

  roots.forEach((root) => place(root.id, 0))
  // A broken parentId still needs somewhere to live.
  nodes.filter((node) => !positions.has(node.id)).forEach((node) => place(node.id, 0))

  anchorConnectors(nodes, parentOf, positions)
  return positions
}

/**
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {{ source: string, target: string }[]} edges
 * @returns {Map<string, string>} each node's parent in the spanning tree
 */
function treeParents(nodes, edges) {
  const ids = new Set(nodes.map((node) => node.id))
  const parentOf = new Map()

  edges.forEach(({ source, target }) => {
    if (source === target || !ids.has(source) || !ids.has(target)) return
    if (!parentOf.has(target)) parentOf.set(target, source)
  })

  return parentOf
}

/**
 * A node with a stored position has been dragged or created; its connectors have
 * not, so they would stay where the tree put them. They belong to it, so they move.
 *
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {Map<string, string>} parentOf
 * @param {Map<string, { x: number, y: number }>} positions
 */
function anchorConnectors(nodes, parentOf, positions) {
  nodes.forEach((node) => {
    const anchor = node.position
    const computed = positions.get(node.id)
    if (!anchor || !computed) return

    const dx = anchor.x - computed.x
    const dy = anchor.y - computed.y
    if (dx === 0 && dy === 0) return

    nodes
      .filter(
        (child) =>
          parentOf.get(child.id) === node.id &&
          child.type === NODE_TYPE.DATE_TIME_CONNECTOR &&
          !child.position,
      )
      .forEach((child) => {
        const at = positions.get(child.id)
        if (at) positions.set(child.id, { x: at.x + dx, y: at.y + dy })
      })
  })
}

/**
 * In node order, so the layout is stable whatever order the edges were drawn in.
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {Map<string, string>} parentOf
 * @returns {Map<string, import('./types.js').FlowNode[]>}
 */
function groupChildren(nodes, parentOf) {
  const map = new Map()

  nodes.forEach((node) => {
    const parent = parentOf.get(node.id)
    if (parent === undefined) return
    map.set(parent, [...(map.get(parent) ?? []), node])
  })

  return map
}

/**
 * Where a created node lands: below the lowest, aligned with the leftmost.
 * @param {{ position: { x: number, y: number } }[]} placed
 * @returns {{ x: number, y: number }}
 */
export function nextFreePosition(placed) {
  if (!placed?.length) return { x: 0, y: 0 }

  return {
    x: Math.min(...placed.map((node) => node.position.x)),
    y: Math.max(...placed.map((node) => node.position.y)) + STEP_Y,
  }
}
