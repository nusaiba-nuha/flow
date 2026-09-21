/** @typedef {'trigger'|'sendMessage'|'dateTime'|'dateTimeConnector'|'addComment'} NodeType */
export const NODE_TYPE = Object.freeze({
  TRIGGER: 'trigger',
  SEND_MESSAGE: 'sendMessage',
  DATE_TIME: 'dateTime',
  DATE_TIME_CONNECTOR: 'dateTimeConnector',
  ADD_COMMENT: 'addComment',
})

export const MESSAGE_PART = Object.freeze({
  TEXT: 'text',
  ATTACHMENT: 'attachment',
})

export const CONNECTOR_TYPE = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
})

/** A string, because ids are normalised to strings. */
export const ROOT_PARENT_ID = '-1'

export const WEEKDAYS = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])

/** @type {Readonly<Record<string, string>>} Annotated, or indexing by a string is rejected. */
export const WEEKDAY_LABEL = Object.freeze({
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
})

/** Shared by the layout function and the node card. */
export const NODE_SIZE = Object.freeze({ WIDTH: 232, HEIGHT: 104 })
export const NODE_GAP = Object.freeze({ X: 44, Y: 72 })

export const DESCRIPTION_PREVIEW_LENGTH = 90
