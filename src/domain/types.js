/**
 * @typedef {import('./constants.js').Shape} Shape
 *
 * @typedef {Object} FlowNodeData
 * @property {string} [description]
 *
 * @typedef {Object} FlowNode
 * @property {string} id
 * @property {string} type a Shape; anything else renders with the fallback
 * @property {string} name
 * @property {FlowNodeData} data
 * @property {{ x: number, y: number } | null} [position] set once dragged or created
 *
 * @typedef {Object} FlowEdge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {string} [label]
 *
 * @typedef {Object} FlowDocument
 * @property {number} version
 * @property {string} title
 * @property {Record<string, any>[]} nodes stored as saved; `normaliseNode` makes them FlowNodes
 * @property {FlowEdge[]} edges
 *
 * @typedef {Object} VueFlowNode
 * @property {string} id
 * @property {string} type
 * @property {{ x: number, y: number }} position
 * @property {{ node: FlowNode }} data
 *
 * @typedef {{ id: string, source: string, target: string, label?: string }} VueFlowEdge
 */
export {}
