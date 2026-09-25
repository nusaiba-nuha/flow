import { SHAPE } from './constants.js'

/**
 * SVG path data for each shape's outline in a `width` by `height` box, inset by
 * `inset` so a stroke is not clipped at the edge. Pure, so the same outline can
 * be drawn on the canvas, in the palette and, later, by the SVG exporter.
 *
 * @param {string} shape
 * @param {number} width
 * @param {number} height
 * @param {number} [inset]
 * @returns {string}
 */
export function shapePath(shape, width, height, inset = 1) {
  const l = inset
  const t = inset
  const r = width - inset
  const b = height - inset
  const w = r - l
  const h = b - t
  const cx = l + w / 2
  const cy = t + h / 2

  switch (shape) {
    case SHAPE.TERMINAL: {
      const radius = h / 2
      return `M${l + radius},${t} H${r - radius} A${radius},${radius} 0 0 1 ${r - radius},${b} H${l + radius} A${radius},${radius} 0 0 1 ${l + radius},${t} Z`
    }
    case SHAPE.DECISION:
      return `M${cx},${t} L${r},${cy} L${cx},${b} L${l},${cy} Z`
    case SHAPE.DATA: {
      const slant = Math.min(w * 0.12, h * 0.5)
      return `M${l + slant},${t} H${r} L${r - slant},${b} H${l} Z`
    }
    case SHAPE.DATABASE: {
      const ry = Math.min(h * 0.12, 12)
      const rx = w / 2
      return `M${l},${t + ry} A${rx},${ry} 0 0 1 ${r},${t + ry} V${b - ry} A${rx},${ry} 0 0 1 ${l},${b - ry} Z M${l},${t + ry} A${rx},${ry} 0 0 0 ${r},${t + ry}`
    }
    case SHAPE.DOCUMENT: {
      const wave = Math.min(h * 0.12, 10)
      return `M${l},${t} H${r} V${b - wave} C${r - w / 4},${b - wave * 3} ${l + w / 4},${b + wave} ${l},${b - wave} Z`
    }
    case SHAPE.NOTE: {
      const fold = Math.min(w, h) * 0.18
      return `M${l},${t} H${r - fold} L${r},${t + fold} V${b} H${l} Z M${r - fold},${t} V${t + fold} H${r}`
    }
    case SHAPE.TEXT:
      return ''
    default: {
      const radius = Math.min(6, h / 4)
      return `M${l + radius},${t} H${r - radius} Q${r},${t} ${r},${t + radius} V${b - radius} Q${r},${b} ${r - radius},${b} H${l + radius} Q${l},${b} ${l},${b - radius} V${t + radius} Q${l},${t} ${l + radius},${t} Z`
    }
  }
}

/**
 * How far in from each side a shape's text must sit to stay inside the outline.
 * @param {string} shape
 * @param {number} width
 * @param {number} height
 * @returns {{ x: number, y: number }}
 */
export function textInset(shape, width, height) {
  switch (shape) {
    // Text in a diamond fits in the middle half.
    case SHAPE.DECISION:
      return { x: width / 4, y: height / 8 }
    case SHAPE.DATA:
      return { x: Math.min(width * 0.12, height * 0.5), y: 0 }
    case SHAPE.TERMINAL:
      return { x: height / 3, y: 0 }
    case SHAPE.DATABASE:
      return { x: 0, y: Math.min(height * 0.12, 12) }
    default:
      return { x: 0, y: 0 }
  }
}
