import rough from 'roughjs'

/**
 * The hand-drawn look: the same outlines, redrawn with a wobble by Rough.js,
 * the library Excalidraw draws with. Each shape's wobble is seeded by its id,
 * so a diagram looks the same on every render, in the app and in SVG.
 */

export const STYLE = Object.freeze({ CLEAN: 'clean', SKETCH: 'sketch' })

/** Handwritten, but easy to read; the fallbacks are for an SVG opened elsewhere. */
export const SKETCH_FONT = "'Patrick Hand', 'Comic Sans MS', 'Segoe Print', cursive"

const generator = rough.generator()

/** @type {Map<string, string>} */
const cache = new Map()
const CACHE_LIMIT = 2000

/**
 * @param {import('./types.js').FlowDocument | null | undefined} document
 * @returns {boolean}
 */
export const isSketch = (document) => document?.style === STYLE.SKETCH

/**
 * A stable seed from any string, since Rough.js wants a positive integer.
 * @param {string} text
 * @returns {number}
 */
export function seedFor(text) {
  let hash = 2166136261
  for (const char of String(text)) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 2147483646 || 1
}

/**
 * Path data redrawn by hand: a stroke only, to lay over the clean shape's fill.
 *
 * @param {string} d the clean path
 * @param {string} key seeds the wobble; the shape's or edge's id
 * @returns {string}
 */
export function sketchPath(d, key) {
  if (!d) return ''
  const id = `${key}\u0000${d}`
  const known = cache.get(id)
  if (known !== undefined) return known

  const drawn = generator
    .toPaths(
      generator.path(d, {
        seed: seedFor(key),
        roughness: 1.1,
        bowing: 1,
        // Corners meet where they should, so a shape still reads as that shape.
        preserveVertices: true,
      }),
    )
    .map((path) => path.d)
    .join(' ')
    // A tenth of a pixel is finer than any screen shows, and keeps files small.
    .replace(/-?\d+\.\d+/g, (number) => String(Math.round(Number(number) * 10) / 10))

  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(id, drawn)
  return drawn
}
