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
}

const domainFile = (name: string) => new URL(`../../../src/domain/${name}`, import.meta.url).href

let loaded: Promise<Domain> | undefined

export function loadDomain(): Promise<Domain> {
  loaded ??= (async () => {
    const [flowText, brief, svg, share] = await Promise.all([
      import(domainFile('flowText.js')),
      import(domainFile('brief.js')),
      import(domainFile('renderSvg.js')),
      import(domainFile('shareLink.js')),
    ])
    return {
      parseFlow: flowText.parseFlow,
      serialiseFlow: flowText.serialiseFlow,
      toBrief: brief.toBrief,
      renderSvg: svg.renderSvg,
      encodeShare: share.encodeShare,
      sketchFont: loadFont,
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
