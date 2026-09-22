import { NODE_TYPE } from '@/domain/constants.js'
import AddCommentBody from './bodies/AddCommentBody.vue'
import SendMessageBody from './bodies/SendMessageBody.vue'

/**
 * Presentation half of the node registry, kept apart from `domain/nodeMeta.js`
 * so the domain stays free of Vue imports. A type with no entry renders no body,
 * which is correct for the trigger and the branch connectors.
 *
 * @type {Readonly<Record<string, import('vue').Component>>}
 */
export const detailComponents = Object.freeze({
  [NODE_TYPE.SEND_MESSAGE]: SendMessageBody,
  [NODE_TYPE.ADD_COMMENT]: AddCommentBody,
})

/** @param {string} type */
export const detailComponentFor = (type) => detailComponents[type] ?? null
