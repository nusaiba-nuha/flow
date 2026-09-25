import { NODE_GAP, NODE_SIZE } from './constants.js'

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
 * The nearest spot to `wanted` where a new node overlaps none of `placed`,
 * searched ring by ring on a node-sized grid, so a shape added in the middle
 * of the view never lands on top of another.
 *
 * @param {{ x: number, y: number }} wanted top left corner
 * @param {{ position: { x: number, y: number } }[]} placed
 * @returns {{ x: number, y: number }}
 */
export function freeSpotNear(wanted, placed) {
  const overlaps = (/** @type {{ x: number, y: number }} */ spot) =>
    placed.some(
      ({ position }) =>
        Math.abs(position.x - spot.x) < NODE_SIZE.WIDTH + NODE_GAP.X / 2 &&
        Math.abs(position.y - spot.y) < NODE_SIZE.HEIGHT + NODE_GAP.Y / 2,
    )

  // Bounded: past this the view is so full that anywhere near will do.
  for (let ring = 0; ring <= 12; ring += 1) {
    const candidates = []
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
        candidates.push({ x: wanted.x + dx * STEP_X, y: wanted.y + dy * STEP_Y })
      }
    }

    const free = candidates
      .filter((spot) => !overlaps(spot))
      .sort(
        (a, b) =>
          Math.hypot(a.x - wanted.x, a.y - wanted.y) - Math.hypot(b.x - wanted.x, b.y - wanted.y),
      )[0]
    if (free) return free
  }

  return wanted
}
