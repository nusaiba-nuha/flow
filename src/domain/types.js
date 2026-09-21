/**
 * @typedef {import('./constants.js').NodeType} NodeType
 *
 * @typedef {{ type: 'text', text: string }} TextPart
 * @typedef {{ type: 'attachment', attachment: string, name?: string }} AttachmentPart
 * @typedef {TextPart | AttachmentPart} MessagePart
 *
 * @typedef {{ day: string, startTime: string, endTime: string }} BusinessHour
 *
 * @typedef {Object} FlowNodeData
 * @property {MessagePart[]} [payload]      sendMessage
 * @property {string} [comment]             addComment
 * @property {BusinessHour[]} [times]       dateTime
 * @property {string} [timezone]            dateTime
 * @property {string} [action]              dateTime
 * @property {string[]} [connectors]        dateTime child ids
 * @property {string} [connectorType]       dateTimeConnector
 * @property {string} [type]                trigger event
 * @property {boolean} [oncePerContact]     trigger
 * @property {string} [description]         from the create form
 *
 * @typedef {Object} FlowNode
 * @property {string} id
 * @property {string} parentId
 * @property {NodeType} type
 * @property {string} name
 * @property {FlowNodeData} data
 * @property {{ x: number, y: number } | null} [position] set once dragged or created
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
