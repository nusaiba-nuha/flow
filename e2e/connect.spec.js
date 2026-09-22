import { expect, test } from '@playwright/test'

const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)

/** Edges are hidden rather than removed, so count the drawn ones. */
const drawnEdges = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('.vue-flow__edge')].filter(
        (edge) => edge.style.display !== 'none',
      ).length,
  )

const parentOf = (page, id) =>
  page.evaluate((nodeId) => {
    const key = Object.keys(localStorage).find((name) => name.startsWith('flow-builder:flow'))
    return String(
      JSON.parse(localStorage.getItem(key)).find((item) => String(item.id) === nodeId).parentId,
    )
  }, id)

/** The midpoint of an edge, which is where its remove control sits. */
const edgeMidpoint = (page, edgeId) =>
  page.evaluate((id) => {
    const path = document.querySelector(`.vue-flow__edge[data-id="${id}"] .vue-flow__edge-path`)
    const at = path.getPointAtLength(path.getTotalLength() / 2)
    const point = path.ownerSVGElement.createSVGPoint()
    point.x = at.x
    point.y = at.y
    const screen = point.matrixTransform(path.getScreenCTM())
    return { x: screen.x, y: screen.y }
  }, edgeId)

test.beforeEach(async ({ page }) => {
  await page.goto('/flow')
  await expect(node(page, 'b6a0c1')).toBeVisible()
})

test('drags between nodes to set a parent, and keeps every other edge', async ({ page }) => {
  expect(await drawnEdges(page)).toBe(6)

  const from = await node(page, 'e879e4').locator('.vue-flow__handle-bottom').boundingBox()
  const to = await node(page, 'b0653a').boundingBox()

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + 6, { steps: 14 })
  await page.mouse.up()

  await expect.poll(() => parentOf(page, 'b0653a')).toBe('e879e4')
  expect(await drawnEdges(page)).toBe(6)
})

test('removes a connection from the edge, and undo puts it back', async ({ page }) => {
  const point = await edgeMidpoint(page, 'e-b6a0c1')
  await page.mouse.click(point.x, point.y)

  await page.getByRole('button', { name: 'Remove this connection' }).first().click()
  await expect.poll(() => parentOf(page, 'b6a0c1')).toBe('-1')
  expect(await drawnEdges(page)).toBe(5)

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => parentOf(page, 'b6a0c1')).toBe('28c4b9')
  await expect.poll(() => drawnEdges(page)).toBe(6)
})

test('leaves the node where it was when its connection goes', async ({ page }) => {
  const before = await node(page, 'b6a0c1').boundingBox()

  const point = await edgeMidpoint(page, 'e-b6a0c1')
  await page.mouse.click(point.x, point.y)
  await page.getByRole('button', { name: 'Remove this connection' }).first().click()
  await expect.poll(() => parentOf(page, 'b6a0c1')).toBe('-1')

  const after = await node(page, 'b6a0c1').boundingBox()
  expect(Math.abs(after.y - before.y)).toBeLessThan(4)
  expect(Math.abs(after.x - before.x)).toBeLessThan(4)
})
