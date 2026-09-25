import { describe, expect, it } from 'vitest'

import { alignBoxes, distributeBoxes } from '../arrange.js'

const boxes = [
  { id: 'a', x: 0, y: 0, width: 100, height: 50 },
  { id: 'b', x: 150, y: 40, width: 200, height: 80 },
  { id: 'c', x: 500, y: 10, width: 100, height: 50 },
]

describe('alignBoxes', () => {
  it('lines up edges with the outermost shape on that side', () => {
    expect(alignBoxes(boxes, 'left')).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 0, y: 40 },
      c: { x: 0, y: 10 },
    })
    expect(alignBoxes(boxes, 'bottom')).toEqual({
      a: { x: 0, y: 70 },
      b: { x: 150, y: 40 },
      c: { x: 500, y: 70 },
    })
  })

  it('centres shapes on the selection, whatever their sizes', () => {
    expect(alignBoxes(boxes, 'center')).toEqual({
      a: { x: 250, y: 0 },
      b: { x: 200, y: 40 },
      c: { x: 250, y: 10 },
    })
    expect(alignBoxes(boxes, 'middle').b).toEqual({ x: 150, y: 20 })
  })

  it('needs two shapes and a known side', () => {
    expect(alignBoxes(boxes.slice(0, 1), 'left')).toEqual({})
    expect(alignBoxes(boxes, 'diagonal')).toEqual({})
  })
})

describe('distributeBoxes', () => {
  it('leaves equal gaps, keeping the outermost shapes where they are', () => {
    const positions = distributeBoxes(boxes, 'horizontal')

    // 600 wide, 400 of it shapes: two gaps of 100.
    expect(positions).toEqual({ a: { x: 0, y: 0 }, b: { x: 200, y: 40 }, c: { x: 500, y: 10 } })
    expect(distributeBoxes(boxes.slice(0, 2), 'vertical')).toEqual({})
  })
})
