import { expect, test } from '@playwright/test'

test('copies the diagram as a brief a coding agent can build from', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/flow')
  await page.getByRole('button', { name: 'New diagram' }).click()
  await page.getByRole('button', { name: /Web app architecture/ }).click()
  await expect(page.locator('.vue-flow__node')).toHaveCount(9)

  await page.getByRole('button', { name: 'Copy for AI' }).click()
  await expect(page.getByText(/Brief copied/)).toBeVisible()

  const brief = await page.evaluate(() => navigator.clipboard.readText())
  expect(brief).toMatch(/^# Web app architecture\n/)
  expect(brief).toContain('- **PostgreSQL** `db`: a data store.')
  expect(brief).toContain('- **API** → **PostgreSQL**: SQL')
  expect(brief).toContain('api -> db : SQL')
})
