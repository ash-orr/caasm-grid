import { expect, test } from '@playwright/test';

test('associated devices card matches the prototype for account detail items', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Accounts' }).click();
  await page.getByPlaceholder('Search accounts or groups').fill('blake@acme.com');
  await page.locator('tbody tr').filter({ hasText: 'blake@acme.com' }).first().click();

  const cardHeader = page.getByRole('heading', { name: /Associated devices/i });
  await expect(cardHeader).toContainText('Associated devices (2)');

  const firstItem = page.getByRole('button', { name: 'IOT-1427' }).locator('xpath=ancestor::div[contains(@class, "detailAssociatedItem")]');
  const firstItemBox = await firstItem.boundingBox();
  expect(firstItemBox).not.toBeNull();
  expect(Math.abs((firstItemBox?.height ?? 0) - 106.3)).toBeLessThanOrEqual(0.5);

  const metaLine = firstItem.getByText(/^IoT\/Printer · Last connected \d+d ago$/, { exact: true });
  await expect(metaLine).toHaveCount(1);
  await expect(metaLine).toHaveCSS('color', 'rgb(93, 107, 120)');
  await expect(metaLine).toHaveCSS('font-size', '14px');
  await expect(metaLine).toHaveCSS('line-height', '20.3px');
  await expect(metaLine).toHaveCSS('margin-top', '2px');

  const riskLine = firstItem.getByText(/Risk score/i);
  await expect(riskLine).toHaveCount(1);
  await expect(riskLine).toHaveCSS('color', 'rgb(20, 33, 43)');
  await expect(riskLine).toHaveCSS('font-size', '14px');
  await expect(riskLine).toHaveCSS('margin-top', '2px');

  const gapLine = firstItem.getByText('Exposure gap: None', { exact: true });
  await expect(gapLine).toHaveCount(1);
  await expect(gapLine).toHaveCSS('color', 'rgb(20, 33, 43)');
  await expect(gapLine).toHaveCSS('font-size', '14px');
  await expect(gapLine).toHaveCSS('line-height', '20.3px');
  await expect(gapLine).toHaveCSS('margin-top', '2px');
  await expect(gapLine.locator('span')).toHaveCount(0);

  await page.getByRole('button', { name: 'Assets' }).click();
  await page.getByRole('button', { name: 'Accounts' }).click();
  await page.getByPlaceholder('Search accounts or groups').fill('avery@acme.com');
  await page.locator('tbody tr').filter({ hasText: 'avery@acme.com' }).first().click();

  await expect(page.getByRole('heading', { name: /Associated devices/i })).toContainText('Associated devices (4)');
  const gapItem = page.getByRole('button', { name: 'MB-1658' }).locator('xpath=ancestor::div[contains(@class, "detailAssociatedItem")]');
  const gapTextLine = gapItem.getByText(/^Exposure gap: /, { exact: false }).first();
  await expect(gapTextLine).toHaveCount(1);
  await expect(gapTextLine).toContainText('Exposure gap: ');
  const redGapText = gapTextLine.locator('span');
  await expect(redGapText).toHaveCount(1);
  await expect(redGapText).toHaveText('Portnox AgentP, EntraID');
  await expect(redGapText).toHaveCSS('color', 'rgb(192, 57, 43)');
});
