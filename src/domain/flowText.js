import { DEFAULT_TITLE, DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { isKnownShape, SHAPE_OPTIONS } from './nodeMeta.js'

/**
 * The `.flow` text format: a diagram as lines a person can read, write and
 * review in a pull request.
 *
 *     title: Web app architecture
 *
 *     browser = terminal "Browser" -- Single page app
 *     api = process "API"
 *
 *     browser -> api : HTTPS
 *
 *     @layout
 *     browser 276,0
 *
 * One node or edge per line, in document order, so a diff shows exactly what
 * changed. Positions sit in their own block at the end: moving a box never
 * touches the lines that say what the system is.
 *
 * @typedef {{ line: number, message: string }} FlowTextError
 */

const ID = String.raw`[A-Za-z0-9_][\w-]*`
const NODE_LINE = new RegExp(String.raw`^(${ID})\s*=\s*([A-Za-z][\w-]*)\s*(.*)$`)
const EDGE_LINE = new RegExp(String.raw`^(${ID})\s*->\s*(${ID})\s*(?::\s?(.*))?$`)
const LAYOUT_LINE = new RegExp(String.raw`^(${ID})\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$`)
const LAYOUT_HEADER = '@layout'
const DESCRIPTION_MARK = '--'

/**
 * Descriptions and labels run to the end of their line, so a newline in one is
 * written as `\n`, and a backslash as `\\`.
 * @param {string} text
 */
const escapeRest = (text) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')

/** @param {string} text */
const unescapeRest = (text) =>
  text.replace(/\\(\\|n)/g, (_match, char) => (char === 'n' ? '\n' : '\\'))

/** @param {number} value */
const coordinate = (value) => String(Math.round(value))

/**
 * @param {import('./types.js').FlowDocument} document
 * @returns {string}
 */
export function serialiseFlow(document) {
  const sections = [`title: ${escapeRest(document.title ?? DEFAULT_TITLE)}`]

  const nodes = document.nodes.map((node) => {
    const description = node.data?.description
    const name = JSON.stringify(node.name ?? '')
    const tail = description ? ` ${DESCRIPTION_MARK} ${escapeRest(description)}` : ''
    return `${node.id} = ${node.type} ${name}${tail}`
  })
  if (nodes.length) sections.push(nodes.join('\n'))

  const edges = document.edges.map((edge) => {
    const label = edge.label ? ` : ${escapeRest(edge.label)}` : ''
    return `${edge.source} -> ${edge.target}${label}`
  })
  if (edges.length) sections.push(edges.join('\n'))

  const placed = document.nodes.filter((node) => node.position)
  if (placed.length) {
    sections.push(
      [
        LAYOUT_HEADER,
        ...placed.map(
          (node) => `${node.id} ${coordinate(node.position.x)},${coordinate(node.position.y)}`,
        ),
      ].join('\n'),
    )
  }

  return `${sections.join('\n\n')}\n`
}

/**
 * Every problem is reported, each with its line, rather than stopping at the
 * first: an editor can mark them all at once. The document is null whenever
 * there is any error, so a half-read diagram is never mistaken for the whole.
 *
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, errors: FlowTextError[] }}
 */
export function parseFlow(text) {
  /** @type {FlowTextError[]} */
  const errors = []
  /** @type {Record<string, any>[]} */
  const nodes = []
  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  /** @type {Map<string, Record<string, any>>} */
  const byId = new Map()
  /** @type {{ line: number, id: string, x: number, y: number }[]} */
  const layout = []
  /** @type {{ line: number, source: string, target: string, label: string }[]} */
  const pendingEdges = []

  let title = DEFAULT_TITLE
  let inLayout = false

  String(text ?? '')
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = index + 1
      const content = raw.trim()
      /** @param {string} message */
      const fail = (message) => errors.push({ line, message })

      if (!content || content.startsWith('#')) return

      if (content === LAYOUT_HEADER) {
        inLayout = true
        return
      }

      if (inLayout) {
        const match = LAYOUT_LINE.exec(content)
        if (!match) return fail('Expected a position, like `api 120,340`.')
        layout.push({ line, id: match[1], x: Number(match[2]), y: Number(match[3]) })
        return
      }

      if (content.startsWith('title:')) {
        title = unescapeRest(content.slice('title:'.length).trim())
        return
      }

      const edge = EDGE_LINE.exec(content)
      if (edge) {
        pendingEdges.push({
          line,
          source: edge[1],
          target: edge[2],
          label: unescapeRest((edge[3] ?? '').trim()),
        })
        return
      }

      const node = NODE_LINE.exec(content)
      if (!node) {
        return fail('Expected a node, like `api = process "API"`, or an edge, like `a -> b`.')
      }

      const [, id, shape, rest] = node
      if (!isKnownShape(shape)) {
        return fail(
          `Unknown shape "${shape}". Use one of: ${SHAPE_OPTIONS.map((o) => o.value).join(', ')}.`,
        )
      }
      if (byId.has(id)) return fail(`"${id}" is already defined.`)

      const parsed = readNameAndDescription(rest)
      if (parsed.error) return fail(parsed.error)

      const record = {
        id,
        type: shape,
        name: parsed.name ?? id,
        data: parsed.description ? { description: parsed.description } : {},
      }
      nodes.push(record)
      byId.set(id, record)
    })

  // Edges and positions are checked once every node is known, so a line may
  // refer to a node defined further down.
  pendingEdges.forEach(({ line, source, target, label }) => {
    const missing = [source, target].find((id) => !byId.has(id))
    if (missing) return errors.push({ line, message: `No node called "${missing}".` })
    if (source === target) return errors.push({ line, message: 'A node cannot connect to itself.' })

    const id = edgeIdFor(source, target)
    if (edges.some((existing) => existing.id === id)) {
      return errors.push({ line, message: `${source} -> ${target} is already connected.` })
    }
    edges.push({ id, source, target, ...(label ? { label } : {}) })
  })

  const positioned = new Set()
  layout.forEach(({ line, id, x, y }) => {
    const node = byId.get(id)
    if (!node) return errors.push({ line, message: `No node called "${id}".` })
    if (positioned.has(id)) return errors.push({ line, message: `"${id}" already has a position.` })
    positioned.add(id)
    node.position = { x, y }
  })

  errors.sort((a, b) => a.line - b.line)

  return errors.length
    ? { document: null, errors }
    : { document: { version: DOCUMENT_VERSION, title, nodes, edges }, errors }
}

