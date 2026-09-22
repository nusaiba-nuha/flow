import { NODE_TYPE } from '@/domain/constants.js'
import FlowNodeCard from './FlowNodeCard.vue'
import BranchPill from './BranchPill.vue'

/** Two shapes, not five: card nodes differ only in registry data. */
export const nodeComponents = Object.freeze({
  [NODE_TYPE.TRIGGER]: FlowNodeCard,
  [NODE_TYPE.SEND_MESSAGE]: FlowNodeCard,
  [NODE_TYPE.ADD_COMMENT]: FlowNodeCard,
  [NODE_TYPE.DATE_TIME]: FlowNodeCard,
  [NODE_TYPE.DATE_TIME_CONNECTOR]: BranchPill,
})
