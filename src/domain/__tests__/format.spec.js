import { describe, expect, it } from 'vitest'

import payload from '../../../public/payload.json'
import { WEEKDAYS } from '../constants.js'
import {
  attachmentName,
  attachmentParts,
  firstLine,
  summariseHours,
  textParts,
  truncate,
} from '../format.js'

const welcome = payload.find((node) => node.id === 'b0653a').data.payload
const hours = payload.find((node) => node.id === 'd09c08').data.times

describe('text', () => {
  it('truncates past the limit and keeps the first line', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello world', 5)).toBe('hello...')
    expect(truncate(null)).toBe('')
    expect(firstLine(textParts(welcome)[0].text)).toBe('Hello there')
  })
})

describe('message parts', () => {
  it('splits text from attachments and names the file', () => {
    expect(textParts(welcome)).toHaveLength(1)
    expect(attachmentParts(welcome)).toHaveLength(1)
    expect(textParts(undefined)).toEqual([])
    // The payload's image url carries an hmac query string.
    expect(attachmentName(attachmentParts(welcome)[0].attachment)).toBe('354.jpg')
  })
})

describe('summariseHours', () => {
  it('collapses a uniform week, counts a varied one', () => {
    expect(summariseHours(hours, 'UTC')).toBe('09:00 - 17:00 - UTC')
    expect(summariseHours([], 'UTC')).toBe('No hours set')

    const mixed = [{ day: WEEKDAYS[0], startTime: '10:00', endTime: '16:00' }, ...hours.slice(1)]
    expect(summariseHours(mixed, 'UTC')).toBe('7 day schedule - UTC')
  })
})
