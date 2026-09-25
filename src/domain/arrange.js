/**
 * Align and distribute a selection, as positions to move to. Pure, over the
 * boxes the canvas measured, so a shape's real size decides where it lines up.
 *
 * @typedef {{ id: string, x: number, y: number, width: number, height: number }} ArrangeBox
 * @typedef {Record<string, { x: number, y: number }>} Positions
 */

export const ALIGN = Object.freeze({
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  TOP: 'top',
  MIDDLE: 'middle',
  BOTTOM: 'bottom',
})

/** The spacing of the canvas's dots, which dragged shapes snap to. */
export const GRID = 18

/**
 * Every box lined up with the outermost one on that side, or with the
 * selection's centre line.
 * @param {ArrangeBox[]} boxes
 * @param {string} mode one of ALIGN
 * @returns {Positions}
 */
export function alignBoxes(boxes, mode) {
  if (boxes.length < 2) return {}
  const left = Math.min(...boxes.map((box) => box.x))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const top = Math.min(...boxes.map((box) => box.y))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))

  /** @type {Record<string, (box: ArrangeBox) => { x: number, y: number }>} */
  const places = {
    [ALIGN.LEFT]: (box) => ({ x: left, y: box.y }),
    [ALIGN.CENTER]: (box) => ({ x: (left + right) / 2 - box.width / 2, y: box.y }),
    [ALIGN.RIGHT]: (box) => ({ x: right - box.width, y: box.y }),
    [ALIGN.TOP]: (box) => ({ x: box.x, y: top }),
    [ALIGN.MIDDLE]: (box) => ({ x: box.x, y: (top + bottom) / 2 - box.height / 2 }),
    [ALIGN.BOTTOM]: (box) => ({ x: box.x, y: bottom - box.height }),
  }
  const place = places[mode]
  if (!place) return {}

  return Object.fromEntries(boxes.map((box) => [box.id, rounded(place(box))]))
}

/**
 * Equal gaps between boxes along one axis, the outermost two staying put.
 * @param {ArrangeBox[]} boxes
 * @param {'horizontal' | 'vertical'} axis
 * @returns {Positions}
 */
export function distributeBoxes(boxes, axis) {
  if (boxes.length < 3) return {}
  const horizontal = axis === 'horizontal'
  const start = (/** @type {ArrangeBox} */ box) => (horizontal ? box.x : box.y)
  const length = (/** @type {ArrangeBox} */ box) => (horizontal ? box.width : box.height)

  const sorted = [...boxes].sort((a, b) => start(a) - start(b))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const span = start(last) + length(last) - start(first)
  const gap = (span - sorted.reduce((sum, box) => sum + length(box), 0)) / (sorted.length - 1)

  let at = start(first)
  return Object.fromEntries(
    sorted.map((box) => {
      const position = horizontal ? { x: at, y: box.y } : { x: box.x, y: at }
      at += length(box) + gap
      return [box.id, rounded(position)]
    }),
  )
}

/** @param {{ x: number, y: number }} position */
const rounded = ({ x, y }) => ({ x: Math.round(x), y: Math.round(y) })
