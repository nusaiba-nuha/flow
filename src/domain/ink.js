/**
 * Pen strokes: marks drawn by hand over the diagram. A stroke is stored as
 * points from 0 to 100 across its own box, so it moves and resizes like any
 * shape, and is drawn by scaling them to whatever size the box has.
 */

/** The box's padding around a stroke, so its line is never clipped. */
const PAD = 6
/** How far a point may stray from the line before it is kept, in pixels. */
const TOLERANCE = 1.5

/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * A stroke drawn on the canvas, in diagram coordinates, as a shape's box and
 * its points. Null for a tap, which draws nothing.
 *
 * @param {Point[]} drawn
 * @returns {{ position: Point, size: { width: number, height: number }, points: string } | null}
 */
export function strokeToInk(drawn) {
  const points = simplify(drawn, TOLERANCE)
  if (points.length < 2) return null

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs) - PAD
  const top = Math.min(...ys) - PAD
  const width = Math.max(...xs) - left + PAD
  const height = Math.max(...ys) - top + PAD
  if (width <= 2 * PAD + 2 && height <= 2 * PAD + 2) return null

  const scaled = points
    .map(({ x, y }) => `${tenth(((x - left) / width) * 100)},${tenth(((y - top) / height) * 100)}`)
    .join(' ')
  return {
    position: { x: Math.round(left), y: Math.round(top) },
    size: { width: Math.round(width), height: Math.round(height) },
    points: scaled,
  }
}

/**
 * Path data for a stroke in a `width` by `height` box, smoothed through the
 * midpoints so a few points still read as a hand-drawn curve.
 *
 * @param {string | undefined} points
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function inkPath(points, width, height) {
  const at = String(points ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.split(',').map(Number))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .map(([x, y]) => ({ x: tenth((x / 100) * width), y: tenth((y / 100) * height) }))
  if (at.length < 2) return ''
  if (at.length === 2) return `M${at[0].x},${at[0].y} L${at[1].x},${at[1].y}`

  const parts = [`M${at[0].x},${at[0].y}`]
  for (let index = 1; index < at.length - 1; index += 1) {
    const mid = {
      x: tenth((at[index].x + at[index + 1].x) / 2),
      y: tenth((at[index].y + at[index + 1].y) / 2),
    }
    parts.push(`Q${at[index].x},${at[index].y} ${mid.x},${mid.y}`)
  }
  const last = at[at.length - 1]
  parts.push(`L${last.x},${last.y}`)
  return parts.join(' ')
}

/**
 * Ramer-Douglas-Peucker: the fewest points that keep the stroke's shape.
 * @param {Point[]} points
 * @param {number} tolerance
 * @returns {Point[]}
 */
export function simplify(points, tolerance) {
  if (points.length < 3) return [...points]
  const first = points[0]
  const last = points[points.length - 1]
  let furthest = 0
  let index = 0
  for (let at = 1; at < points.length - 1; at += 1) {
    const distance = fromLine(points[at], first, last)
    if (distance > furthest) {
      furthest = distance
      index = at
    }
  }
  if (furthest <= tolerance) return [first, last]
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ]
}

/**
 * @param {Point} point
 * @param {Point} a
 * @param {Point} b
 */
function fromLine(point, a, b) {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (!length) return Math.hypot(point.x - a.x, point.y - a.y)
  return Math.abs((b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y)) / length
}

/** @param {number} value */
const tenth = (value) => Math.round(value * 10) / 10
