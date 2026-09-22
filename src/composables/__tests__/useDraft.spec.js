import { describe, expect, it } from 'vitest'
import { computed, nextTick, ref } from 'vue'

import { maxLength, required } from '@/domain/validators.js'
import { useDraft } from '../useDraft.js'

const rules = { name: [required('Title'), maxLength('Title', 10)] }

const sourceOf = (node) => {
  const current = ref(node)
  return { current, source: computed(() => current.value) }
}

describe('useDraft', () => {
  it('hides errors until the field is touched', () => {
    const { source } = sourceOf({ id: '1', name: '' })
    const draft = useDraft(source, rules)

    expect(draft.errors.value.name).toBeNull()
    expect(draft.isValid.value).toBe(false)

    draft.touch('name')
    expect(draft.errors.value.name).toMatch(/required/i)
  })

  it('reports dirty against the source and resets back to it', () => {
    const { source } = sourceOf({ id: '1', name: 'Away' })
    const draft = useDraft(source, rules)
    expect(draft.isDirty.value).toBe(false)

    draft.draft.name = 'Away Message'
    expect(draft.isDirty.value).toBe(true)

    draft.reset()
    expect(draft.draft.name).toBe('Away')
    expect(draft.isDirty.value).toBe(false)
  })

  it('re-seeds for a different node but leaves an open edit alone', async () => {
    const { current, source } = sourceOf({ id: '1', name: 'Away' })
    const draft = useDraft(source, rules)

    draft.draft.name = 'Typing'
    current.value = { id: '1', name: 'Away renamed' }
    await nextTick()
    expect(draft.draft.name).toBe('Typing')

    current.value = { id: '2', name: 'Welcome' }
    await nextTick()
    expect(draft.draft.name).toBe('Welcome')
  })
})
