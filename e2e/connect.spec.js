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

/** The canvas eases into place, so coordinates are only safe once it stops. */
async function whenStill(locator) {
  let previous = null
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const box = await locator.boundingBox()
    if (previous && Math.abs(box.x - previous.x) < 0.5 && Math.abs(box.y - previous.y) < 0.5) {
      return box
    }
    previous = box
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return previous
}

/**
 * The remove control appears while the edge is hovered. Hovering the edge's own hit
 * path lets Playwright wait for the element, rather than us computing a point on a
 * canvas that may still be easing.
 */
async function removeControl(page, edgeId) {
  // Forced: the control appears under the cursor, and Playwright would otherwise
  // retry the hover forever because the button it just revealed is in the way.
  await page
    .locator(`.vue-flow__edge[data-id="${edgeId}"] [data-testid="edge-hit-area"]`)
    .hover({ force: true })

  return page.getByRole('button', { name: 'Remove this connection' }).first()
}

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
  await (await removeControl(page, 'e-b6a0c1')).click()
  await expect.poll(() => parentOf(page, 'b6a0c1')).toBe('-1')
  expect(await drawnEdges(page)).toBe(5)

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => parentOf(page, 'b6a0c1')).toBe('28c4b9')
  await expect.poll(() => drawnEdges(page)).toBe(6)
})

test('leaves the node where it was when its connection goes', async ({ page }) => {
  const before = await node(page, 'b6a0c1').boundingBox()

  await (await removeControl(page, 'e-b6a0c1')).click()
  await expect.poll(() => parentOf(page, 'b6a0c1')).toBe('-1')

  const after = await node(page, 'b6a0c1').boundingBox()
  expect(Math.abs(after.y - before.y)).toBeLessThan(4)
  expect(Math.abs(after.x - before.x)).toBeLessThan(4)
})

test('draws the edge at once when a created node is connected', async ({ page }) => {
  await page.getByRole('button', { name: 'Create new node' }).click()
  await page.getByLabel('Title').fill('Standalone')
  await page.getByLabel('Type of node').selectOption('sendMessage')
  await page.getByRole('button', { name: 'Create node' }).click()
  await page.waitForURL(/\/flow\/node\//)

  const created = page.url().split('/').pop()
  await page.getByRole('button', { name: 'Close details' }).click()
  expect(await drawnEdges(page)).toBe(6)

  await whenStill(node(page, created))
  const from = await node(page, 'b6a0c1').locator('.vue-flow__handle-bottom').boundingBox()
  const to = await node(page, created).boundingBox()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + 6, { steps: 14 })
  await page.mouse.up()

  // No reload: the edge has to appear on its own.
  await expect.poll(() => drawnEdges(page)).toBe(7)
  await expect.poll(() => parentOf(page, created)).toBe('b6a0c1')
})
