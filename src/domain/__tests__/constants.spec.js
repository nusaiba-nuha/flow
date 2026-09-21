import { describe, expect, it } from 'vitest'

import payload from '../../../public/payload.json'
import { NODE_TYPE, ROOT_PARENT_ID, WEEKDAYS, WEEKDAY_LABEL } from '../constants.js'

describe('NODE_TYPE', () => {
  it('covers every type present in the payload', () => {
    // The only realistic way this file goes wrong: the payload gains a type
    // nothing here handles.
    const known = Object.values(NODE_TYPE)
    new Set(payload.map((node) => node.type)).forEach((type) => expect(known).toContain(type))
  })

  it('is frozen, so a typo cannot quietly add a sixth type', () => {
    expect(Object.isFrozen(NODE_TYPE)).toBe(true)
  })
})

describe('ROOT_PARENT_ID', () => {
  it('matches the payload root as a string', () => {
    // Ids are normalised to strings, so the sentinel has to be one too.
    const root = payload.find((node) => String(node.parentId) === ROOT_PARENT_ID)
    expect(root).toBeDefined()
    expect(typeof ROOT_PARENT_ID).toBe('string')
  })
})

describe('weekdays', () => {
  it('runs Monday to Sunday, in payload order', () => {
    const inPayload = payload.find((node) => node.data?.times)?.data.times.map((slot) => slot.day)
    expect([...WEEKDAYS]).toEqual(inPayload)
  })

  it('labels every day', () => {
    WEEKDAYS.forEach((day) => expect(WEEKDAY_LABEL[day]).toBeTruthy())
  })
})
