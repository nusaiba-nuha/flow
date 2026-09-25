import { NODE_SIZE, SHAPE } from './constants.js'
import { buildEdges, normaliseNode } from './graph.js'
import { layoutTree } from './layout.js'
import { metaFor } from './nodeMeta.js'
import { shapePath, textInset } from './shapes.js'

/**
 * The app's colour tokens, copied from `style.css` so the renderer runs where
 * there is no stylesheet: the command line, CI, a docs build. Keep the two in
 * step when a token changes.
 */
export const SVG_THEMES = Object.freeze({
  light: {
    canvas: '#ffffff',
    surface: '#ffffff',
    ink: '#14181f',
    muted: '#64748b',
    line: '#e3e7ee',
    edge: '#f97362',
    accents: {
      trigger: '#e11d48',
      hours: '#ea580c',
      message: '#059669',
      comment: '#0284c7',
      branch: '#4f46e5',
      unknown: '#94a3b8',
    },
  },
  dark: {
    canvas: '#0d1117',
    surface: '#161b22',
    ink: '#e6edf3',
    muted: '#9aa7b6',
    line: '#2a323d',
    edge: '#fb8f7e',
    accents: {
      trigger: '#fb7185',
      hours: '#fb923c',
      message: '#34d399',
      comment: '#38bdf8',
      branch: '#a5b4fc',
      unknown: '#94a3b8',
    },
  },
})

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const TITLE_SIZE = 14
const TEXT_SIZE = 12
/** Average glyph width as a share of font size: close enough to fit text without a browser. */
const GLYPH = 0.56

/**
 * A diagram as a standalone SVG document, the same shapes and layout as the
 * canvas, with no browser. Nodes without a position are laid out as the app
 * lays them out.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {{ theme?: 'light' | 'dark', padding?: number }} [options]
 * @returns {string}
 */
export function renderSvg(document, { theme = 'light', padding = 32 } = {}) {
  const colours = SVG_THEMES[theme] ?? SVG_THEMES.light
  const nodes = document.nodes.map(normaliseNode)
  const ids = new Set(nodes.map((node) => node.id))
  const edges = buildEdges(document.edges, ids)
  const laidOut = layoutTree(nodes, edges)
  const at = new Map(
    nodes.map((node) => [node.id, node.position ?? laidOut.get(node.id) ?? { x: 0, y: 0 }]),
  )

  const xs = [...at.values()].map((point) => point.x)
  const ys = [...at.values()].map((point) => point.y)
  const left = (xs.length ? Math.min(...xs) : 0) - padding
  const top = (ys.length ? Math.min(...ys) : 0) - padding
  const width = (xs.length ? Math.max(...xs) + NODE_SIZE.WIDTH : 0) - left + padding
  const height = (ys.length ? Math.max(...ys) + NODE_SIZE.HEIGHT : 0) - top + padding

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="${round(left)} ${round(top)} ${round(width)} ${round(height)}" font-family="${escapeXml(FONT)}">`,
    `<title>${escapeXml(document.title ?? '')}</title>`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${colours.edge}"/></marker></defs>`,
    `<rect x="${round(left)}" y="${round(top)}" width="${round(width)}" height="${round(height)}" fill="${colours.canvas}"/>`,
    ...edges.map((edge) =>
      renderEdge(
        edge,
        /** @type {any} */ (at.get(edge.source)),
        /** @type {any} */ (at.get(edge.target)),
        colours,
      ),
    ),
    ...nodes.map((node) => renderNode(node, /** @type {any} */ (at.get(node.id)), colours)),
    '</svg>',
  ]

  return `${parts.join('\n')}\n`
}

/**
 * Bottom centre to top centre, turning halfway, like the canvas's step edges.
 * @param {import('./types.js').VueFlowEdge} edge
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @param {typeof SVG_THEMES.light} colours
 */
function renderEdge(edge, from, to, colours) {
  const x1 = from.x + NODE_SIZE.WIDTH / 2
  const y1 = from.y + NODE_SIZE.HEIGHT
  const x2 = to.x + NODE_SIZE.WIDTH / 2
  const y2 = to.y
  const middle = (y1 + y2) / 2

  const line = `<path d="M${round(x1)},${round(y1)} V${round(middle)} H${round(x2)} V${round(y2)}" fill="none" stroke="${colours.edge}" stroke-width="1.5" marker-end="url(#arrow)"/>`
  if (!edge.label) return line

  const labelWidth = edge.label.length * TEXT_SIZE * GLYPH + 16
  const cx = (x1 + x2) / 2
  return [
    line,
    `<rect x="${round(cx - labelWidth / 2)}" y="${round(middle - 10)}" width="${round(labelWidth)}" height="20" rx="10" fill="${colours.surface}" stroke="${colours.line}"/>`,
    `<text x="${round(cx)}" y="${round(middle)}" font-size="11" fill="${colours.muted}" text-anchor="middle" dominant-baseline="central">${escapeXml(edge.label)}</text>`,
  ].join('\n')
}

