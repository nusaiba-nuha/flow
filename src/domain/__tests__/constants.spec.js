import { describe, expect, it } from 'vitest'

import diagram from '@/tests/fixtures/diagram.json'
import { NODE_TYPE, WEEKDAYS } from '../constants.js'

describe('constants', () => {
  it('matches the sample diagram', () => {
    const known = Object.values(NODE_TYPE)
    new Set(diagram.nodes.map((node) => node.type)).forEach((type) => expect(known).toContain(type))

    const days = diagram.nodes.find((node) => node.data?.times)?.data.times.map((slot) => slot.day)
    expect([...WEEKDAYS]).toEqual(days)
  })
})
