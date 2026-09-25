import { describe, expect, it } from 'vitest'

import { routeEdge } from '../routes.js'

const box = (x, y) => ({ x, y, width: 100, height: 50 })

describe('routeEdge', () => {
  it('runs down from the bottom of a shape to the top of one below, in steps', () => {
    const route = routeEdge(box(0, 0), box(200, 150))

    expect(route).toMatchObject({ from: 'bottom', to: 'top' })
    expect(route.d).toBe('M50,50 V100 H250 V150')
    expect(route.label).toEqual({ x: 150, y: 100 })
  })

  it('runs up to a shape above, and across to one beside', () => {
    expect(routeEdge(box(0, 200), box(0, 0))).toMatchObject({ from: 'top', to: 'bottom' })
    expect(routeEdge(box(0, 0), box(300, 10))).toMatchObject({
      from: 'right',
      to: 'left',
      d: 'M100,25 H200 V35 H300',
    })
    expect(routeEdge(box(300, 0), box(0, 0))).toMatchObject({ from: 'left', to: 'right' })
  })

  it('draws the same ends straight or curved', () => {
    expect(routeEdge(box(0, 0), box(0, 150), 'straight').d).toBe('M50,50 L50,150')
    expect(routeEdge(box(0, 0), box(0, 150), 'curved').d).toBe('M50,50 C50,100 50,100 50,150')
  })
})
