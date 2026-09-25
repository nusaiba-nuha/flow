import { afterEach, describe, expect, it, vi } from 'vitest'

import { sampleById } from '../samples.js'
import { decodeShare, encodeShare, SHARE_PREFIX } from '../shareLink.js'

const architecture = sampleById('architecture').document

afterEach(() => vi.unstubAllGlobals())

describe('share links', () => {
  it('carry a whole diagram, compressed, and open it again exactly', async () => {
    const hash = await encodeShare(architecture)

    expect(hash.startsWith(`${SHARE_PREFIX}z`)).toBe(true)
    // Only URL-safe characters, so nothing needs escaping in a chat message.
    expect(hash.slice(SHARE_PREFIX.length)).toMatch(/^[\w-]+$/)
    expect(await decodeShare(hash)).toEqual(architecture)
  })

  it('fall back to plain text where the browser cannot compress', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    const hash = await encodeShare(architecture)

    expect(hash.startsWith(`${SHARE_PREFIX}t`)).toBe(true)
    expect(await decodeShare(hash)).toEqual(architecture)
  })

  it('keep text that is not ASCII', async () => {
    const document = structuredClone(architecture)
    document.title = 'Café → 日本'
    expect((await decodeShare(await encodeShare(document))).title).toBe('Café → 日本')
  })

  it('open nothing from a hash that is not a diagram, or is damaged', async () => {
    expect(await decodeShare('')).toBeNull()
    expect(await decodeShare('#section-2')).toBeNull()
    expect(await decodeShare(`${SHARE_PREFIX}znot-compressed-data`)).toBeNull()
    expect(await decodeShare(`${SHARE_PREFIX}x${btoa('a = process')}`)).toBeNull()
    // Valid bytes, but not a valid diagram.
    expect(await decodeShare(`${SHARE_PREFIX}t${btoa('a = hexagon')}`)).toBeNull()
  })
})
