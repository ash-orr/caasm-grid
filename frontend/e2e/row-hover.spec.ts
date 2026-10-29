import { expect, test } from '@playwright/test';

test('detail page rows use row-hover styling while main tables keep their existing hover', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Devices' }).click();
  const devicesTableRow = page.locator('tbody tr').filter({ hasText: 'IOT-1049' }).first();
  await expect(devicesTableRow).toBeVisible();
  const deviceRowBefore = await devicesTableRow.evaluate((element) => getComputedStyle(element).backgroundColor);
  await devicesTableRow.hover();
  const deviceRowAfter = await devicesTableRow.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(deviceRowBefore).not.toBe('rgb(245, 247, 249)');
  expect(deviceRowAfter).not.toBe('rgb(245, 247, 249)');

  await devicesTableRow.click();

  const overviewRow = page.locator('[class*="detailAgreementRow"]').filter({ hasText: 'Hostname' }).first();
  const beforeHeight = await overviewRow.evaluate((element) => element.getBoundingClientRect().height);
  await expect(overviewRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await overviewRow.hover();
  await expect(overviewRow).toHaveCSS('background-color', 'rgb(245, 247, 249)');
  await expect(overviewRow).not.toHaveCSS('cursor', 'pointer');
  const afterHeight = await overviewRow.evaluate((element) => element.getBoundingClientRect().height);
  expect(afterHeight).toBe(beforeHeight);

  const overviewHeader = page.locator('[class*="detailAgreementHeader"]').first();
  await overviewHeader.hover();
  await expect(overviewHeader).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  const lastSeenRow = page.locator('[class*="detailOverviewLead"]').filter({ hasText: 'Last seen by sources' }).first();
  await expect(lastSeenRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await lastSeenRow.hover();
  await expect(lastSeenRow).toHaveCSS('background-color', 'rgb(245, 247, 249)');

  await page.getByRole('button', { name: /^Exposure coverage/ }).first().click();
  const exposureRow = page.locator('[class*="detailAgreementRow"]').first();
  await expect(exposureRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await exposureRow.hover();
  await expect(exposureRow).toHaveCSS('background-color', 'rgb(245, 247, 249)');

  const leftCard = page.locator('dl').filter({ hasText: 'Type' }).first();
  const leftCardBefore = await leftCard.evaluate((element) => getComputedStyle(element).backgroundColor);
  await leftCard.hover();
  const leftCardAfter = await leftCard.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(leftCardBefore).not.toBe('rgb(245, 247, 249)');
  expect(leftCardAfter).not.toBe('rgb(245, 247, 249)');

  await page.goto('/');
  await page.getByRole('button', { name: 'Accounts' }).click();
  const accountRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
  await expect(accountRow).toBeVisible();
  await accountRow.click();
  const accountOverviewRow = page.locator('[class*="detailAgreementRow"]').filter({ hasText: 'Account name' }).first();
  await expect(accountOverviewRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await accountOverviewRow.hover();
  await expect(accountOverviewRow).toHaveCSS('background-color', 'rgb(245, 247, 249)');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Devices' }).click();
  const darkDeviceRow = page.locator('tbody tr').filter({ hasText: 'IOT-1049' }).first();
  await expect(darkDeviceRow).toBeVisible();
  await darkDeviceRow.click();
  const darkOverviewRow = page.locator('[class*="detailAgreementRow"]').filter({ hasText: 'Hostname' }).first();
  await darkOverviewRow.hover();
  await expect(darkOverviewRow).toHaveCSS('background-color', 'rgb(27, 39, 51)');
});
