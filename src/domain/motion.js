/** Fraction of the visible area kept clear of the edges before a pan is worth it. */
const MARGIN = 0.08

/**
 * Whether a node already sits comfortably in view, in which case moving the
 * canvas is noise: clicking a node the user can see should not lurch the screen.
 *
 * @param {{ x: number, y: number, width: number, height: number }} node in screen pixels
 * @param {{ width: number, height: number }} view the space not covered by the drawer
 * @returns {boolean}
 */
export function isInView(node, view) {
  const insetX = view.width * MARGIN
  const insetY = view.height * MARGIN

  return (
    node.x >= insetX &&
    node.y >= insetY &&
    node.x + node.width <= view.width - insetX &&
    node.y + node.height <= view.height - insetY
  )
}

/**
 * A short move should feel instant and a long one should not feel like a jump,
 * so the duration follows the distance rather than being fixed.
 *
 * @param {number} distance in pixels
 * @returns {number} milliseconds
 */
export function panDuration(distance) {
  return Math.round(Math.min(560, Math.max(220, distance * 0.55)))
}
