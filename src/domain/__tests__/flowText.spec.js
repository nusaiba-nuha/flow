import { describe, expect, it } from 'vitest'

import { SAMPLES } from '../samples.js'
import { flowFileName, parseFlow, serialiseFlow } from '../flowText.js'

const small = {
  version: 3,
  title: 'Checkout',
  nodes: [
    { id: 'cart', type: 'terminal', name: 'Cart', data: {}, position: { x: 0, y: 0 } },
    {
      id: 'pay',
      type: 'decision',
      name: 'Paid?',
      data: { description: 'Card or wallet' },
      position: { x: 10, y: 176 },
    },
    { id: 'done', type: 'process', name: 'Ship it', data: {} },
  ],
  edges: [
    { id: 'e-cart-pay', source: 'cart', target: 'pay' },
    { id: 'e-pay-done', source: 'pay', target: 'done', label: 'yes' },
  ],
}

describe('serialiseFlow', () => {
  it('writes one line per node and edge, with layout kept to the end', () => {
    expect(serialiseFlow(small)).toBe(
      [
        'title: Checkout',
        '',
        'cart = terminal "Cart"',
        'pay = decision "Paid?" -- Card or wallet',
        'done = process "Ship it"',
        '',
        'cart -> pay',
        'pay -> done : yes',
        '',
        '@layout',
        'cart 0,0',
        'pay 10,176',
        '',
      ].join('\n'),
    )
  })

  it('changes one line when one thing changes', () => {
    const moved = structuredClone(small)
    moved.nodes[1].position = { x: 400, y: 176 }

    const before = serialiseFlow(small).split('\n')
    const after = serialiseFlow(moved).split('\n')
    expect(after.filter((line, index) => line !== before[index])).toEqual(['pay 400,176'])
  })
})

describe('parseFlow', () => {
  it('round trips every sample exactly', () => {
    SAMPLES.forEach(({ document }) => {
      const { document: parsed, errors } = parseFlow(serialiseFlow(document))
      expect(errors).toEqual([])
      expect(parsed).toEqual(document)
    })
  })

  it('keeps quotes, arrows, newlines and backslashes in names, descriptions and labels', () => {
    const tricky = structuredClone(small)
    tricky.title = 'A -> B: the "real" one'
    tricky.nodes[0].name = 'Say "hi" -- then go'
    tricky.nodes[1].data.description = 'line one\nline two, with a \\ and -- and ->'
    tricky.edges[1].label = 'yes -> ship: now'

    expect(parseFlow(serialiseFlow(tricky)).document).toEqual(tricky)
  })

  it('reads what a person would write by hand', () => {
    const { document, errors } = parseFlow(`
      # Comments and blank lines are ignored, and edges may come first.
      title: Hand written

      a -> b: next

      a = process
      b = note "B" --   trailing words
    `)

    expect(errors).toEqual([])
    expect(document.nodes).toEqual([
      { id: 'a', type: 'process', name: 'a', data: {} },
      { id: 'b', type: 'note', name: 'B', data: { description: 'trailing words' } },
    ])
    expect(document.edges).toEqual([{ id: 'e-a-b', source: 'a', target: 'b', label: 'next' }])
  })

  it('reports every problem with its line, and no document', () => {
    const { document, errors } = parseFlow(
      [
        'a = process "A"',
        'a = note "Again"',
        'b = hexagon "B"',
        'c = process "C',
        'a -> ghost',
        'a -> a',
        'd = process unquoted name',
        'what is this',
        '@layout',
        'a 1,2',
        'a 3,4',
        'ghost 0,0',
        'a here',
      ].join('\n'),
    )

    expect(document).toBeNull()
    expect(errors.map((error) => error.line)).toEqual([2, 3, 4, 5, 6, 7, 8, 11, 12, 13])
    expect(errors[0].message).toMatch(/already defined/)
    expect(errors[1].message).toMatch(/unknown shape "hexagon".*process, terminal/i)
    expect(errors[2].message).toMatch(/closing quote/)
    expect(errors[3].message).toMatch(/no node called "ghost"/i)
    expect(errors[4].message).toMatch(/itself/)
    expect(errors[5].message).toMatch(/in quotes/)
    expect(errors[7].message).toMatch(/already has a position/)
  })

  it('refuses the same edge twice', () => {
    const { errors } = parseFlow('a = process\nb = process\na -> b\na -> b : again')
    expect(errors).toEqual([{ line: 4, message: 'a -> b is already connected.' }])
  })

  it('reads an empty text as an empty diagram', () => {
    expect(parseFlow('').document).toEqual({
      version: 3,
      title: 'Untitled diagram',
      nodes: [],
      edges: [],
    })
  })
})

describe('flowFileName', () => {
  it('makes a safe file name from the title', () => {
    expect(flowFileName('Web app architecture')).toBe('web-app-architecture.flow')
    expect(flowFileName('  Café / Orders (v2)! ')).toBe('caf-orders-v2.flow')
    expect(flowFileName('')).toBe('diagram.flow')
  })
})

describe('sizes', () => {
  it('writes notes one per line, for the diagram and for each shape, and reads them back', () => {
    const document = {
      ...small,
      notes: 'Use NestJS\nPostgreSQL 16',
      nodes: small.nodes.map((node) =>
        node.id === 'pay'
          ? { ...node, data: { ...node.data, notes: 'Retry twice\n\nLog failures' } }
          : node,
      ),
    }
    const text = serialiseFlow(document)

    expect(text).toMatch(/^title: Checkout\nnote: Use NestJS\nnote: PostgreSQL 16\n\n/)
    expect(text).toContain(
      'pay = decision "Paid?" -- Card or wallet\npay note: Retry twice\npay note: Log failures\n',
    )

    const { document: read } = parseFlow(text)
    expect(read.notes).toBe('Use NestJS\nPostgreSQL 16')
    expect(read.nodes[1].data).toEqual({
      description: 'Card or wallet',
      notes: 'Retry twice\nLog failures',
    })
    expect(parseFlow('a = note "A"\nb note: x').errors).toEqual([
      { line: 2, message: 'No node called "b".' },
    ])
  })

  it('writes the sketch style under the title, and refuses a style it does not know', () => {
    const text = serialiseFlow({ ...small, style: 'sketch' })

    expect(text).toMatch(/^title: Checkout\nstyle: sketch\n\n/)
    expect(parseFlow(text).document.style).toBe('sketch')
    expect(parseFlow('style: clean\na = note "A"').document.style).toBeUndefined()
    expect(serialiseFlow(small)).not.toContain('style:')
    expect(parseFlow('style: wobbly').errors).toEqual([
      { line: 1, message: 'Unknown style "wobbly". Use one of: clean, sketch.' },
    ])
  })

  it('keep a resized node size on its layout line, and read it back', () => {
    const sized = structuredClone(small)
    sized.nodes[1].size = { width: 300, height: 140 }

    const text = serialiseFlow(sized)
    expect(text).toContain('pay 10,176 300x140')
    expect(parseFlow(text).document).toEqual(sized)
  })
})
