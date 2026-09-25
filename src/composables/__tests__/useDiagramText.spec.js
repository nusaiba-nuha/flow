import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import * as flowApi from '@/api/flowApi.js'
import { flowKeys } from '@/api/queryKeys.js'
import { useFlowHistory } from '../useFlowHistory.js'
import { useMoveNode } from '../useNodeMutations.js'
import { useDiagramText } from '../useDiagramText.js'
import { withSetup, waitUntil } from '@/tests/utils.js'

const documentIn = (queryClient) => queryClient.getQueryData(flowKeys.list())

beforeEach(() => {
  setActivePinia(createPinia())
  flowApi.resetFlow()
})

async function setup() {
  const setup = withSetup(() => ({
    text: useDiagramText(),
    history: useFlowHistory(),
    move: useMoveNode(),
  }))
  await waitUntil(() => setup.result.text.text.value.includes('Away Message'))
  return setup
}

describe('useDiagramText', () => {
  it('shows the diagram as text once it loads', async () => {
    const { result } = await setup()

    expect(result.text.text.value).toMatch(/^title: Support flow\n/)
    expect(result.text.text.value).toContain('d09c08 -> b0653a : Success')
  })

  it('applies a valid edit after a pause, as one undoable change', async () => {
    const { result, queryClient } = await setup()

    result.text.focus()
    result.text.input(`${result.text.text.value}\nextra = note "Added as text"`)
    await waitUntil(() => documentIn(queryClient).nodes.some((node) => node.id === 'extra'))

    expect(result.history.history.undoLabel).toBe('Edit as text')
  })

  it('keeps the last good diagram and reports the line while the text is wrong', async () => {
    const { result, queryClient } = await setup()
    const before = documentIn(queryClient)

    result.text.focus()
    result.text.input('a = hexagon "A"\nb -> a')
    await waitUntil(() => result.text.errors.value.length > 0)

    expect(result.text.errors.value.map((error) => error.line)).toEqual([1, 2])
    expect(documentIn(queryClient)).toEqual(before)
  })

  it('does not rewrite the text while it has focus, and tidies it on blur', async () => {
    const { result, queryClient } = await setup()

    result.text.focus()
    const typed = result.text.text.value.replace('d09c08 -> b0653a : Success', 'd09c08->b0653a:Yes')
    result.text.input(typed)
    await waitUntil(() => documentIn(queryClient).edges.some((edge) => edge.label === 'Yes'))

    // Applied, but the text is still exactly what was typed.
    expect(result.text.text.value).toBe(typed)

    result.text.blur()
    expect(result.text.text.value).toContain('d09c08 -> b0653a : Yes')
  })

  it('follows changes made on the canvas', async () => {
    const { result } = await setup()

    result.move.mutate({ id: 'b6a0c1', position: { x: 512, y: 64 } })
    await waitUntil(() => result.text.text.value.includes('b6a0c1 512,64'))

    expect(result.text.text.value).toMatch(/@layout\n(.*\n)*b6a0c1 512,64/)
  })

  it('sends nothing for an edit that changes nothing', async () => {
    const { result } = await setup()

    result.text.focus()
    result.text.input(`${result.text.text.value}\n# just a comment`)
    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(result.history.history.canUndo).toBe(false)
  })
})
