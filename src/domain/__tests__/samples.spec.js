import { describe, expect, it } from 'vitest'

import { DOCUMENT_VERSION, migrate } from '../document.js'
import { isKnownShape } from '../nodeMeta.js'
import { FIRST_RUN_SAMPLE, SAMPLES, sampleById } from '../samples.js'

describe('samples', () => {
  it('are current documents made of known shapes, with every edge joined at both ends', () => {
    SAMPLES.forEach(({ document }) => {
      expect(migrate(document)).toEqual(document)
      expect(document.version).toBe(DOCUMENT_VERSION)

      const ids = new Set(document.nodes.map((node) => node.id))
      document.nodes.forEach((node) => expect(isKnownShape(node.type)).toBe(true))
      document.edges.forEach((edge) => {
        expect(ids.has(edge.source)).toBe(true)
        expect(ids.has(edge.target)).toBe(true)
      })
    })
  })

  it('finds a sample by id, including the first run one', () => {
    expect(sampleById(FIRST_RUN_SAMPLE)).not.toBeNull()
    expect(sampleById('nope')).toBeNull()
  })
})
