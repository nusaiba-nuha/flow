import { NODE_GAP, NODE_SIZE } from './constants.js'

const STEP_X = NODE_SIZE.WIDTH + NODE_GAP.X
const STEP_Y = NODE_SIZE.HEIGHT + NODE_GAP.Y

/** Marks a layout's own placeholders, which no id from a diagram can start with. */
const PLACEHOLDER = '\u0000'

/**
 * Where every shape goes when nobody has placed it: a tidy tree for a tree,
 * and layers for any other graph, so merges and cycles read top down too.
 *
 * Hand written rather than dagre: a pure function tests without a canvas.
 *
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {{ source: string, target: string }[]} [edges]
 * @returns {Map<string, { x: number, y: number }>}
 */
export function layoutTree(nodes, edges = []) {
  return isForest(nodes, edges) ? tidyTree(nodes, edges) : layered(nodes, edges)
}

/**
 * Tidy top-down tree: leaves take a left-to-right cursor, a parent centres over
 * its outermost children, depth maps to `y`.
 *
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {{ source: string, target: string }[]} edges
 * @returns {Map<string, { x: number, y: number }>}
 */
function tidyTree(nodes, edges) {
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
 * No node with two ways in, and no cycle: a tree, or several.
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {{ source: string, target: string }[]} edges
 */
function isForest(nodes, edges) {
  const ids = new Set(nodes.map((node) => node.id))
  const inner = edges.filter(
    ({ source, target }) => source !== target && ids.has(source) && ids.has(target),
  )
  const parents = new Map()
  for (const { source, target } of inner) {
    if (parents.has(target)) return false
    parents.set(target, source)
  }
  // With one parent each, a cycle is a walk up that comes back to where it began.
  for (const id of ids) {
    const seen = new Set([id])
    for (let at = parents.get(id); at !== undefined; at = parents.get(at)) {
      if (seen.has(at)) return false
      seen.add(at)
    }
  }
  return true
}

/**
 * A layered layout for any graph, after Sugiyama: edges that close a cycle are
 * turned round, each node goes one layer below its lowest source, a few sweeps
 * order each layer to uncross edges, and nodes then drift towards the middle
 * of their sources without overlapping.
 *
 * @param {import('./types.js').FlowNode[]} nodes
 * @param {{ source: string, target: string }[]} edges
 * @returns {Map<string, { x: number, y: number }>}
 */
function layered(nodes, edges) {
  const ids = nodes.map((node) => node.id)
  const known = new Set(ids)
  const links = acyclic(
    ids,
    edges.filter(
      ({ source, target }) => source !== target && known.has(source) && known.has(target),
    ),
  )
  const sourcesOf = new Map(ids.map((id) => [id, /** @type {string[]} */ ([])]))
  const targetsOf = new Map(ids.map((id) => [id, /** @type {string[]} */ ([])]))
  links.forEach(({ source, target }) => {
    sourcesOf.get(target)?.push(source)
    targetsOf.get(source)?.push(target)
  })

  // Longest path from the sources, so every edge points down.
  /** @type {Map<string, number>} */
  const layerOf = new Map()
  const layerFor = (/** @type {string} */ id, /** @type {Set<string>} */ trail = new Set()) => {
    const known = layerOf.get(id)
    if (known !== undefined) return known
    trail.add(id)
    const layer = Math.max(
      0,
      ...(sourcesOf.get(id) ?? [])
        .filter((up) => !trail.has(up))
        .map((up) => layerFor(up, trail) + 1),
    )
    layerOf.set(id, layer)
    return layer
  }
  ids.forEach((id) => layerFor(id))

  // A long edge gets a placeholder in every layer it crosses, so it has a lane
  // of its own rather than running through the shapes in between.
  const order = [...ids]
  let placeholders = 0
  links.forEach(({ source, target }) => {
    const from = /** @type {number} */ (layerOf.get(source))
    const to = /** @type {number} */ (layerOf.get(target))
    if (to - from < 2) return
    const down = /** @type {string[]} */ (targetsOf.get(source))
    const up = /** @type {string[]} */ (sourcesOf.get(target))
    down.splice(down.indexOf(target), 1)
    up.splice(up.indexOf(source), 1)

    let previous = source
    for (let layer = from + 1; layer < to; layer += 1) {
      const id = `${PLACEHOLDER}${(placeholders += 1)}`
      layerOf.set(id, layer)
      sourcesOf.set(id, [previous])
      targetsOf.set(id, [])
      targetsOf.get(previous)?.push(id)
      order.push(id)
      previous = id
    }
    targetsOf.get(previous)?.push(target)
    up.push(previous)
  })

  /** @type {string[][]} */
  const layers = []
  order.forEach((id) => {
    const layer = /** @type {number} */ (layerOf.get(id))
    ;(layers[layer] ??= []).push(id)
  })

  // Barycentre sweeps, down then up, keeping ties in their current order.
  const indexIn = (/** @type {string[]} */ layer) => new Map(layer.map((id, index) => [id, index]))
  const sortBy = (
    /** @type {string[]} */ layer,
    /** @type {Map<string, number>} */ reference,
    /** @type {Map<string, string[]>} */ neighbours,
  ) => {
    const current = indexIn(layer)
    const weight = (/** @type {string} */ id) => {
      const near = (neighbours.get(id) ?? []).filter((other) => reference.has(other))
      return near.length
        ? near.reduce((sum, other) => sum + /** @type {number} */ (reference.get(other)), 0) /
            near.length
        : /** @type {number} */ (current.get(id))
    }
    return [...layer].sort(
      (a, b) =>
        weight(a) - weight(b) ||
        /** @type {number} */ (current.get(a)) - /** @type {number} */ (current.get(b)),
    )
  }
  for (let sweep = 0; sweep < 4; sweep += 1) {
    for (let at = 1; at < layers.length; at += 1) {
      layers[at] = sortBy(layers[at], indexIn(layers[at - 1]), sourcesOf)
    }
    for (let at = layers.length - 2; at >= 0; at -= 1) {
      layers[at] = sortBy(layers[at], indexIn(layers[at + 1]), targetsOf)
    }
  }

  // Side by side, each layer centred; then each node drifts over its sources.
  const widest = Math.max(...layers.map((layer) => layer.length))
  /** @type {Map<string, number>} */
  const xOf = new Map()
  layers.forEach((layer) =>
    layer.forEach((id, index) => xOf.set(id, (index + (widest - layer.length) / 2) * STEP_X)),
  )
  for (let pass = 0; pass < 3; pass += 1) {
    layers.slice(1).forEach((layer) => {
      const wanted = layer.map((id) => {
        const up = sourcesOf.get(id) ?? []
        return up.length
          ? up.reduce((sum, other) => sum + /** @type {number} */ (xOf.get(other)), 0) / up.length
          : /** @type {number} */ (xOf.get(id))
      })
      // Left to right, never closer than a step, keeping the order the sweeps found.
      const placed = [...wanted]
      for (let index = 1; index < placed.length; index += 1) {
        placed[index] = Math.max(placed[index], placed[index - 1] + STEP_X)
      }
      // Shift back so the layer sits where its nodes asked to, on average.
      const drift =
        wanted.reduce((sum, x) => sum + x, 0) / wanted.length -
        placed.reduce((sum, x) => sum + x, 0) / placed.length
      layer.forEach((id, index) => xOf.set(id, placed[index] + drift))
    })
  }

  const left = Math.min(...xOf.values())
  const positions = new Map()
  layers.forEach((layer, depth) =>
    layer
      .filter((id) => !id.startsWith(PLACEHOLDER))
      .forEach((id) =>
        positions.set(id, {
          x: Math.round(/** @type {number} */ (xOf.get(id)) - left),
          y: depth * STEP_Y,
        }),
      ),
  )
  return positions
}

/**
 * The edges with any that closes a cycle turned round, found by a depth-first
 * walk in node order so the result does not depend on how edges were drawn.
 * @param {string[]} ids
 * @param {{ source: string, target: string }[]} edges
 */
function acyclic(ids, edges) {
  const out = new Map(ids.map((id) => [id, /** @type {string[]} */ ([])]))
  edges.forEach(({ source, target }) => out.get(source)?.push(target))
  const state = new Map()
  const back = new Set()
  const visit = (/** @type {string} */ id) => {
    state.set(id, 'open')
    for (const next of out.get(id) ?? []) {
      if (state.get(next) === 'open') back.add(`${id}\u0000${next}`)
      else if (!state.has(next)) visit(next)
    }
    state.set(id, 'done')
  }
  ids.forEach((id) => state.has(id) || visit(id))
  return edges.map((edge) =>
    back.has(`${edge.source}\u0000${edge.target}`)
      ? { source: edge.target, target: edge.source }
      : edge,
  )
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