/**
 * `"Name" -- description`, where both parts are optional.
 * @param {string} rest
 * @returns {{ name?: string, description?: string, error?: string }}
 */
function readNameAndDescription(rest) {
  let remaining = rest.trim()
  /** @type {string | undefined} */
  let name

  if (remaining.startsWith('"')) {
    const end = closingQuote(remaining)
    if (end === -1) return { error: 'The name is missing its closing quote.' }
    try {
      name = JSON.parse(remaining.slice(0, end + 1))
    } catch {
      return { error: 'The name has an escape JSON does not allow.' }
    }
    remaining = remaining.slice(end + 1).trim()
  }

  if (!remaining) return { name }
  if (!remaining.startsWith(DESCRIPTION_MARK)) {
    return { error: 'Put the name in quotes, and start a description with `--`.' }
  }

  return { name, description: unescapeRest(remaining.slice(DESCRIPTION_MARK.length).trim()) }
}

/**
 * The index of the quote that closes the one at 0, skipping escaped quotes.
 * @param {string} text
 */
function closingQuote(text) {
  for (let index = 1; index < text.length; index += 1) {
    if (text[index] === '\\') index += 1
    else if (text[index] === '"') return index
  }
  return -1
}

export const FLOW_EXTENSION = '.flow'

/**
 * A file name from a diagram's title, safe on every file system.
 * @param {string} title
 */
export function flowFileName(title) {
  const base = String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'diagram'}${FLOW_EXTENSION}`
}
