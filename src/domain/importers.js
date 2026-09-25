import { COMPOSE_ORIGIN, fromCompose } from './compose.js'
import { fromMermaid } from './mermaid.js'
import { fromOpenApi, OPENAPI_ORIGIN } from './openapi.js'

/**
 * @typedef {Object} ImportFormat
 * @property {string} id
 * @property {string} label
 * @property {string} accept          for the file picker
 * @property {string} placeholder
 * @property {string | null} origin   set when a re-import can update the diagram in place
 * @property {(text: string) => { document: import('./types.js').FlowDocument | null, warnings: { line: number, message: string }[] }} read
 */

/** Every format the Import dialog offers. Adding one is an entry here. */
/** @type {readonly ImportFormat[]} */
export const IMPORT_FORMATS = Object.freeze([
  {
    id: 'mermaid',
    label: 'Mermaid',
    accept: '.mmd,.mermaid,.md,.txt',
    placeholder: 'flowchart TD\n  A[Start] --> B{Ready?}\n  B -->|yes| C[Ship]',
    origin: null,
    read: fromMermaid,
  },
  {
    id: 'compose',
    label: 'docker-compose',
    accept: '.yml,.yaml',
    placeholder:
      'services:\n  api:\n    image: node:22\n    depends_on: [db]\n  db:\n    image: postgres:16',
    origin: COMPOSE_ORIGIN,
    read: fromCompose,
  },
  {
    id: 'openapi',
    label: 'OpenAPI',
    accept: '.yml,.yaml,.json',
    placeholder:
      "openapi: 3.1.0\ninfo: { title: Shop API }\npaths:\n  /orders:\n    get:\n      tags: [Orders]\n      responses:\n        '200': { $ref: '#/components/schemas/Order' }\ncomponents:\n  schemas:\n    Order: { properties: { id: {} } }",
    origin: OPENAPI_ORIGIN,
    read: fromOpenApi,
  },
])

/** @param {string} id */
export const importFormat = (id) => IMPORT_FORMATS.find((format) => format.id === id) ?? null
