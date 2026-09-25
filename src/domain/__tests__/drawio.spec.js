import { deflateSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'

import { fromDrawio, parseXml, shapeOf, toDrawio } from '../drawio.js'
import { parseFlow } from '../flowText.js'
import { sampleById } from '../samples.js'

const cell = (id, value, style, geometry = 'x="0" y="0" width="120" height="60"', parent = '1') =>
  `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="${parent}"><mxGeometry ${geometry} as="geometry"/></mxCell>`
const arrow = (id, source, target, value = '') =>
  `<mxCell id="${id}" value="${value}" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1"${source ? ` source="${source}"` : ''}${target ? ` target="${target}"` : ''}><mxGeometry relative="1" as="geometry"/></mxCell>`
const model = (...cells) =>
  `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel>`
const file = (inner, name = 'Checkout') =>
  `<?xml version="1.0"?>\n<mxfile host="app.diagrams.net"><diagram id="p1" name="${name}">${inner}</diagram></mxfile>`

const CHECKOUT = model(
  cell('s', 'Cart', 'ellipse;whiteSpace=wrap;html=1;'),
  cell(
    'd',
    '&lt;b&gt;Paid?&lt;/b&gt;&lt;br&gt;Card or invoice',
    'rhombus;html=1;',
    'x="200" y="100" width="160" height="80"',
  ),
  cell('db', 'Orders', 'shape=cylinder3;whiteSpace=wrap;html=1;'),
  arrow('e1', 's', 'd'),
  arrow('e2', 'd', 'db', 'yes'),
  '<mxCell id="l1" value="paid" style="edgeLabel;html=1;" vertex="1" connectable="0" parent="e2"><mxGeometry relative="1" as="geometry"/></mxCell>',
  arrow('e3', 'd', null),
)

describe('fromDrawio', () => {
  it('reads shapes, labels, positions and connections from a page', () => {
    const { document, warnings } = fromDrawio(file(CHECKOUT))

    expect(document.title).toBe('Checkout')
    expect(document.nodes.map(({ id, type, name }) => [id, type, name])).toEqual([
      ['cart', 'terminal', 'Cart'],
      ['paid', 'decision', 'Paid?'],
      ['orders', 'database', 'Orders'],
    ])
    expect(document.nodes[1]).toMatchObject({
      data: { description: 'Card or invoice', origin: 'drawio' },
      position: { x: 200, y: 100 },
      size: { width: 160, height: 80 },
    })
    expect(document.edges.map(({ source, target, label }) => [source, target, label])).toEqual([
      ['cart', 'paid', undefined],
      ['paid', 'orders', 'yes, paid'],
    ])
    expect(warnings).toEqual([
      { line: 2, message: 'An arrow that is not connected to a shape at both ends was skipped.' },
    ])
  })

  it('reads a compressed page, as draw.io saved them for years', () => {
    const packed = btoa(
      String.fromCharCode(...deflateSync(strToU8(encodeURIComponent(CHECKOUT)), { level: 9 })),
    )
    const { document } = fromDrawio(file(packed, 'Page-1'))

    expect(document.nodes).toHaveLength(3)
    expect(document.title).toBe('Imported from draw.io')
  })

  it('reads the XML from Extras > Edit Diagram, without the file around it', () => {
    expect(fromDrawio(CHECKOUT).document.nodes).toHaveLength(3)
  })

  it('makes a table of an entity and its rows, and connects arrows from a row to its table', () => {
    const { document } = fromDrawio(
      model(
        cell(
          't',
          'orders',
          'swimlane;childLayout=stackLayout;html=1;',
          'x="0" y="0" width="160" height="104"',
        ),
        cell('r1', 'id PK', 'text;html=1;', 'y="26" width="160" height="26"', 't'),
        cell('r2', 'customer_id FK', 'text;html=1;', 'y="52" width="160" height="26"', 't'),
        cell('c', 'customers', 'swimlane;childLayout=stackLayout;html=1;'),
        arrow('e', 'r2', 'c'),
      ),
    )

    expect(document.nodes.map(({ id, type }) => [id, type])).toEqual([
      ['orders', 'table'],
      ['customers', 'table'],
    ])
    expect(document.nodes[0].data.description).toBe('id PK, customer_id FK')
    expect(document.edges.map(({ source, target }) => [source, target])).toEqual([
      ['orders', 'customers'],
    ])
  })

  it('keeps the shapes inside a lane, where they sit, and says the lane is gone', () => {
    const { document, warnings } = fromDrawio(
      model(
        cell(
          'lane',
          'Checkout team',
          'swimlane;horizontal=0;html=1;',
          'x="100" y="50" width="400" height="200"',
        ),
        cell('a', 'Take payment', 'rounded=1;', 'x="40" y="30" width="120" height="60"', 'lane'),
      ),
    )

    expect(document.nodes.map(({ name, position }) => [name, position])).toEqual([
      ['Take payment', { x: 140, y: 80 }],
    ])
    expect(warnings[0].message).toMatch(/Lanes and containers are not kept/)
  })

  it('reads a short label wrapped by hand as one name', () => {
    const { document } = fromDrawio(model(cell('a', 'Lamp&#xa;plugged in?', 'rhombus;')))

    expect(document.nodes[0]).toMatchObject({
      name: 'Lamp plugged in?',
      data: { origin: 'drawio' },
    })
  })

  it('says what is wrong with something that is not draw.io', () => {
    expect(fromDrawio('flowchart TD\n  A --> B').warnings[0].message).toMatch(/not draw.io XML/)
    expect(fromDrawio('<mxfile><diagram>').warnings[0].message).toMatch(/not draw.io XML/)
    expect(fromDrawio('<mxfile></mxfile>').warnings[0].message).toBe('The file has no pages.')
    expect(
      fromDrawio(`<mxfile><diagram name="A">${CHECKOUT}</diagram><diagram name="B"/></mxfile>`)
        .warnings,
    ).toContainEqual({ line: 1, message: 'Only the first of 2 pages was imported.' })
  })
})

describe('toDrawio', () => {
  it('writes a file draw.io opens, that comes back exactly as it went', () => {
    const architecture = sampleById('architecture').document
    const sketch = parseFlow(
      [
        'title: Sign up',
        'style: sketch',
        'page = screen "Sign up page" -- /signup',
        'go = button "Create account"',
        'users = table "users" -- id PK, email',
        'page -> go : submit & "go"',
        'go -> users',
      ].join('\n'),
    ).document

    ;[architecture, sketch].forEach((document) => {
      const xml = toDrawio(document)
      expect(xml).toMatch(/^<mxfile host="isketch"/)

      const { document: back, warnings } = fromDrawio(xml)
      expect(warnings).toEqual([])
      expect(back.title).toBe(document.title)
      expect(back.style).toBe(document.style)
      expect(
        back.nodes.map(({ id, type, name, data }) => [id, type, name, data.description ?? '']),
      ).toEqual(
        document.nodes.map(({ id, type, name, data }) => [id, type, name, data.description ?? '']),
      )
      expect(back.edges.map(({ id, label }) => [id, label])).toEqual(
        document.edges.map(({ id, label }) => [id, label]),
      )
    })
  })

  it('keeps positions and sizes, and marks a sketch for draw.io too', () => {
    const xml = toDrawio({
      version: 3,
      title: 'T',
      style: 'sketch',
      nodes: [
        {
          id: 'a',
          type: 'process',
          name: 'A',
          data: {},
          position: { x: 10, y: 20 },
          size: { width: 300, height: 90 },
        },
      ],
      edges: [],
    })

    expect(xml).toContain('<mxGeometry x="10" y="20" width="300" height="90" as="geometry" />')
    expect(xml).toContain('sketch=1;')
  })
})

describe('shapeOf', () => {
  it('maps draw.io styles to the nearest shape', () => {
    expect(shapeOf({ shape: 'mxgraph.flowchart.terminator' })).toBe('terminal')
    expect(shapeOf({ shape: 'mxgraph.flowchart.decision' })).toBe('decision')
    expect(shapeOf({ shape: 'document' })).toBe('document')
    expect(shapeOf({ shape: 'parallelogram' })).toBe('data')
    expect(shapeOf({ shape: 'note' })).toBe('note')
    expect(shapeOf({ text: '' })).toBe('text')
    expect(shapeOf({ rounded: '1', arcSize: '50' })).toBe('terminal')
    expect(shapeOf({ shape: 'mxgraph.mockup.containers.browserWindow' })).toBe('screen')
    expect(shapeOf({ rounded: '1' })).toBe('process')
    expect(shapeOf({ isketch: 'card', rounded: '1' })).toBe('card')
  })
})

describe('parseXml', () => {
  it('reads elements, attributes, entities, CDATA and comments', () => {
    const root = parseXml(
      '<?xml version="1.0"?><!-- hi --><a x="1 &amp; 2" y=\'&#65;&#x42;\'><b/><![CDATA[<raw>]]>t&lt;</a>',
    )

    expect(root).toMatchObject({ name: 'a', attrs: { x: '1 & 2', y: 'AB' }, text: '<raw>t<' })
    expect(root.children.map((child) => child.name)).toEqual(['b'])
    expect(parseXml('<a><b></a>')).toBeNull()
    expect(parseXml('<a/><b/>')).toBeNull()
  })
})
