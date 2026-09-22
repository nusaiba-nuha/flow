import { WEEKDAYS } from './constants.js'

/** @typedef {{ hours: number, minutes: number, seconds: number }} PickerTime */

/**
 * The picker speaks {hours, minutes}, the payload speaks "HH:mm".
 * @param {string} time
 * @returns {PickerTime}
 */
export function toPickerTime(time) {
  const [hours, minutes] = String(time ?? '')
    .split(':')
    .map(Number)
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
    seconds: 0,
  }
}

/** @param {PickerTime | null} picked @returns {string} */
export function fromPickerTime(picked) {
  if (!picked) return '00:00'
  return `${pad(picked.hours)}:${pad(picked.minutes)}`
}

/** @param {number} value */
const pad = (value) => String(value ?? 0).padStart(2, '0')

/**
 * Seven rows in payload order, whatever the data happened to contain.
 * @param {import('./types.js').BusinessHour[]} [times]
 * @returns {import('./types.js').BusinessHour[]}
 */
export function normaliseWeek(times) {
  const byDay = new Map((times ?? []).map((slot) => [slot.day, slot]))
  return WEEKDAYS.map((day) => byDay.get(day) ?? { day, startTime: '09:00', endTime: '17:00' })
}

/** @returns {string} this browser's zone, or UTC */
export function localTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * @param {string} zone
 * @param {Date} [at] the offset moves across daylight saving
 * @returns {number} minutes from UTC
 */
export function offsetMinutes(zone, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    }).formatToParts(at)

    const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
    const match = name.match(/GMT([+-])(\d{2}):(\d{2})/)
    if (!match) return 0

    const [, sign, hours, minutes] = match
    return (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes))
  } catch {
    return 0
  }
}

/**
 * Built from the zone itself, so one outside the curated list still reads properly.
 * @param {string} zone
 * @returns {string} such as "(GMT+08:00) Kuala Lumpur"
 */
export function timezoneLabel(zone) {
  const minutes = offsetMinutes(zone)
  const sign = minutes < 0 ? '-' : '+'
  const absolute = Math.abs(minutes)
  const hh = String(Math.floor(absolute / 60)).padStart(2, '0')
  const mm = String(absolute % 60).padStart(2, '0')
  const city = zone === 'UTC' ? 'UTC' : (zone.split('/').pop() ?? zone).replace(/_/g, ' ')

  return `(GMT${sign}${hh}:${mm}) ${city}`
}

/**
 * The curated list plus any zone that must stay selectable, or a node in an
 * unlisted zone would show an empty select and lose its value on save.
 *
 * @param {...(string | undefined | null)} required
 * @returns {{ value: string, label: string }[]}
 */
export function timezoneOptions(...required) {
  const local = localTimezone()
  const values = new Set([...TIMEZONES.map((zone) => zone.value), local])
  required.filter(Boolean).forEach((zone) => values.add(/** @type {string} */ (zone)))

  return [...values]
    .map((value) => ({
      value,
      label: value === local ? `${timezoneLabel(value)} - your time zone` : timezoneLabel(value),
    }))
    .sort(
      (a, b) => offsetMinutes(a.value) - offsetMinutes(b.value) || a.value.localeCompare(b.value),
    )
}

/** A short curated list, not the full IANA set. */
export const TIMEZONES = Object.freeze([
  { value: 'UTC', label: '(GMT+00:00) UTC' },
  { value: 'Europe/London', label: '(GMT+00:00) London' },
  { value: 'Europe/Berlin', label: '(GMT+01:00) Berlin' },
  { value: 'Asia/Dubai', label: '(GMT+04:00) Dubai' },
  { value: 'Asia/Karachi', label: '(GMT+05:00) Karachi' },
  { value: 'Asia/Kuala_Lumpur', label: '(GMT+08:00) Kuala Lumpur' },
  { value: 'Asia/Singapore', label: '(GMT+08:00) Singapore' },
  { value: 'Australia/Sydney', label: '(GMT+11:00) Sydney' },
  { value: 'America/New_York', label: '(GMT-05:00) New York' },
])
