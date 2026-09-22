/** Factories, not literals: a key cannot be misspelled at a call site. */
export const flowKeys = Object.freeze({
  all: ['flow'],
  list: () => ['flow', 'list'],
})
