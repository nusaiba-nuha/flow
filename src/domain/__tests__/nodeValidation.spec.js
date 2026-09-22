import { describe, expect, it } from 'vitest'

import { NODE_TYPE } from '../constants.js'
import { FIELD_LIMIT } from '../validators.js'
import { validateNodeData } from '../nodeValidation.js'

describe('validateNodeData', () => {
  it('requires a comment and caps its length', () => {
    expect(validateNodeData(NODE_TYPE.ADD_COMMENT, { comment: 'Looks fine' })).toBeNull()
    expect(validateNodeData(NODE_TYPE.ADD_COMMENT, { comment: '  ' })).toMatch(/required/i)
    expect(
      validateNodeData(NODE_TYPE.ADD_COMMENT, { comment: 'x'.repeat(FIELD_LIMIT.COMMENT_MAX + 1) }),
    ).toMatch(/500 characters or fewer/i)
  })

  it('passes types that have no body rules', () => {
    expect(validateNodeData(NODE_TYPE.TRIGGER, {})).toBeNull()
    expect(validateNodeData(NODE_TYPE.ADD_COMMENT, undefined)).toMatch(/required/i)
  })
})
