import { expect, test } from '@playwright/test';

test('device details left column matches the prototype order and labels', async ({ page }) => {
  await page.goto('/');

  const row = page.locator('tbody tr').first();
  await expect(row).toBeVisible();
  await row.click();

  const headings = await page.getByRole('heading', { level: 3 }).allTextContents();
  expect(headings.slice(0, 4)).toEqual([
    'Device details',
    'Current risk score',
    'Exposure gaps',
    'Account assignment',
  ]);

  const firstCard = page.getByRole('heading', { name: 'Device details' }).locator('xpath=following-sibling::dl');
  const firstCardLabels = await firstCard.locator('dt').allTextContents();
  expect(firstCardLabels.slice(0, 5)).toEqual([
    'Type',
    'OS',
    'Location',
    'AgentP last reported',
    'Last connected',
  ]);
});
