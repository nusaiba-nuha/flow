import { NODE_TYPE } from './constants.js'
import { FIELD_LIMIT, maxLength, required, validate, validateTimeRange } from './validators.js'
import { attachmentParts, dayLabel, textParts } from './format.js'

/**
 * Per-type body rules as pure functions, so they test without mounting anything
 * and the drawer needs no knowledge of what a type contains.
 *
 * @type {Readonly<Record<string, (data: import('./types.js').FlowNodeData) => string | null>>}
 */
const RULES = Object.freeze({
  [NODE_TYPE.SEND_MESSAGE]: (data) => {
    const texts = textParts(data.payload)
    if (!texts.length && !attachmentParts(data.payload).length) {
      return 'Add a message or an attachment.'
    }

    for (const [index, part] of texts.entries()) {
      const error = validate(part.text, [
        required(`Message ${index + 1}`),
        maxLength(`Message ${index + 1}`, FIELD_LIMIT.MESSAGE_MAX),
      ])
      if (error) return error
    }

    return null
  },

  [NODE_TYPE.ADD_COMMENT]: (data) =>
    validate(data.comment, [required('Comment'), maxLength('Comment', FIELD_LIMIT.COMMENT_MAX)]),

  [NODE_TYPE.DATE_TIME]: (data) => {
    if (!data.times?.length) return 'Add at least one day.'

    for (const slot of data.times) {
      const error = validateTimeRange(slot.startTime, slot.endTime)
      if (error) return `${dayLabel(slot.day)}: ${error}`
    }

    return data.timezone ? null : 'Select a timezone.'
  },
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
