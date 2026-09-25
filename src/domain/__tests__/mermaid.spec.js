import { describe, expect, it } from 'vitest'

import { sampleById } from '../samples.js'
import { fromMermaid, toMermaid } from '../mermaid.js'

const architecture = sampleById('architecture').document

describe('toMermaid, edge styles', () => {
  it('writes dashed edges dotted and two-way edges with both heads', () => {
    const text = toMermaid({
      version: 3,
      title: 'T',
      nodes: [
        { id: 'a', type: 'process', name: 'A', data: {} },
        { id: 'b', type: 'process', name: 'B', data: {} },
        { id: 'c', type: 'process', name: 'C', data: {} },
      ],
      edges: [
        { id: 'e-a-b', source: 'a', target: 'b', dashed: true },
        { id: 'e-b-c', source: 'b', target: 'c', both: true },
      ],
    })

    expect(text).toContain('  a -.-> b\n')
    expect(text).toContain('  b <--> c\n')
  })
})

describe('toMermaid', () => {
  it('writes a titled flowchart with each shape in its own bracket', () => {
    const text = toMermaid({
      version: 3,
      title: 'Checkout',
      nodes: [
        { id: 'cart', type: 'terminal', name: 'Cart', data: {} },
        { id: 'paid', type: 'decision', name: 'Paid "in full"?', data: {} },
        { id: 'db', type: 'database', name: 'Orders', data: {} },
        { id: 'io', type: 'data', name: 'Receipt', data: {} },
        { id: 'memo', type: 'note', name: 'Check fraud', data: {} },
      ],
      edges: [
        { id: 'e-cart-paid', source: 'cart', target: 'paid' },
        { id: 'e-paid-db', source: 'paid', target: 'db', label: 'yes | ok' },
      ],
    })

    expect(text).toBe(
      [
        '---',
        'title: Checkout',
        '---',
        'flowchart TD',
        '  cart(["Cart"])',
        '  paid{"Paid #quot;in full#quot;?"}',
        '  db[("Orders")]',
        '  io[/"Receipt"/]',
        '  memo>"Check fraud"]',
        '  cart --> paid',
        '  paid -->|"yes #124; ok"| db',
        '',
      ].join('\n'),
    )
  })

  it('renames ids Mermaid would misread, consistently in nodes and edges', () => {
    const text = toMermaid({
      version: 3,
      title: 'Ids',
      nodes: [
        { id: '1', type: 'process', name: 'One', data: {} },
        { id: 'end', type: 'process', name: 'End', data: {} },
        { id: 'a-b', type: 'process', name: 'Dash', data: {} },
      ],
      edges: [{ id: 'e-1-end', source: '1', target: 'end' }],
    })

    expect(text).toContain('  n_1["One"]')
    expect(text).toContain('  n_end["End"]')
    expect(text).toContain('  a_b["Dash"]')
    expect(text).toContain('  n_1 --> n_end')
  })
})

describe('fromMermaid', () => {
  it('reads back what it writes: shapes, names, labels and the title', () => {
    const { document, warnings } = fromMermaid(toMermaid(architecture))

    expect(warnings).toEqual([])
    expect(document.title).toBe(architecture.title)
    expect(document.edges).toEqual(
      architecture.edges.map(({ id, source, target, label }) => ({
        id,
        source,
        target,
        ...(label ? { label } : {}),
      })),
    )
    expect(document.nodes.map(({ id, name }) => ({ id, name }))).toEqual(
      architecture.nodes.map(({ id, name }) => ({ id, name })),
    )
    // Mermaid's classic syntax has no document bracket, so that one comes back a process.
    expect(document.nodes.map((node) => node.type)).toEqual(
      architecture.nodes.map((node) => (node.type === 'document' ? 'process' : node.type)),
    )
  })

  it('reads the flowcharts people actually paste', () => {
    const { document, warnings } = fromMermaid(`
graph LR
  A[Christmas] -->|Get money| B(Go shopping)
  B --> C{Let me think}
  C -- One --> D[Laptop]
  C -. Two .-> E[iPhone]
  C ==> F[fa:fa-car Car]
  D & E --> G((Done)); G --- H[("Store")]
`)

    expect(warnings).toEqual([])
    const byId = Object.fromEntries(document.nodes.map((node) => [node.id, node]))
    expect(byId.A).toMatchObject({ type: 'process', name: 'Christmas' })
    expect(byId.C).toMatchObject({ type: 'decision', name: 'Let me think' })
    expect(byId.G).toMatchObject({ type: 'terminal', name: 'Done' })
    expect(byId.H).toMatchObject({ type: 'database', name: 'Store' })

    const edges = document.edges.map((edge) => `${edge.source}>${edge.target}:${edge.label ?? ''}`)
    expect(edges).toEqual([
      'A>B:Get money',
      'B>C:',
      'C>D:One',
      'C>E:Two',
      'C>F:',
      'D>G:',
      'E>G:',
      'G>H:',
    ])
  })

  it('keeps a shape declared once and referred to later, and names a bare id after itself', () => {
    const { document } = fromMermaid('flowchart TD\n  a{"Ready?"}\n  a --> b\n  b --> a')

    expect(document.nodes).toEqual([
      { id: 'a', type: 'decision', name: 'Ready?', data: {} },
      { id: 'b', type: 'process', name: 'b', data: {} },
    ])
    expect(document.edges).toHaveLength(2)
  })

  it('reports each line it skips, and imports the rest', () => {
    const { document, warnings } = fromMermaid(
      [
        'flowchart TD',
        '  classDef hot fill:#f00',
        '  subgraph Backend',
        '    api[API] --> db[(DB)]',
        '  end',
        '  ghost --> ???',
        '  style api fill:#0f0',
      ].join('\n'),
    )

    expect(document.nodes.map((node) => node.id)).toEqual(['api', 'db'])
    expect(warnings.map((warning) => warning.line)).toEqual([2, 3, 6, 7])
    expect(warnings[1].message).toMatch(/subgraphs are flattened/i)
    expect(warnings[2].message).toMatch(/skipped/i)
  })
})

describe('toMermaid with a highlight', () => {
  it('styles changed nodes by class and changed edges by their position', () => {
    const text = toMermaid(architecture, {
      highlight: new Map([
        ['cache', 'removed'],
        ['api', 'changed'],
        ['e-lb-api', 'added'],
      ]),
    })

    expect(text).toContain('  class cache removed')
    expect(text).toContain('  class api changed')
    const index = architecture.edges.findIndex((edge) => edge.id === 'e-lb-api')
    expect(text).toContain(`  linkStyle ${index} stroke:#16a34a,stroke-width:3px`)
    expect(toMermaid(architecture)).not.toContain('classDef')
  })
})
