import { SHAPE } from './constants.js'
import { serialiseFlow } from './flowText.js'

/**
 * What each shape asks of whoever builds from the diagram. The palette's hints
 * say what a shape looks like; these say what it means for the code.
 * @type {Readonly<Record<string, string>>}
 */
const INTENT = Object.freeze({
  [SHAPE.PROCESS]: 'a component or step',
  [SHAPE.TERMINAL]: 'where a flow starts or ends, or something outside the system',
  [SHAPE.DECISION]: 'a branch the code must handle',
  [SHAPE.DATA]: 'data going in or out',
  [SHAPE.DATABASE]: 'a data store',
  [SHAPE.DOCUMENT]: 'a file or document',
  [SHAPE.NOTE]: 'a note for whoever builds this',
  [SHAPE.TABLE]: 'a database table',
  [SHAPE.TEXT]: 'a label',
})

/** @param {string} type */
const intentOf = (type) => INTENT[type] ?? 'a shape'

/** One line, so a description cannot break the list it sits in. */
/** @param {string | undefined} text */
const oneLine = (text) =>
  String(text ?? '')
    .replace(/\s*\n\s*/g, '; ')
    .trim()

/** @param {string} text */
const escapeMarkdown = (text) => text.replace(/([\\`*_[\]])/g, '\\$1')

/**
 * A fence longer than any run of backticks inside, so the source cannot close
 * it early.
 * @param {string} text
 */
function fence(text) {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  return '`'.repeat(Math.max(3, longest + 1))
}

/**
 * The diagram as a Markdown brief for a coding agent: what each shape is for,
 * every connection in words, then the `.flow` source to edit and hand back.
 * Ids are kept, so an agent can refer to a shape without guessing.
 *
 * @param {import('./types.js').FlowDocument} document
 * @returns {string}
 */
export function toBrief(document) {
  const names = new Map(document.nodes.map((node) => [node.id, node.name || node.id]))
  const label = (/** @type {string} */ id) => `**${escapeMarkdown(names.get(id) ?? id)}**`
  const count = (/** @type {number} */ n, /** @type {string} */ noun) =>
    `${n} ${noun}${n === 1 ? '' : 's'}`

  const lines = [
    `# ${oneLine(document.title) || 'Untitled diagram'}`,
    '',
    `A design sketched in isketch: ${count(document.nodes.length, 'shape')} and ${count(document.edges.length, 'connection')}. ` +
      'Build from it, and refer to shapes by their ids. To change the diagram, edit the source at ' +
      'the end and hand it back.',
  ]

  if (document.nodes.length) {
    lines.push('', '## Shapes', '')
    document.nodes.forEach((node) => {
      const description = oneLine(node.data?.description)
      const detail =
        node.type === SHAPE.TABLE && description ? `Columns: ${description}` : description
      lines.push(
        `- ${label(node.id)} \`${node.id}\`: ${intentOf(node.type)}.${detail ? ` ${detail}` : ''}`,
      )
    })
  }

  if (document.edges.length) {
    lines.push('', '## Connections', '')
    document.edges.forEach((edge) => {
      const text = oneLine(edge.label)
      lines.push(`- ${label(edge.source)} → ${label(edge.target)}${text ? `: ${text}` : ''}`)
    })
  }

  const source = serialiseFlow(document).trimEnd()
  const marks = fence(source)
  lines.push(
    '',
    '## Source',
    '',
    'The same diagram in the `.flow` format: `id = shape "Name" -- description`, ' +
      '`a -> b : label`, and positions under `@layout`.',
    '',
    `${marks}text`,
    source,
    marks,
  )

  return `${lines.join('\n')}\n`
}
