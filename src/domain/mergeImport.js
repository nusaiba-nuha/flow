/**
 * Re-importing a file should update the diagram, not replace the work done on
 * it. Nodes match by id: a match keeps its position, a new one is laid out,
 * and one the file no longer has goes only if an import put it there.
 * Anything a person added by hand stays, with its edges.
 *
 * @param {import('./types.js').FlowDocument} current
 * @param {import('./types.js').FlowDocument} imported every node and edge carrying `origin`
 * @param {string} origin which importer, e.g. `compose`
 * @returns {import('./types.js').FlowDocument}
 */
export function mergeImport(current, imported, origin) {
  const importedIds = new Set(imported.nodes.map((node) => node.id))
  const positionOf = new Map(current.nodes.map((node) => [node.id, node.position]))

  const kept = current.nodes.filter(
    (node) => !importedIds.has(node.id) && node.data?.origin !== origin,
  )
  const nodes = [
    ...imported.nodes.map((node) => {
      const position = positionOf.get(node.id)
      return position ? { ...node, position } : node
    }),
    ...kept,
  ]

  const ids = new Set(nodes.map((node) => node.id))
  const importedEdgeIds = new Set(imported.edges.map((edge) => edge.id))
  const keptEdges = current.edges.filter(
    (edge) =>
      edge.origin !== origin &&
      !importedEdgeIds.has(edge.id) &&
      ids.has(edge.source) &&
      ids.has(edge.target),
  )

  return { ...current, nodes, edges: [...imported.edges, ...keptEdges] }
}
