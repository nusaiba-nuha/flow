import { expect, test } from '@playwright/test'

const palette = (page) => page.getByRole('complementary', { name: 'Shapes' })
const shapeButton = (page, label) => palette(page).getByRole('button', { name: label, exact: true })
const shapes = (page) => page.locator('.vue-flow__node')
const openId = (page) => page.url().split('/').pop()

test.beforeEach(async ({ page }) => {
  await page.goto('/flow')
  await expect(shapes(page)).toHaveCount(5)
})

test('adds a shape on click, and opens it to be named', async ({ page }) => {
  await shapeButton(page, 'Decision').click()

  await expect(page).toHaveURL(/\/flow\/node\//)
  await expect(page.getByLabel('Title')).toHaveValue('Decision')
  await expect(shapes(page)).toHaveCount(6)

  await page.getByLabel('Title').fill('In stock?')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator(`.vue-flow__node[data-id="${openId(page)}"]`)).toContainText(
    'In stock?',
  )
})

test('drops a dragged shape where it was let go', async ({ page }) => {
  const pane = await page.locator('.vue-flow__pane').boundingBox()
  const drop = { x: Math.round(pane.width * 0.2), y: Math.round(pane.height * 0.6) }

  // Where that point is in the diagram, from the viewport transform before the drop.
  const transform = await page.locator('.vue-flow__transformationpane').evaluate((element) => {
    const [x, y, zoom] = element.style.transform.match(/-?[\d.]+/g).map(Number)
    return { x, y, zoom }
  })
  const expected = {
    x: (drop.x - transform.x) / transform.zoom,
    y: (drop.y - transform.y) / transform.zoom,
  }

  await shapeButton(page, 'Database').dragTo(page.locator('.vue-flow__pane'), {
    targetPosition: drop,
  })
  await page.waitForURL(/\/flow\/node\//)
  const id = openId(page)

  const saved = await page.evaluate(
    (nodeId) =>
      JSON.parse(localStorage.getItem('flow:document')).nodes.find((node) => node.id === nodeId),
    id,
  )
  expect(saved.type).toBe('database')
  // Centred on the pointer: the stored corner is half a shape up and left of it.
  expect(Math.abs(saved.position.x + 116 - expected.x)).toBeLessThan(2)
  expect(Math.abs(saved.position.y + 52 - expected.y)).toBeLessThan(2)
})

test('adds a shape from the keyboard', async ({ page }) => {
  await shapeButton(page, 'Note').focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/flow\/node\//)
  await expect(page.getByLabel('Title')).toHaveValue('Note')
})

test('brings an added shape into view, clear of the drawer', async ({ page }) => {
  // Twice: the first one could land in view by luck.
  for (const shape of ['Process', 'Document']) {
    await page.goto('/flow')
    await shapeButton(page, shape).click()
    await page.waitForURL(/\/flow\/node\//)

    const card = page.locator(`.vue-flow__node[data-id="${openId(page)}"]`)
    await expect(card).toBeVisible()

    const viewport = page.viewportSize()
    await expect
      .poll(async () => {
        const box = await card.boundingBox()
        return (
          box.y >= 0 &&
          box.y + box.height <= viewport.height &&
          // 380 is the drawer, which opens over the right of the canvas.
          box.x + box.width <= viewport.width - 380
        )
      })
      .toBe(true)
  }
})
