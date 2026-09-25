import { describe, expect, it } from 'vitest'

import { sampleById } from '../samples.js'
import { renderSvg, SVG_THEMES, wrap } from '../renderSvg.js'

const architecture = sampleById('architecture').document
const support = sampleById('support').document

describe('renderSvg', () => {
  it('draws one outline per shape and one line per edge, with each label', () => {
    const svg = renderSvg(architecture)

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.match(/<g transform=/g)).toHaveLength(architecture.nodes.length)
    expect(svg.match(/marker-end="url\(#arrow\)"/g)).toHaveLength(architecture.edges.length)
    ;['HTTPS', 'SQL', 'enqueue', 'PostgreSQL', 'Job queue'].forEach((text) =>
      expect(svg).toContain(`>${text}<`),
    )
  })

  it('frames the diagram with padding, including nodes the layout placed', () => {
    // The support flow stores no positions at all, so all of them come from the layout.
    const svg = renderSvg(support, { padding: 10 })
    const [x, y, width, height] = /viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number)

    expect(x).toBe(-10)
    expect(y).toBe(-10)
    expect(width).toBeGreaterThan(232)
    expect(height).toBeGreaterThan(104 * 3)
  })

  it('uses the dark palette when asked', () => {
    const svg = renderSvg(support, { theme: 'dark' })
    expect(svg).toContain(`fill="${SVG_THEMES.dark.canvas}"`)
    expect(svg).not.toContain(SVG_THEMES.light.accents.trigger)
  })

  it('escapes names, descriptions and labels', () => {
    const svg = renderSvg({
      version: 3,
      title: 'A & B',
      nodes: [
        { id: 'a', type: 'process', name: '<script>', data: { description: 'x "y" & z' } },
        { id: 'b', type: 'table', name: 'orders', data: { description: 'id PK' } },
      ],
      edges: [{ id: 'e-a-b', source: 'a', target: 'b', label: "it's > 1" }],
    })

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).toContain('x &quot;y&quot; &amp; z')
    expect(svg).toContain('it&apos;s &gt; 1')
    expect(svg).toContain('<title>A &amp; B</title>')
  })

  it('draws an empty diagram as an empty frame', () => {
    expect(renderSvg({ version: 3, title: '', nodes: [], edges: [] })).toContain(
      'viewBox="-32 -32 64 64"',
    )
  })
})

describe('wrap', () => {
  it('breaks on words, and ends a cut line with an ellipsis', () => {
    expect(wrap('one two three', 1000, 10, 2)).toEqual(['one two three'])
    expect(wrap('alpha beta gamma delta', 60, 10, 2)).toEqual(['alpha beta', 'gamma…'])
    expect(wrap('', 100, 10, 2)).toEqual([])
  })
})
