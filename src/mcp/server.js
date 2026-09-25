import { toBrief } from '../domain/brief.js'
import { describeDiff, diffDocuments, isUnchanged } from '../domain/diff.js'
import { FLOW_EXTENSION, parseFlow, serialiseFlow } from '../domain/flowText.js'
import { renderSvg } from '../domain/renderSvg.js'
import { SHAPE_OPTIONS } from '../domain/nodeMeta.js'
import { isSketch } from '../domain/sketch.js'

/**
 * A Model Context Protocol server for a folder of `.flow` files, so a coding
 * agent can list, read, write, draw and compare diagrams itself. It speaks
 * JSON-RPC one message at a time; the transport lives in `stdio.js`, and the
 * file system is handed in, so this tests without either.
 *
 * @typedef {{
 *   readFile: (path: string) => Promise<string>,
 *   writeFile: (path: string, text: string) => Promise<void>,
 *   listFiles: () => Promise<string[]>,
 *   resolve: (path: string) => string | null,
 *   sketchFont?: () => Promise<string>,
 * }} Workspace  paths are relative to the folder; `resolve` refuses any outside it;
 *   `sketchFont` is the handwriting font to embed in a sketch
 *
 * @typedef {{ jsonrpc: '2.0', id?: string | number | null, method?: string, params?: any }} Message
 */

export const SERVER_INFO = Object.freeze({ name: 'isketch', version: '0.1.0' })

/** Newest first; a client asking for one we do not know gets the newest. */
const PROTOCOL_VERSIONS = Object.freeze(['2025-06-18', '2025-03-26', '2024-11-05'])

const INSTRUCTIONS = `Diagrams in this folder are .flow files, sketched by a person in isketch.
Read one as a brief before building from it, and refer to shapes by their ids. When the code
changes what a diagram shows, update the diagram with write_diagram so the two stay true.
Format: \`id = shape "Name" -- description\`, \`a -> b : label\` (\`-->\` dashed, \`<->\` both ways),
positions under \`@layout\`.
Notes (\`note: ...\` for the diagram, \`id note: ...\` for a shape) are the person's instructions:
follow them, and add one when you leave something for them to decide.
Shapes: ${SHAPE_OPTIONS.map((option) => option.value).join(', ')}.
Screen, button, input, card, list and image sketch an interface.`

const PATH = { type: 'string', description: 'Path of a .flow file, relative to the folder' }

/** Each tool: what an agent sees, and what it does. */
const TOOLS = Object.freeze([
  {
    name: 'list_diagrams',
    description: 'List every .flow diagram in the folder, with its title and size.',
    inputSchema: { type: 'object', properties: {} },
    run: listDiagrams,
  },
  {
    name: 'read_diagram',
    description:
      'Read a diagram. "brief" (the default) explains each shape and connection in Markdown ' +
      'and ends with the source; "flow" is the .flow text alone, to edit and write back.',
    inputSchema: {
      type: 'object',
      properties: { path: PATH, format: { type: 'string', enum: ['brief', 'flow'] } },
      required: ['path'],
    },
    run: readDiagram,
  },
  {
    name: 'write_diagram',
    description:
      'Create or replace a diagram with .flow text. Nothing is written if the text has errors; ' +
      'they come back with line numbers. Keep the @layout block of an existing diagram so the ' +
      "person's layout survives; shapes without a position are placed automatically.",
    inputSchema: {
      type: 'object',
      properties: { path: PATH, text: { type: 'string', description: 'The whole diagram' } },
      required: ['path', 'text'],
    },
    run: writeDiagram,
  },
  {
    name: 'render_diagram',
    description: 'Draw a diagram as SVG, returned as text or written next to it.',
    inputSchema: {
      type: 'object',
      properties: {
        path: PATH,
        out: { type: 'string', description: 'Optional .svg path to write, relative to the folder' },
        theme: { type: 'string', enum: ['light', 'dark'] },
      },
      required: ['path'],
    },
    run: renderDiagram,
  },
  {
    name: 'diff_diagrams',
    description:
      'List what changed between a diagram file and other .flow text, such as a proposed edit ' +
      'or an older version: shapes and connections added, removed and changed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: PATH,
        text: { type: 'string', description: 'The other version, as .flow text' },
      },
      required: ['path', 'text'],
    },
    run: diffDiagrams,
  },
])

/** A tool's failure the agent should read and act on, rather than a protocol error. */
class ToolError extends Error {}

/**
 * @param {Workspace} workspace
 * @returns {(message: Message) => Promise<object | null>} a response, or null for a notification
 */
export function createServer(workspace) {
  return async function handle(message) {
    const { id, method, params } = message ?? {}
    const isRequest = id !== undefined && id !== null
    if (message?.jsonrpc !== '2.0' || typeof method !== 'string') {
      return isRequest ? failure(id ?? null, -32600, 'Invalid request') : null
    }
    if (!isRequest) return null

    try {
      switch (method) {
        case 'initialize':
          return success(id, {
            protocolVersion: PROTOCOL_VERSIONS.includes(params?.protocolVersion)
              ? params.protocolVersion
              : PROTOCOL_VERSIONS[0],
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
            instructions: INSTRUCTIONS,
          })
        case 'ping':
          return success(id, {})
        case 'tools/list':
          return success(id, {
            tools: TOOLS.map(({ name, description, inputSchema }) => ({
              name,
              description,
              inputSchema,
            })),
          })
        case 'tools/call':
          return success(id, await callTool(workspace, params))
        default:
          return failure(id, -32601, `Unknown method: ${method}`)
      }
    } catch (error) {
      return failure(id, -32603, error instanceof Error ? error.message : String(error))
    }
  }
}

