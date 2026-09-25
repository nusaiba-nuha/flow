import { documentPositions } from './graph.js'

/**
 * @typedef {'added' | 'removed' | 'changed'} Change
 *
 * @typedef {Object} DocumentDiff
 * @property {{ added: string[], removed: string[], changed: string[], moved: string[] }} nodes
 * @property {{ added: string[], removed: string[], changed: string[] }} edges
 */

/**
 * What changed between two versions of a diagram. A node is changed when what
 * it says changes (name, shape, description) and moved when only where it sits
 * does, because a review cares about the first far more than the second.
 *
 * @param {import('./types.js').FlowDocument} before
 * @param {import('./types.js').FlowDocument} after
 * @returns {DocumentDiff}
 */
export function diffDocuments(before, after) {
  const oldNodes = new Map(before.nodes.map((node) => [String(node.id), node]))
  const newNodes = new Map(after.nodes.map((node) => [String(node.id), node]))
  const oldEdges = new Map(before.edges.map((edge) => [edge.id, edge]))
  const newEdges = new Map(after.edges.map((edge) => [edge.id, edge]))

  /** @param {Record<string, any>} node */
  const meaning = (node) =>
    JSON.stringify([node.name ?? '', node.type, node.data?.description ?? ''])
  /** @param {Record<string, any>} node */
  const place = (node) => JSON.stringify([node.position ?? null, node.size ?? null])

  const both = [...newNodes.keys()].filter((id) => oldNodes.has(id))

  return {
    nodes: {
      added: [...newNodes.keys()].filter((id) => !oldNodes.has(id)),
      removed: [...oldNodes.keys()].filter((id) => !newNodes.has(id)),
      changed: both.filter(
        (id) => meaning(oldNodes.get(id) ?? {}) !== meaning(newNodes.get(id) ?? {}),
      ),
      moved: both.filter(
        (id) =>
          meaning(oldNodes.get(id) ?? {}) === meaning(newNodes.get(id) ?? {}) &&
          place(oldNodes.get(id) ?? {}) !== place(newNodes.get(id) ?? {}),
      ),
    },
    edges: {
      added: [...newEdges.keys()].filter((id) => !oldEdges.has(id)),
      removed: [...oldEdges.keys()].filter((id) => !newEdges.has(id)),
      changed: [...newEdges.keys()].filter(
        (id) =>
          oldEdges.has(id) && (oldEdges.get(id)?.label ?? '') !== (newEdges.get(id)?.label ?? ''),
      ),
    },
  }
}

/** @param {DocumentDiff} diff */
export const isUnchanged = (diff) =>
  [...Object.values(diff.nodes), ...Object.values(diff.edges)].every((ids) => ids.length === 0)

/**
 * One picture of both versions: everything in the new one where it now sits,
 * plus what was removed where it used to sit, each marked with its change.
 *
 * @param {import('./types.js').FlowDocument} before
 * @param {import('./types.js').FlowDocument} after
 * @param {DocumentDiff} diff
 * @returns {{ document: import('./types.js').FlowDocument, highlight: Map<string, Change> }}
 */
export function mergeForDiff(before, after, diff) {
  const oldAt = documentPositions(before)
  const newAt = documentPositions(after)
  const removed = new Set(diff.nodes.removed)

  /** @type {Record<string, any>[]} */
  const nodes = [
    ...after.nodes.map((node) => ({ ...node, position: newAt.get(String(node.id)) })),
    ...before.nodes
      .filter((node) => removed.has(String(node.id)))
      .map((node) => ({ ...node, position: oldAt.get(String(node.id)) })),
  ]

  const ids = new Set(nodes.map((node) => String(node.id)))
  const goneEdges = before.edges.filter(
    (edge) => diff.edges.removed.includes(edge.id) && ids.has(edge.source) && ids.has(edge.target),
  )

  /** @type {Map<string, Change>} */
  const highlight = new Map()
  diff.nodes.added.forEach((id) => highlight.set(id, 'added'))
  diff.nodes.removed.forEach((id) => highlight.set(id, 'removed'))
  diff.nodes.changed.forEach((id) => highlight.set(id, 'changed'))
  diff.edges.added.forEach((id) => highlight.set(id, 'added'))
  diff.edges.removed.forEach((id) => highlight.set(id, 'removed'))
  diff.edges.changed.forEach((id) => highlight.set(id, 'changed'))

  return {
    document: { ...after, nodes, edges: [...after.edges, ...goneEdges] },
    highlight,
  }
}

/**
 * The diff as lines a pull request comment or a terminal can show.
 * @param {import('./types.js').FlowDocument} before
 * @param {import('./types.js').FlowDocument} after
 * @param {DocumentDiff} diff
 * @returns {string[]}
 */
export function describeDiff(before, after, diff) {
  const name = (
    /** @type {import('./types.js').FlowDocument} */ document,
    /** @type {string} */ id,
  ) => document.nodes.find((node) => String(node.id) === id)?.name ?? id
  const edgeName = (
    /** @type {import('./types.js').FlowDocument} */ document,
    /** @type {string} */ id,
  ) => {
    const edge = document.edges.find((candidate) => candidate.id === id)
    if (!edge) return id
    const label = edge.label ? ` (${edge.label})` : ''
    return `${name(document, edge.source)} → ${name(document, edge.target)}${label}`
  }

  return [
    ...diff.nodes.added.map((id) => `+ ${name(after, id)}`),
    ...diff.nodes.removed.map((id) => `- ${name(before, id)}`),
    ...diff.nodes.changed.map(
      (id) =>
        `~ ${name(before, id)}${name(before, id) === name(after, id) ? '' : ` → ${name(after, id)}`}`,
    ),
    ...diff.edges.added.map((id) => `+ ${edgeName(after, id)}`),
    ...diff.edges.removed.map((id) => `- ${edgeName(before, id)}`),
    ...diff.edges.changed.map((id) => `~ ${edgeName(after, id)}`),
    ...(diff.nodes.moved.length ? [`  ${diff.nodes.moved.length} moved`] : []),
  ]
}
