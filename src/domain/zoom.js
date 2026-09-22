/** Round stops, so stepping lands on readable numbers and passes through 100%. */
export const ZOOM_STOPS = Object.freeze([0.25, 0.5, 0.75, 1, 1.5, 2])

const EPSILON = 0.01

/**
 * The next stop in a direction, or the current zoom when there is none left.
 * A zoom between stops (from a fit or a pinch) steps to the neighbouring stop
 * rather than snapping backwards.
 *
 * @param {number} current
 * @param {1 | -1} direction
 * @returns {number}
 */
export function nextZoom(current, direction) {
  const stops = direction === 1 ? ZOOM_STOPS : [...ZOOM_STOPS].reverse()
  const next = stops.find((stop) =>
    direction === 1 ? stop > current + EPSILON : stop < current - EPSILON,
  )

  return next ?? current
}
