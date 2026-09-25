import { beforeEach, describe, expect, it } from 'vitest'

import { migrateLegacyKeys, STORAGE_KEYS } from '../storageKeys.js'

beforeEach(() => localStorage.clear())

describe('migrateLegacyKeys', () => {
  it('moves a document saved under its old source key, and clears every old key', () => {
    localStorage.setItem('flow-builder:flow:/api/payload', '["older"]')
    localStorage.setItem('flow-builder:flow:/payload.json', '["newer"]')
    localStorage.setItem('flow-builder:theme', 'dark')

    migrateLegacyKeys()

    expect(localStorage.getItem(STORAGE_KEYS.DOCUMENT)).toBe('["newer"]')
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('dark')
    expect(Object.keys(localStorage).every((key) => key.startsWith('flow:'))).toBe(true)
  })

  it('never overwrites what is already saved under the current key', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, 'light')
    localStorage.setItem('flow-builder:theme', 'dark')

    migrateLegacyKeys()

    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('light')
  })
})
