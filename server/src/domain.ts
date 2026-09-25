import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

/**
 * The app's own pure domain code, so a hosted diagram is read, briefed and
 * drawn exactly as the editor and the CLI do it. Loaded at run time from the
 * repository's `src/domain`, one level above this package.
 */
export interface FlowDocument {
  version: number
  title: string
  style?: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}

export interface FlowError {
  line: number
  message: string
}

export interface Domain {
  parseFlow(text: string): { document: FlowDocument | null; errors: FlowError[] }
  serialiseFlow(document: FlowDocument): string
  toBrief(document: FlowDocument): string
  renderSvg(document: FlowDocument, options?: { theme?: string; sketchFont?: string }): string
  encodeShare(document: FlowDocument): Promise<string>
  sketchFont(): Promise<string>
  diffDocuments(before: FlowDocument, after: FlowDocument): unknown
  describeDiff(before: FlowDocument, after: FlowDocument, changes: unknown): string[]
  isUnchanged(changes: unknown): boolean
  createProtocol(server: {
    tools: McpTool[]
    instructions: string
    context: unknown
  }): (message: unknown) => Promise<object | null>
  ToolError: new (message: string) => Error
}

export interface McpTool {
  name: string
  description: string
  inputSchema: object
  run: (context: unknown, args: Record<string, unknown>) => Promise<string>
}

const domainFile = (name: string) => new URL(`../../../src/domain/${name}`, import.meta.url).href
const mcpFile = (name: string) => new URL(`../../../src/mcp/${name}`, import.meta.url).href

let loaded: Promise<Domain> | undefined

export function loadDomain(): Promise<Domain> {
  loaded ??= (async () => {
    const [flowText, brief, svg, share, diff, protocol] = await Promise.all([
      import(domainFile('flowText.js')),
      import(domainFile('brief.js')),
      import(domainFile('renderSvg.js')),
      import(domainFile('shareLink.js')),
      import(domainFile('diff.js')),
      import(mcpFile('protocol.js')),
    ])
    return {
      parseFlow: flowText.parseFlow,
      serialiseFlow: flowText.serialiseFlow,
      toBrief: brief.toBrief,
      renderSvg: svg.renderSvg,
      encodeShare: share.encodeShare,
      sketchFont: loadFont,
      diffDocuments: diff.diffDocuments,
      describeDiff: diff.describeDiff,
      isUnchanged: diff.isUnchanged,
      createProtocol: protocol.createProtocol,
      ToolError: protocol.ToolError,
    }
  })()
  return loaded
}

let font: Promise<string> | undefined

/** The handwriting font, embedded in a sketch's SVG as the CLI does. */
function loadFont(): Promise<string> {
  font ??= (async () => {
    try {
      const require = createRequire(domainFile('flowText.js'))
      const path =
        require.resolve('@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2')
      return `data:font/woff2;base64,${(await readFile(path)).toString('base64')}`
    } catch {
      return ''
    }
  })()
  return font
}
