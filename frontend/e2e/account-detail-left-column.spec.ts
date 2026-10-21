import { expect, test } from '@playwright/test';

test('account details left column matches the prototype order and labels', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Accounts' }).click();
  const row = page.locator('tbody tr').first();
  await expect(row).toBeVisible();
  await row.click();

  const headings = await page.getByRole('heading', { level: 3 }).allTextContents();
  expect(headings.slice(0, 3)).toEqual([
    'Account details',
    'Exposure gaps',
    'Associated devices (5)',
  ]);
});
