import fontUrl from '@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2?url'

/** @type {Promise<string> | null} */
let font = null

/**
 * The handwriting font as a data URL, for a sketch to carry inside its SVG:
 * an SVG drawn as an image cannot load fonts from anywhere else.
 * @returns {Promise<string>}
 */
export function sketchFontData() {
  font ??= fetch(fontUrl)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () =>
            resolve(String(reader.result).replace(/^data:[^;]*/, 'data:font/woff2'))
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        }),
    )
    .catch(() => '')
  return /** @type {Promise<string>} */ (font)
}

/**
 * An SVG drawn onto a canvas and saved as PNG, at `scale` times its size so it
 * stays sharp on a high density screen or a slide.
 *
 * @param {string} svg
 * @param {number} [scale]
 * @returns {Promise<Blob>}
 */
export function svgToPng(svg, scale = 2) {
  const width = Number(/width="([\d.]+)"/.exec(svg)?.[1] ?? 0)
  const height = Number(/height="([\d.]+)"/.exec(svg)?.[1] ?? 0)

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('No canvas to draw on.'))
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be made.'))),
        'image/png',
      )
    }
    image.onerror = () => reject(new Error('The drawing could not be read.'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
