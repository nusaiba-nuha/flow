import { NODE_TYPE } from './constants.js'
import { FIELD_LIMIT, maxLength, required, validate } from './validators.js'

/**
 * Per-type body rules as pure functions, so they test without mounting anything
 * and the drawer needs no knowledge of what a type contains.
 *
 * @type {Readonly<Record<string, (data: import('./types.js').FlowNodeData) => string | null>>}
 */
const RULES = Object.freeze({
  [NODE_TYPE.ADD_COMMENT]: (data) =>
    validate(data.comment, [required('Comment'), maxLength('Comment', FIELD_LIMIT.COMMENT_MAX)]),
})

/**
 * @param {string} type
 * @param {import('./types.js').FlowNodeData} data
 * @returns {string | null} the first problem, or null
 */
export function validateNodeData(type, data) {
  const rule = RULES[type]
  return rule ? rule(data ?? {}) : null
}
