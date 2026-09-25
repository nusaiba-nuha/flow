import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import payload from '@/tests/fixtures/diagram.json'
import { normaliseNode } from '@/domain/graph.js'
import FlowNodeCard from '../FlowNodeCard.vue'
import BranchPill from '../BranchPill.vue'

const nodes = Object.fromEntries(payload.map((raw) => [String(raw.id), normaliseNode(raw)]))

/** Handle needs Vue Flow's injected store, which a unit test has no business providing. */
const global = { stubs: { Handle: true } }

const render = (node, props = {}) =>
  mount(FlowNodeCard, { props: { id: node.id, data: { node }, ...props }, global })

describe('FlowNodeCard', () => {
  it('falls back to the registry summary, and truncates a long description', () => {
    expect(render(nodes['d09c08']).text()).toContain('09:00 - 17:00 - UTC')

    const described = { ...nodes['e879e4'], data: { description: 'x'.repeat(200) } }
    const text = render(described).text()
    expect(text).toContain('...')
    expect(text.length).toBeLessThan(200)
  })

  it('offers a pointer cursor only on nodes that can be opened', () => {
    expect(render(nodes['b6a0c1']).classes()).toContain('cursor-pointer')
    expect(render(nodes['1']).classes()).toContain('cursor-default')
  })
})

describe('BranchPill', () => {
  it('labels a connector and renders nothing clickable', () => {
    const pill = mount(BranchPill, { props: { data: { node: nodes['161f52'] } }, global })

    expect(pill.text()).toBe('Success')
    expect(pill.find('button').exists()).toBe(false)
  })
})
