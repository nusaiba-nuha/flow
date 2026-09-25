import architecture from './samples/architecture.json'
import support from './samples/support.json'

/**
 * @typedef {Object} Sample
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {import('./types.js').FlowDocument} document
 */

/**
 * Diagrams to start from. Stored in the current document format, and read
 * through `migrate()` like anything else, so a format change cannot strand one.
 *
 * @type {readonly Sample[]}
 */
export const SAMPLES = Object.freeze([
  {
    id: 'architecture',
    title: 'Web app architecture',
    description: 'Services, stores and the lines between them',
    document: architecture,
  },
  {
    id: 'support',
    title: 'Support flow',
    description: 'A decision with labelled branches',
    document: support,
  },
])

/** The diagram a first visit opens with. */
export const FIRST_RUN_SAMPLE = 'support'

/** @param {string} id */
export const sampleById = (id) => SAMPLES.find((sample) => sample.id === id) ?? null
