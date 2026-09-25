/**
 * Where a connection runs between two shapes, shared by the canvas and the SVG
 * renderer so both draw the same line. It leaves from the side that faces the
 * other shape: down to a shape below, across to one beside it.
 *
 * @typedef {{ x: number, y: number, width: number, height: number }} Box
 * @typedef {'top' | 'right' | 'bottom' | 'left'} Side
 * @typedef {{ d: string, label: { x: number, y: number }, from: Side, to: Side }} Route
 */

export const LINE = Object.freeze({ STEP: 'step', CURVED: 'curved', STRAIGHT: 'straight' })

/** @type {readonly string[]} */
export const LINES = Object.freeze(Object.values(LINE))

/** Shapes closer than this, one above the other, connect side to side instead. */
const MIN_GAP = 16

/** @param {number} value */
const round = (value) => Math.round(value * 10) / 10

/**
 * @param {Box} from
 * @param {Box} to
 * @param {string} [line] one of LINES; anything else is a step
 * @returns {Route}
 */
export function routeEdge(from, to, line = LINE.STEP) {
  const below = to.y - (from.y + from.height)
  const above = from.y - (to.y + to.height)
  const vertical = below >= MIN_GAP || above >= MIN_GAP
  const down = below >= MIN_GAP
  const right = to.x + to.width / 2 >= from.x + from.width / 2

  /** @type {[Side, Side]} */
  const sides = vertical
    ? down
      ? ['bottom', 'top']
      : ['top', 'bottom']
    : right
      ? ['right', 'left']
      : ['left', 'right']
  const start = anchor(from, sides[0])
  const end = anchor(to, sides[1])
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }

  let d
  if (line === LINE.STRAIGHT) {
    d = `M${round(start.x)},${round(start.y)} L${round(end.x)},${round(end.y)}`
  } else if (line === LINE.CURVED) {
    const pull = Math.max(24, Math.abs(vertical ? end.y - start.y : end.x - start.x) / 2)
    const [c1, c2] = vertical
      ? [
          { x: start.x, y: start.y + (down ? pull : -pull) },
          { x: end.x, y: end.y + (down ? -pull : pull) },
        ]
      : [
          { x: start.x + (right ? pull : -pull), y: start.y },
          { x: end.x + (right ? -pull : pull), y: end.y },
        ]
    d = `M${round(start.x)},${round(start.y)} C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(end.x)},${round(end.y)}`
  } else {
    d = vertical
      ? `M${round(start.x)},${round(start.y)} V${round(middle.y)} H${round(end.x)} V${round(end.y)}`
      : `M${round(start.x)},${round(start.y)} H${round(middle.x)} V${round(end.y)} H${round(end.x)}`
  }

  return { d, label: { x: round(middle.x), y: round(middle.y) }, from: sides[0], to: sides[1] }
}

/**
 * The middle of one side of a box.
 * @param {Box} box
 * @param {Side} side
 */
function anchor(box, side) {
  if (side === 'top') return { x: box.x + box.width / 2, y: box.y }
  if (side === 'bottom') return { x: box.x + box.width / 2, y: box.y + box.height }
  if (side === 'left') return { x: box.x, y: box.y + box.height / 2 }
  return { x: box.x + box.width, y: box.y + box.height / 2 }
}
