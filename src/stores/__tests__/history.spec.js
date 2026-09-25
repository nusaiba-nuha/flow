import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useHistoryStore } from '../history.js'

const doc = (title) => ({ version: 3, title, nodes: [], edges: [] })

beforeEach(() => setActivePinia(createPinia()))

describe('history', () => {
  it('forgets the entry of a change that failed, and only that one', () => {
    const history = useHistoryStore()
    const first = history.record('Add shape', doc('a'))
    const failed = history.record('Delete node', doc('b'))

    history.discard(failed)

    expect(history.undoLabel).toBe('Add shape')
    history.discard(null)
    history.discard(first)
    expect(history.canUndo).toBe(false)
  })

  it('clears redo when a new change is made', () => {
    const history = useHistoryStore()
    history.record('Add shape', doc('a'))
    history.takeUndo(doc('b'))
    expect(history.canRedo).toBe(true)

    history.record('Move shape', doc('a'))
    expect(history.canRedo).toBe(false)
  })
})
