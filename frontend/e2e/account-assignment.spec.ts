import { expect, test } from '@playwright/test';

test('device detail account assignment card matches the prototype', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Search devices, accounts, OS, location').fill('DT-1063');
  const deviceRow = page.locator('tbody tr').filter({ hasText: 'DT-1063' }).first();
  await expect(deviceRow).toBeVisible();
  await deviceRow.click();

  const accountCard = page.getByRole('heading', { name: 'Account assignment' }).locator('xpath=following-sibling::dl');
  const labels = await accountCard.locator('dt').allTextContents();
  expect(labels).toEqual(['Account', 'Account type', 'Group', 'Exposure gap', 'Device(s)']);

  for (const label of await accountCard.locator('dt').all()) {
    await expect(label).toHaveCSS('color', 'rgb(93, 107, 120)');
  }

  const values = await accountCard.locator('dd').all();
  expect(values.length).toBe(5);
  for (const value of values) {
    await expect(value).toHaveCSS('color', 'rgb(20, 33, 43)');
    await expect(value).toHaveCSS('font-size', '13px');
    await expect(value).toHaveCSS('line-height', '18.85px');
  }

  const accountLink = accountCard.getByRole('button', { name: 'wren@acme.com' }).first();
  await expect(accountLink).toHaveCSS('color', 'rgb(11, 110, 138)');
  await accountLink.click();
  await expect(page.getByRole('heading', { name: 'Account details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account details' })).toContainText('Account details');
  await page.getByRole('button', { name: 'Assets' }).click();

  await page.getByPlaceholder('Search devices, accounts, OS, location').fill('DT-1063');
  await page.locator('tbody tr').filter({ hasText: 'DT-1063' }).first().click();

  const exposureGapRow = accountCard.locator('dt', { hasText: 'Exposure gap' }).locator('xpath=following-sibling::dd[1]');
  await expect(exposureGapRow).toContainText('None');
  await expect(exposureGapRow).toHaveCSS('color', 'rgb(20, 33, 43)');

  const deviceCountRow = accountCard.locator('dt', { hasText: 'Device(s)' }).locator('xpath=following-sibling::dd[1]');
  await expect(deviceCountRow).toContainText('3 total');
  await expect(deviceCountRow.getByRole('button')).toHaveCount(2);
  await expect(deviceCountRow.getByText('DT-1063', { exact: true })).toHaveCount(1);
  await expect(deviceCountRow.getByRole('button', { name: 'DT-1063' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Assets' }).click();

  await page.getByPlaceholder('Search devices, accounts, OS, location').fill('MB-1658');
  const gapDeviceRow = page.locator('tbody tr').filter({ hasText: 'MB-1658' }).first();
  await expect(gapDeviceRow).toBeVisible();
  await gapDeviceRow.click();

  const gapAccountCard = page.getByRole('heading', { name: 'Account assignment' }).locator('xpath=following-sibling::dl');
  const gapExposureRow = gapAccountCard.locator('dt', { hasText: 'Exposure gap' }).locator('xpath=following-sibling::dd[1]');
  await expect(gapExposureRow).toContainText('Portnox AgentP, EntraID');
  await expect(gapExposureRow.locator('span')).toHaveCount(1);
  await expect(gapExposureRow.locator('span')).toHaveCSS('color', 'rgb(192, 57, 43)');

  const otherDeviceButton = gapAccountCard.getByRole('button').filter({ hasText: /^(?!DT-1658|MB-1658).+/ });
  await expect(otherDeviceButton.first()).toHaveCSS('color', 'rgb(11, 110, 138)');
});
