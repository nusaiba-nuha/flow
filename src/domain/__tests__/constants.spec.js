import { describe, expect, it } from 'vitest'

import payload from '../../../public/payload.json'
import { NODE_TYPE, WEEKDAYS } from '../constants.js'

describe('constants', () => {
  it('matches the payload', () => {
    const known = Object.values(NODE_TYPE)
    new Set(payload.map((node) => node.type)).forEach((type) => expect(known).toContain(type))

    const days = payload.find((node) => node.data?.times)?.data.times.map((slot) => slot.day)
    expect([...WEEKDAYS]).toEqual(days)
  })
})
