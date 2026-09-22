import { ref } from 'vue'

import { MESSAGE_PART } from '@/domain/constants.js'

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024
const ACCEPTED = /^image\//

/** No upload endpoint here, so a file is stored inline as a data URL. */
export function useAttachmentUpload() {
  const error = ref('')
  const isReading = ref(false)

  /**
   * @param {File} file
   * @returns {Promise<import('@/domain/types.js').AttachmentPart | null>}
   */
  async function toAttachment(file) {
    error.value = ''

    if (!ACCEPTED.test(file.type)) {
      error.value = 'Only image files can be attached.'
      return null
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      error.value = 'Attachments must be 2 MB or smaller.'
      return null
    }

    isReading.value = true
    try {
      return {
        type: MESSAGE_PART.ATTACHMENT,
        attachment: await readAsDataUrl(file),
        name: file.name,
      }
    } catch {
      error.value = 'That file could not be read.'
      return null
    } finally {
      isReading.value = false
    }
  }

  return { toAttachment, error, isReading }
}

/** @param {File} file @returns {Promise<string>} */
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
