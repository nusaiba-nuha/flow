/**
 * The Model Context Protocol, one JSON-RPC message at a time, for any set of
 * tools. Shared by the local server over stdio (`isketch mcp`) and the hosted
 * one over HTTP, so both speak exactly the same protocol.
 */

/** @typedef {{ jsonrpc: '2.0', id?: string | number | null, method?: string, params?: any }} Message */

/**
 * @template Context
 * @typedef {{
 *   name: string,
 *   description: string,
 *   inputSchema: object,
 *   run: (context: Context, args: Record<string, unknown>) => Promise<string>,
 * }} Tool
 */

export const SERVER_INFO = Object.freeze({ name: 'isketch', version: '0.1.0' })

/** Newest first; a client asking for one we do not know gets the newest. */
export const PROTOCOL_VERSIONS = Object.freeze(['2025-06-18', '2025-03-26', '2024-11-05'])

/** A tool's failure the agent should read and act on, rather than a protocol error. */
export class ToolError extends Error {}

/**
 * @template Context
 * @param {{ tools: readonly Tool<Context>[], instructions: string, context: Context }} server
 * @returns {(message: Message) => Promise<object | null>} a response, or null for a notification
 */
export function createProtocol({ tools, instructions, context }) {
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
            instructions,
          })
        case 'ping':
          return success(id, {})
        case 'tools/list':
          return success(id, {
            tools: tools.map(({ name, description, inputSchema }) => ({
              name,
              description,
              inputSchema,
            })),
          })
        case 'tools/call':
          return success(id, await callTool(tools, context, params))
        default:
          return failure(id, -32601, `Unknown method: ${method}`)
      }
    } catch (error) {
      return failure(id, -32603, error instanceof Error ? error.message : String(error))
    }
  }
}

/**
 * @template Context
 * @param {readonly Tool<Context>[]} tools
 * @param {Context} context
 * @param {{ name?: string, arguments?: Record<string, unknown> }} params
 */
async function callTool(tools, context, params) {
  const tool = tools.find((candidate) => candidate.name === params?.name)
  if (!tool) return toolResult(`Unknown tool: ${params?.name}`, true)

  try {
    return toolResult(await tool.run(context, params.arguments ?? {}))
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