/**
 * @param {Workspace} workspace
 * @param {{ name?: string, arguments?: Record<string, unknown> }} params
 */
async function callTool(workspace, params) {
  const tool = TOOLS.find((candidate) => candidate.name === params?.name)
  if (!tool) return toolResult(`Unknown tool: ${params?.name}`, true)

  try {
    return toolResult(await tool.run(workspace, params.arguments ?? {}))
  } catch (error) {
    if (error instanceof ToolError) return toolResult(error.message, true)
    throw error
  }
}

/** @param {string} text @param {boolean} [isError] */
const toolResult = (text, isError = false) => ({
  content: [{ type: 'text', text }],
  ...(isError ? { isError: true } : {}),
})

/** @param {string | number} id @param {object} result */
const success = (id, result) => ({ jsonrpc: '2.0', id, result })

/** @param {string | number | null} id @param {number} code @param {string} message */
const failure = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

/**
 * A `.flow` path inside the folder, or a ToolError saying why not.
 * @param {Workspace} workspace
 * @param {unknown} path
 * @param {string} [extension]
 */
function checkedPath(workspace, path, extension = FLOW_EXTENSION) {
  if (typeof path !== 'string' || !path.trim()) throw new ToolError('A path is required.')
  if (!path.endsWith(extension)) throw new ToolError(`${path} is not a ${extension} file.`)
  if (!workspace.resolve(path)) throw new ToolError(`${path} is outside the diagrams folder.`)
  return path
}

/**
 * @param {Workspace} workspace
 * @param {string} path
 */
async function load(workspace, path) {
  let text
  try {
    text = await workspace.readFile(path)
  } catch {
    throw new ToolError(`${path} does not exist. list_diagrams shows the ones that do.`)
  }
  return parsed(text, path)
}

/** @param {string} text @param {string} label */
function parsed(text, label) {
  const { document, errors } = parseFlow(text)
  if (errors.length || !document) {
    throw new ToolError(
      [
        `${label} has errors:`,
        ...errors.map((error) => `line ${error.line}: ${error.message}`),
      ].join('\n'),
    )
  }
  return document
}

/** @param {Workspace} workspace */
async function listDiagrams(workspace) {
  const files = (await workspace.listFiles()).filter((file) => file.endsWith(FLOW_EXTENSION))
  if (!files.length) return 'No .flow diagrams in this folder yet. write_diagram creates one.'

  const rows = await Promise.all(
    files.sort().map(async (file) => {
      const { document, errors } = parseFlow(await workspace.readFile(file))
      if (errors.length || !document) return `- ${file}: has ${errors.length} error(s)`
      return `- ${file}: "${document.title}", ${document.nodes.length} shapes, ${document.edges.length} connections`
    }),
  )
  return rows.join('\n')
}

/**
 * @param {Workspace} workspace
 * @param {Record<string, unknown>} args
 */
async function readDiagram(workspace, { path, format = 'brief' }) {
  const file = checkedPath(workspace, path)
  const document = await load(workspace, file)
  return format === 'flow' ? serialiseFlow(document) : toBrief(document)
}

/**
 * @param {Workspace} workspace
 * @param {Record<string, unknown>} args
 */
async function writeDiagram(workspace, { path, text }) {
  const file = checkedPath(workspace, path)
  if (typeof text !== 'string') throw new ToolError('text is required.')

  const document = parsed(text, 'The text')
  let before = null
  try {
    before = parseFlow(await workspace.readFile(file)).document
  } catch {
    // A new diagram.
  }

  await workspace.writeFile(file, serialiseFlow(document))
  if (!before) {
    return `Created ${file}: ${document.nodes.length} shapes, ${document.edges.length} connections.`
  }

  const changes = diffDocuments(before, document)
  return isUnchanged(changes)
    ? `${file} is unchanged.`
    : [`Updated ${file}:`, ...describeDiff(before, document, changes)].join('\n')
}

/**
 * @param {Workspace} workspace
 * @param {Record<string, unknown>} args
 */
async function renderDiagram(workspace, { path, out, theme }) {
  const file = checkedPath(workspace, path)
  const document = await load(workspace, file)
  const svg = renderSvg(document, {
    theme: theme === 'dark' ? 'dark' : 'light',
    sketchFont: isSketch(document) && workspace.sketchFont ? await workspace.sketchFont() : '',
  })
  if (out === undefined) return svg

  const target = checkedPath(workspace, out, '.svg')
  await workspace.writeFile(target, svg)
  return `Rendered ${file} to ${target}.`
}

/**
 * @param {Workspace} workspace
 * @param {Record<string, unknown>} args
 */
async function diffDiagrams(workspace, { path, text }) {
  const file = checkedPath(workspace, path)
  if (typeof text !== 'string') throw new ToolError('text is required.')

  const before = await load(workspace, file)
  const after = parsed(text, 'The text')
  const changes = diffDocuments(before, after)
  return isUnchanged(changes) ? 'No changes.' : describeDiff(before, after, changes).join('\n')
}
