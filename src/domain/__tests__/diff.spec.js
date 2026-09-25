import { describe, expect, it } from 'vitest'

import { sampleById } from '../samples.js'
import { describeDiff, diffDocuments, isUnchanged, mergeForDiff } from '../diff.js'
import { renderSvg } from '../renderSvg.js'

const before = sampleById('architecture').document

/** The architecture sample, with one of each kind of change. */
function edited() {
  const after = structuredClone(before)
  after.nodes = after.nodes.filter((node) => node.id !== 'cache')
  after.edges = after.edges.filter((edge) => edge.target !== 'cache')
  after.nodes.find((node) => node.id === 'api').name = 'API gateway'
  after.nodes.find((node) => node.id === 'worker').position = { x: 700, y: 704 }
  after.edges.find((edge) => edge.id === 'e-api-db').label = 'SQL, read and write'
  after.nodes.push({ id: 'search', type: 'database', name: 'Search', data: {} })
  after.edges.push({ id: 'e-api-search', source: 'api', target: 'search', label: 'queries' })
  return after
}

describe('diffDocuments', () => {
  it('tells what a node says apart from where it sits', () => {
    const diff = diffDocuments(before, edited())

    expect(diff.nodes).toEqual({
      added: ['search'],
      removed: ['cache'],
      changed: ['api'],
      moved: ['worker'],
    })
    expect(diff.edges).toEqual({
      added: ['e-api-search'],
      removed: ['e-api-cache'],
      changed: ['e-api-db'],
    })
    expect(isUnchanged(diff)).toBe(false)
    expect(isUnchanged(diffDocuments(before, structuredClone(before)))).toBe(true)
  })

  it('counts a change of shape, description or notes as a change', () => {
    const after = structuredClone(before)
    after.nodes.find((node) => node.id === 'db').type = 'table'
    after.nodes.find((node) => node.id === 'lb').data.description = 'TLS and rate limits'
    after.nodes.find((node) => node.id === 'api').data.notes = 'Paginate lists'

    expect(diffDocuments(before, after).nodes.changed).toEqual(['lb', 'api', 'db'])
  })
})

describe('diffDocuments, edge styles', () => {
  it('counts a dashed or two-way edge as a changed one', () => {
    const after = structuredClone(before)
    after.edges[0].dashed = true
    after.edges[1].both = true

    expect(diffDocuments(before, after).edges.changed).toEqual([
      after.edges[0].id,
      after.edges[1].id,
    ])
  })
})

describe('describeDiff', () => {
  it('lists changes the way a review reads them', () => {
    const after = edited()
    expect(describeDiff(before, after, diffDocuments(before, after))).toEqual([
      '+ Search',
      '- Redis',
      '~ API → API gateway',
      '+ API gateway → Search (queries)',
      '- API → Redis',
      '~ API gateway → PostgreSQL (SQL, read and write)',
      '  1 moved',
    ])
  })
})

describe('mergeForDiff', () => {
  it('keeps removed things where they were, marked, alongside the new version', () => {
    const after = edited()
    const { document, highlight } = mergeForDiff(before, after, diffDocuments(before, after))

    const cache = document.nodes.find((node) => node.id === 'cache')
    expect(cache.position).toEqual(before.nodes.find((node) => node.id === 'cache').position)
    expect(document.edges.map((edge) => edge.id)).toContain('e-api-cache')
    expect(highlight.get('cache')).toBe('removed')
    expect(highlight.get('search')).toBe('added')
    expect(highlight.get('api')).toBe('changed')
    expect(highlight.has('worker')).toBe(false)

    const svg = renderSvg(document, { highlight })
    expect(svg.match(/data-change="removed"/g)).toHaveLength(2)
    expect(svg.match(/data-change="added"/g)).toHaveLength(2)
    expect(svg.match(/data-change="changed"/g)).toHaveLength(2)
    expect(svg).toContain('stroke-dasharray')
  })
})

describe('resizing', () => {
  it('counts as a move, not a change of meaning', () => {
    const after = structuredClone(before)
    after.nodes.find((node) => node.id === 'api').size = { width: 400, height: 200 }
    const diff = diffDocuments(before, after)

    expect(diff.nodes.moved).toEqual(['api'])
    expect(diff.nodes.changed).toEqual([])
  })
})
