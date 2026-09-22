import { expect, test } from '@playwright/test'

/**
 * A tooltip may sit on an ancestor: a disabled control receives no mouse events
 * in Chrome or Safari, so a title on the button itself would never be shown.
 */
const auditButtons = (scope) =>
  scope.evaluate((root) =>
    [...(root ?? document).querySelectorAll('button')].map((button) => ({
      name: (button.getAttribute('aria-label') || button.textContent || '').trim(),
      tooltip: (button.title || button.closest('[title]')?.getAttribute('title') || '').trim(),
    })),
  )

const expectAllExplained = (controls) => {
  expect(controls.length).toBeGreaterThan(0)

  const unnamed = controls.filter((control) => !control.name)
  const untooltipped = controls.filter((control) => !control.tooltip)
  // A tooltip repeating its label is noise, and a screen reader may say it twice.
  const parrots = controls.filter(
    (control) => control.tooltip.toLowerCase() === control.name.toLowerCase(),
  )

  expect(unnamed, `no accessible name: ${JSON.stringify(unnamed)}`).toEqual([])
  expect(untooltipped, `no tooltip: ${JSON.stringify(untooltipped)}`).toEqual([])
  expect(parrots, `tooltip repeats the label: ${JSON.stringify(parrots)}`).toEqual([])
}

test('every control on the canvas explains itself', async ({ page }) => {
  await page.goto('/flow')
  await page.waitForSelector('.vue-flow__node')

  expectAllExplained(await auditButtons(page.locator('body')))
})

test('every control in the drawer and the dialogs explains itself', async ({ page }) => {
  await page.goto('/flow/node/b0653a')
  await page.getByLabel('Title').waitFor()
  expectAllExplained(await auditButtons(page.locator('body')))

  await page.goto('/flow')
  await page.getByRole('button', { name: 'Create new node' }).click()
  expectAllExplained(await auditButtons(page.locator('body')))
})

test('the create control does not promise a connection it will not make', async ({ page }) => {
  await page.goto('/flow')
  const create = page.getByRole('button', { name: 'Create new node' })

  await expect(create).toHaveAttribute('title', /not connected/i)

  await create.click()
  await expect(page.getByRole('dialog', { name: 'Create new node' })).toContainText(
    'added on its own, below the flow',
  )
})

test('a disabled control still says why it is disabled', async ({ page }) => {
  await page.goto('/flow')
  await page.waitForSelector('.vue-flow__node')

  const undo = page.getByRole('button', { name: 'Undo' })
  await expect(undo).toBeDisabled()

  const tooltip = await undo.evaluate((el) => el.closest('[title]')?.getAttribute('title'))
  expect(tooltip).toBe('Nothing to undo')
})
