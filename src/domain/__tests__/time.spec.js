import { describe, expect, it } from 'vitest'

import { fromPickerTime, normaliseWeek, timezoneOptions, toPickerTime } from '../time.js'

describe('time', () => {
  it('converts between the payload format and the picker', () => {
    expect(toPickerTime('09:30')).toEqual({ hours: 9, minutes: 30, seconds: 0 })
    expect(fromPickerTime({ hours: 9, minutes: 5, seconds: 0 })).toBe('09:05')

    // A cleared picker, and a value the payload never had.
    expect(fromPickerTime(null)).toBe('00:00')
    expect(toPickerTime('')).toEqual({ hours: 0, minutes: 0, seconds: 0 })
  })

  it('fills the week in payload order, keeping the days it was given', () => {
    const week = normaliseWeek([{ day: 'wed', startTime: '10:00', endTime: '16:00' }])

    expect(week).toHaveLength(7)
    expect(week.map((slot) => slot.day)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
    expect(week[2]).toEqual({ day: 'wed', startTime: '10:00', endTime: '16:00' })
  })

  it('keeps an unlisted zone selectable so saving cannot lose it', () => {
    const options = timezoneOptions('Pacific/Chatham')
    expect(options.map((zone) => zone.value)).toContain('Pacific/Chatham')
  })
})
