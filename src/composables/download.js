/**
 * Hand the browser a file to save, for when there is no file to write back to.
 *
 * @param {string} name
 * @param {string} text
 * @param {string} [type]
 */
export function downloadText(name, text, type = 'text/plain') {
  downloadBlob(name, new Blob([text], { type }))
}

/**
 * @param {string} name
 * @param {Blob} blob
 */
export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
