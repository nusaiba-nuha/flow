import { describe, expect, it } from 'vitest'

import { prReport, REPORT_MARKER } from '../prReport.js'

const BEFORE = 'title: Shop\napi = process "API"\ndb = database "DB"\napi -> db\n'

describe('prReport', () => {
  it('lists each changed diagram with a coloured Mermaid drawing', () => {
    const after = 'title: Shop\napi = process "API gateway"\nq = data "Queue"\napi -> q\n'
    const report = prReport([{ path: 'docs/shop.flow', before: BEFORE, after }])

    expect(report.startsWith(REPORT_MARKER)).toBe(true)
    expect(report).toContain('#### `docs/shop.flow`')
    expect(report).toContain(
      '```diff\n+ Queue\n- DB\n~ API → API gateway\n+ API gateway → Queue\n- API → DB\n```',
    )
    expect(report).toContain('```mermaid\n---\ntitle: Shop\n---\nflowchart TD')
    expect(report).toContain('  class q added')
    expect(report).toContain('  class db removed')
    expect(report).toContain('  class api changed')
    expect(report).toMatch(/ {2}linkStyle \d stroke:#16a34a/)
  })

  it('marks new and removed files, and says when one no longer parses', () => {
    const report = prReport([
      { path: 'new.flow', before: '', after: 'a = process' },
      { path: 'gone.flow', before: BEFORE, after: '' },
      { path: 'broken.flow', before: BEFORE, after: 'a = hexagon' },
    ])

    expect(report).toContain('#### `new.flow` (new)')
    expect(report).toContain('#### `gone.flow` (removed)')
    expect(report).toContain(
      '#### `broken.flow` does not parse\n\n- Line 1: Unknown shape "hexagon"',
    )
  })

  it('is empty when nothing changed in substance, so no comment is posted', () => {
    const reordered = `# a comment\n${BEFORE}`
    expect(prReport([{ path: 'shop.flow', before: BEFORE, after: reordered }])).toBe('')
    expect(prReport([])).toBe('')
  })
})
