import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/flow')
  await page.getByRole('button', { name: 'Create new node' }).click()
})

test('refuses an empty form, then creates the node and opens it', async ({ page }) => {
  await page.getByRole('button', { name: 'Create node' }).click()
  await expect(page.getByText('Title is required.')).toBeVisible()

  await page.getByLabel('Title').fill('Follow up')
  await page.getByLabel('Type of node').selectOption('sendMessage')
  await page.getByRole('button', { name: 'Create node' }).click()

  await expect(page).toHaveURL(/\/flow\/node\//)
  await expect(page.getByLabel('Title')).toHaveValue('Follow up')
})

test('creates a business hours node with both branches', async ({ page }) => {
  await page.getByLabel('Title').fill('Opening hours')
  await page.getByLabel('Type of node').selectOption('businessHours')
  await page.getByRole('button', { name: 'Create node' }).click()

  await expect(page).toHaveURL(/\/flow\/node\//)
  await expect(page.locator('.vue-flow__node', { hasText: 'Success' })).toHaveCount(2)
  await expect(page.locator('.vue-flow__node', { hasText: 'Failure' })).toHaveCount(2)
})

test('closes on Escape without creating anything', async ({ page }) => {
  const before = await page.locator('.vue-flow__node').count()

  await page.getByLabel('Title').fill('Discarded')
  await page.keyboard.press('Escape')

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.vue-flow__node')).toHaveCount(before)
})