/**
 * @param {import('./types.js').FlowNode} node
 * @param {{ x: number, y: number }} position
 * @param {typeof SVG_THEMES.light} colours
 */
function renderNode(node, position, colours) {
  const meta = metaFor(node.type)
  const accent =
    colours.accents[/** @type {keyof typeof colours.accents} */ (meta.accent)] ??
    colours.accents.unknown
  const outline = shapePath(node.type, NODE_SIZE.WIDTH, NODE_SIZE.HEIGHT, 1.5)
  const description = meta.summary(node)

  const body =
    node.type === SHAPE.TABLE
      ? tableText(node.name, description, colours)
      : centredText(node, description, colours)

  return [
    `<g transform="translate(${round(position.x)},${round(position.y)})">`,
    outline
      ? `<path d="${outline}" fill="${colours.surface}" stroke="${accent}" stroke-width="1.5" stroke-linejoin="round"/>`
      : '',
    body,
    '</g>',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * @param {import('./types.js').FlowNode} node
 * @param {string} description
 * @param {typeof SVG_THEMES.light} colours
 */
function centredText(node, description, colours) {
  const inset = textInset(node.type, NODE_SIZE.WIDTH, NODE_SIZE.HEIGHT)
  const room = NODE_SIZE.WIDTH - 2 * (inset.x || 12)
  const titleSize = node.type === SHAPE.TEXT ? 16 : TITLE_SIZE
  const titles = wrap(node.name, room, titleSize, 2)
  const lines = description
    ? wrap(description, room, TEXT_SIZE, node.type === SHAPE.DECISION ? 1 : 2)
    : []

  const blockHeight =
    titles.length * titleSize * 1.25 + (lines.length ? 4 + lines.length * TEXT_SIZE * 1.3 : 0)
  let y = NODE_SIZE.HEIGHT / 2 - blockHeight / 2
  const cx = NODE_SIZE.WIDTH / 2

  const out = titles.map((line) => {
    y += titleSize * 1.25
    return `<text x="${cx}" y="${round(y - 4)}" font-size="${titleSize}" font-weight="600" fill="${colours.ink}" text-anchor="middle">${escapeXml(line)}</text>`
  })
  y += 4
  lines.forEach((line) => {
    y += TEXT_SIZE * 1.3
    out.push(
      `<text x="${cx}" y="${round(y - 3)}" font-size="${TEXT_SIZE}" fill="${colours.muted}" text-anchor="middle">${escapeXml(line)}</text>`,
    )
  })
  return out.join('\n')
}

/**
 * @param {string} name
 * @param {string} description
 * @param {typeof SVG_THEMES.light} colours
 */
function tableText(name, description, colours) {
  const room = NODE_SIZE.WIDTH - 24
  const out = [
    `<text x="12" y="21" font-size="${TITLE_SIZE}" font-weight="600" fill="${colours.ink}">${escapeXml(wrap(name, room, TITLE_SIZE, 1)[0] ?? '')}</text>`,
  ]
  wrap(description, room, TEXT_SIZE, 3).forEach((line, index) =>
    out.push(
      `<text x="12" y="${52 + index * 16}" font-size="${TEXT_SIZE}" fill="${colours.muted}">${escapeXml(line)}</text>`,
    ),
  )
  return out.join('\n')
}

/**
 * Words into at most `max` lines that fit `width`, the last ending in an
 * ellipsis when something was cut.
 *
 * @param {string} text
 * @param {number} width
 * @param {number} size
 * @param {number} max
 * @returns {string[]}
 */
export function wrap(text, width, size, max) {
  const fits = Math.max(4, Math.floor(width / (size * GLYPH)))
  const words = String(text ?? '')
    .split(/\s+/)
    .filter(Boolean)
  /** @type {string[]} */
  const lines = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= fits) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word.length > fits ? `${word.slice(0, fits - 1)}…` : word
  }
  if (current) lines.push(current)

  if (lines.length <= max) return lines
  const kept = lines.slice(0, max)
  const last = kept[max - 1]
  kept[max - 1] = `${last.length >= fits ? last.slice(0, fits - 1) : last}…`
  return kept
}

/** @param {string} text */
export const escapeXml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** @param {number} value */
const round = (value) => Math.round(value * 10) / 10
