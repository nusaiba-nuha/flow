import { describe, expect, it } from 'vitest'

import payload from '@/tests/fixtures/diagram.json'
import { NODE_TYPE } from '../constants.js'
import { normaliseNode } from '../graph.js'
import { CREATABLE_NODES, creatableByValue, isOpenable, metaFor } from '../nodeMeta.js'

const nodes = Object.fromEntries(payload.map((raw) => [String(raw.id), normaliseNode(raw)]))

describe('metaFor', () => {
  it('covers every payload type and falls back rather than throwing', () => {
    payload.forEach((raw) => expect(metaFor(raw.type).label).not.toBe('Unknown'))
    expect(metaFor('somethingNew').label).toBe('Unknown')
  })

  it('summarises each type from its own data', () => {
    expect(metaFor(NODE_TYPE.SEND_MESSAGE).summary(nodes['b0653a'])).toBe('Hello there')
    expect(metaFor(NODE_TYPE.ADD_COMMENT).summary(nodes['e879e4'])).toBe(
      'User message during off hours',
    )
    expect(metaFor(NODE_TYPE.DATE_TIME).summary(nodes['d09c08'])).toBe('09:00 - 17:00 - UTC')
  })
})

describe('interaction rules', () => {
  it('keeps the trigger and both connectors display only', () => {
    expect(isOpenable(nodes['1'])).toBe(false)
    expect(isOpenable(nodes['161f52'])).toBe(false)
    expect(isOpenable(nodes['28c4b9'])).toBe(false)
    expect(isOpenable(nodes['b6a0c1'])).toBe(true)
  })
})

describe('CREATABLE_NODES', () => {
  it('offers the brief three options, with businessHours seeding a dateTime node', () => {
    expect(CREATABLE_NODES.map((option) => option.label)).toEqual([
      'Send Message',
      'Add Comments',
      'Business Hours',
    ])

    const hours = creatableByValue('businessHours')
    expect(hours?.type).toBe(NODE_TYPE.DATE_TIME)
    expect(hours?.seed('desc').times).toHaveLength(7)
    expect(creatableByValue(NODE_TYPE.SEND_MESSAGE)?.seed('Hi').payload[0].text).toBe('Hi')
  })
})
