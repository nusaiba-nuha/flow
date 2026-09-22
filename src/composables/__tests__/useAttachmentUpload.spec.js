import { describe, expect, it } from 'vitest'

import { MAX_ATTACHMENT_BYTES, useAttachmentUpload } from '../useAttachmentUpload.js'

const fileOf = ({ type = 'image/png', size = 1024, name = 'shot.png' } = {}) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('useAttachmentUpload', () => {
  it('reads an image into an attachment part', async () => {
    const { toAttachment, error } = useAttachmentUpload()
    const part = await toAttachment(fileOf())

    expect(part).toMatchObject({ type: 'attachment', name: 'shot.png' })
    expect(part.attachment).toMatch(/^data:/)
    expect(error.value).toBe('')
  })

  it('refuses a non-image and anything over the size cap', async () => {
    const { toAttachment, error } = useAttachmentUpload()

    expect(await toAttachment(fileOf({ type: 'application/pdf', name: 'a.pdf' }))).toBeNull()
    expect(error.value).toMatch(/only image files/i)

    expect(await toAttachment(fileOf({ size: MAX_ATTACHMENT_BYTES + 1 }))).toBeNull()
    expect(error.value).toMatch(/2 mb or smaller/i)
  })
})
