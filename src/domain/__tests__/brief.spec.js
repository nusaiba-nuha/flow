import { describe, expect, it } from 'vitest'

import { toBrief } from '../brief.js'
import { parseFlow } from '../flowText.js'

const flow = (text) => parseFlow(text).document

describe('toBrief', () => {
  it('lists each shape by what it means, and each connection in words', () => {
    const brief = toBrief(
      flow(
        [
          'title: Checkout',
          'cart = terminal "Cart"',
          'paid = decision "Paid?" -- Card or invoice',
          'orders = table "orders" -- id PK, user_id FK',
          'cart -> paid',
          'paid -> orders : yes',
        ].join('\n'),
      ),
    )

    expect(brief).toMatch(
      /^# Checkout\n\nA design sketched in isketch: 3 shapes and 2 connections\./,
    )
    expect(brief).toContain(
      '- **Cart** `cart`: where a flow starts or ends, or something outside the system.\n',
    )
    expect(brief).toContain('- **Paid?** `paid`: a branch the code must handle. Card or invoice\n')
    expect(brief).toContain('- **orders** `orders`: a database table. Columns: id PK, user_id FK\n')
    expect(brief).toContain(
      '## Connections\n\n- **Cart** → **Paid?**\n- **Paid?** → **orders**: yes\n',
    )
  })

  it('reads a wireframe as an interface to build', () => {
    const brief = toBrief(
      flow(
        'page = screen "Sign up" -- /signup\nemail = input "Email"\ngo = button "Create account"\n',
      ),
    )

    expect(brief).toContain('- **Sign up** `page`: a screen or page of the interface. /signup\n')
    expect(brief).toContain('- **Email** `email`: a form field.\n')
    expect(brief).toContain('- **Create account** `go`: a button.\n')
  })

  it('ends with the .flow source, so an agent can edit it and hand it back', () => {
    const brief = toBrief(flow('a = process "A"\nb = database "B"\na -> b\n'))
    const source = brief.slice(brief.indexOf('```text\n') + 8, brief.lastIndexOf('```'))

    expect(parseFlow(source).errors).toEqual([])
    expect(parseFlow(source).document.edges).toHaveLength(1)
  })

  it('keeps names and descriptions from breaking the Markdown', () => {
    const brief = toBrief(
      flow('a = process "*bold* [link]" -- one\\ntwo\nb = note "Uses ```fences```"\n'),
    )

    expect(brief).toContain('- **\\*bold\\* \\[link\\]** `a`: a component or step. one; two\n')
    expect(brief).toContain('\n````text\n')
    expect(brief.trimEnd().endsWith('\n````')).toBe(true)
  })

  it('says so when the diagram is empty', () => {
    const brief = toBrief({ version: 3, title: '', nodes: [], edges: [] })

    expect(brief).toMatch(
      /^# Untitled diagram\n\nA design sketched in isketch: 0 shapes and 0 connections\./,
    )
    expect(brief).not.toContain('## Shapes')
  })
})
