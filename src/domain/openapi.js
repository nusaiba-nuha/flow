import { parse } from 'yaml'

import { SHAPE } from './constants.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'

export const OPENAPI_ORIGIN = 'openapi'

const METHODS = Object.freeze(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])

/** How many operations a group's description lists before summarising the rest. */
const LISTED = 3

/**
 * An OpenAPI (or Swagger 2) spec as a map of the API: each tag, or first path
 * segment when an operation has none, is a process; each named schema is a data
 * shape. A group points at the schemas its operations take or return, and a
 * schema at the schemas it refers to.
 *
 * @param {string} text YAML or JSON
 * @returns {{ document: import('./types.js').FlowDocument | null, warnings: { line: number, message: string }[] }}
 */
export function fromOpenApi(text) {
  /** @type {any} */
  let spec
  try {
    spec = parse(String(text ?? ''))
  } catch (error) {
    const line = /** @type {any} */ (error)?.linePos?.[0]?.line ?? 1
    return { document: null, warnings: [{ line, message: 'This is neither valid YAML nor JSON.' }] }
  }

  if (!spec || typeof spec !== 'object' || !spec.paths || typeof spec.paths !== 'object') {
    return {
      document: null,
      warnings: [{ line: 1, message: 'No `paths:` section, so this is not an OpenAPI spec.' }],
    }
  }

  const schemas = spec.components?.schemas ?? spec.definitions ?? {}
  /** @type {Map<string, { operations: string[], refs: Set<string> }>} */
  const groups = new Map()

  Object.entries(spec.paths).forEach(([path, item]) => {
    METHODS.filter((method) => item?.[method]).forEach((method) => {
      const operation = item[method]
      const group = String(operation.tags?.[0] ?? firstSegment(path))
      const entry = groups.get(group) ?? { operations: [], refs: new Set() }
      entry.operations.push(`${method.toUpperCase()} ${path}`)
      refsIn(operation).forEach((ref) => entry.refs.add(ref))
      groups.set(group, entry)
    })
  })

  /** @type {Record<string, any>[]} */
  const nodes = []
  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  /** @param {string} source @param {string} target */
  const connect = (source, target) => {
    const id = edgeIdFor(source, target)
    if (source !== target && !edges.some((edge) => edge.id === id)) {
      edges.push({ id, source, target, origin: OPENAPI_ORIGIN })
    }
  }

  const schemaId = (/** @type {string} */ name) => `schema-${slug(name)}`

  groups.forEach(({ operations, refs }, group) => {
    const id = `api-${slug(group)}`
    const listed = operations.slice(0, LISTED).join(', ')
    const more = operations.length > LISTED ? `, and ${operations.length - LISTED} more` : ''
    nodes.push({
      id,
      type: SHAPE.PROCESS,
      name: group,
      data: { description: `${listed}${more}`, origin: OPENAPI_ORIGIN },
    })
    refs.forEach((ref) => {
      if (Object.hasOwn(schemas, ref)) connect(id, schemaId(ref))
    })
  })

  Object.entries(schemas).forEach(([name, schema]) => {
    const fields = Object.keys(schema?.properties ?? {})
    nodes.push({
      id: schemaId(name),
      type: SHAPE.DATA,
      name,
      data: {
        description: fields.length
          ? fields.slice(0, 6).join(', ') + (fields.length > 6 ? '…' : '')
          : '',
        origin: OPENAPI_ORIGIN,
      },
    })
  })

  Object.entries(schemas).forEach(([name, schema]) => {
    refsIn(schema).forEach((ref) => {
      if (Object.hasOwn(schemas, ref)) connect(schemaId(name), schemaId(ref))
    })
  })

  const title = typeof spec.info?.title === 'string' ? spec.info.title : 'API'
  return { document: { version: DOCUMENT_VERSION, title, nodes, edges }, warnings: [] }
}

/** `/orders/{id}/items` groups under `orders`. */
/** @param {string} path */
function firstSegment(path) {
  return path.split('/').find((segment) => segment && !segment.startsWith('{')) ?? 'root'
}

/** @param {string} name */
const slug = (name) => name.replace(/[^\w-]+/g, '_')

/**
 * Every schema named by a `$ref` anywhere inside, by its last path segment.
 * @param {unknown} value
 * @param {Set<string>} [found]
 * @returns {Set<string>}
 */
function refsIn(value, found = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => refsIn(item, found))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (key === '$ref' && typeof item === 'string') found.add(item.split('/').pop() ?? item)
      else refsIn(item, found)
    })
  }
  return found
}
