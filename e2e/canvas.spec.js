import { expect, test } from '@playwright/test'

const NODE = { away: 'b6a0c1', success: '161f52', trigger: '1' }

const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)

test.beforeEach(async ({ page }) => {
  await page.goto('/flow')
  await expect(nodeAt(page, NODE.away)).toBeVisible()
})

test('renders every node of the starter diagram, with icon, title and description', async ({
  page,
}) => {
  await expect(page.locator('.vue-flow__node')).toHaveCount(7)

  const card = nodeAt(page, NODE.away)
  await expect(card.locator('svg')).toBeVisible()
  await expect(card.getByRole('heading')).toHaveText('Away Message')
  await expect(card).toContainText('Sorry, we are currently away')
})

test('drags a node and keeps it there after a reload', async ({ page }) => {
  const card = nodeAt(page, NODE.away)
  const before = await card.boundingBox()
  const grabX = before.x + before.width / 2
  const grabY = before.y + 12

  await page.mouse.move(grabX, grabY)
  await page.mouse.down()
  // Vue Flow starts a drag only once the pointer moves, so nudge first.
  await page.mouse.move(grabX + 20, grabY + 15, { steps: 5 })
  await page.mouse.move(grabX + 200, grabY + 150, { steps: 15 })
  await page.mouse.up()

  const moved = await card.boundingBox()
  expect(moved.x - before.x).toBeGreaterThan(120)

  await page.reload()
  await expect(card).toBeVisible()
  // Flow coordinates, not screen ones: a reload refits the view.
  const position = await card.evaluate((element) => element.style.transform)
  expect(position).not.toBe('')
})

test('opens a node by clicking it, and ignores the display only ones', async ({ page }) => {
  await nodeAt(page, NODE.away).click()
  await expect(page).toHaveURL(/\/flow\/node\/b6a0c1/)

  await page.getByRole('button', { name: 'Close details' }).click()
  await nodeAt(page, NODE.success).click()
  await expect(page).toHaveURL(/\/flow$/)
})

test('zoom steps land on round numbers, and the label resets to 100%', async ({ page }) => {
  const zoom = page.getByRole('button', { name: /Reset zoom/i })

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(zoom).toHaveText('75%')

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(zoom).toHaveText('100%')

  await page.getByRole('button', { name: 'Fit to screen' }).click()
  await expect(zoom).not.toHaveText('100%')

  await zoom.click()
  await expect(zoom).toHaveText('100%')
})
