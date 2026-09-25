import { expect, test } from '@playwright/test'

const NODE = { away: 'b6a0c1', hours: 'd09c08' }

const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const titleField = (page) => page.getByLabel('Title')

test('opens the drawer straight from a URL, with the node highlighted', async ({ page }) => {
  await page.goto(`/flow/node/${NODE.away}`)

  await expect(titleField(page)).toHaveValue('Away Message')
  await expect(nodeAt(page, NODE.away)).toHaveClass(/selected/)
})

test('saves an edited title and keeps it across a reload', async ({ page }) => {
  await page.goto(`/flow/node/${NODE.away}`)

  await titleField(page).fill('Away Message v2')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(nodeAt(page, NODE.away)).toContainText('Away Message v2')

  await page.reload()
  await expect(titleField(page)).toHaveValue('Away Message v2')
})

test('deletes a node behind a confirmation and keeps its neighbours', async ({ page }) => {
  await page.goto(`/flow/node/${NODE.away}`)

  await page.getByRole('button', { name: 'Delete node' }).click()
  await page.getByRole('button', { name: 'Confirm delete' }).click()

  await expect(page).toHaveURL(/\/flow$/)
  await expect(nodeAt(page, NODE.away)).toHaveCount(0)
  // The comment it pointed at survives; only the edges between them go.
  await expect(nodeAt(page, 'e879e4')).toBeVisible()
})

test('shows the business hours week and refuses an impossible range', async ({ page }) => {
  await page.goto(`/flow/node/${NODE.hours}`)

  await expect(page.locator('li')).toHaveCount(7)
  await page.getByLabel('Mon start time').fill('18:00')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('alert')).toContainText('End time must be after start time')
})
