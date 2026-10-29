import { expect, test } from '@playwright/test';

test('Overview lead row matches the prototype for device and account last-seen/login rows', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Devices' }).click();
  await page.locator('input[placeholder^="Search devices"]').fill('DT-1063');
  await page.locator('tbody tr').filter({ hasText: 'DT-1063' }).first().click();

  const lastSeenRow = page.locator('[class*="detailOverviewLead"]').filter({ hasText: 'Last seen by sources' }).first();
  await expect(lastSeenRow).toContainText('Last seen by sources');
  const label = lastSeenRow.locator('[class*="detailOverviewLeadLabel"]').first();
  await expect(label).toContainText('Last seen by sources');

  const value = lastSeenRow.locator('[class*="detailOverviewLeadValue"]').first();
  const valueText = await value.textContent();
  expect(valueText ?? '').not.toContain('Reported by');
  expect(valueText ?? '').toMatch(/(?:ago|Just now|<1h|\d{1,2}h|Oct|Sep)/i);
  expect(valueText ?? '').toMatch(/· Most recent:/i);

  const ink = value.locator('[class*="detailOverviewLeadInk"]').first();
  await expect(ink).toHaveCSS('color', 'rgb(20, 33, 43)');
  const muted = value.locator('[class*="detailOverviewLeadMuted"]').first();
  await expect(muted).toHaveCSS('color', 'rgb(93, 107, 120)');

  const labelBox = await label.boundingBox();
  const valueBox = await value.boundingBox();
  expect(labelBox).not.toBeNull();
  expect(valueBox).not.toBeNull();
  expect((valueBox?.x ?? 0)).toBeGreaterThan((labelBox?.x ?? 0) + (labelBox?.width ?? 0));

  const hoverBefore = await lastSeenRow.evaluate((element) => getComputedStyle(element).backgroundColor);
  await lastSeenRow.hover();
  const hoverAfter = await lastSeenRow.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(hoverBefore).toBe('rgba(0, 0, 0, 0)');
  expect(hoverAfter).toBe('rgb(245, 247, 249)');

  await page.getByRole('button', { name: 'Assets' }).click();
  await page.getByRole('button', { name: /^Accounts$/ }).click();
  await page.locator('input[placeholder^="Search accounts"]').fill('drew@acme.com');
  await page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first().click();

  const lastLoginRow = page.locator('[class*="detailOverviewLead"]').filter({ hasText: 'Last login by sources' }).first();
  await expect(lastLoginRow).toContainText('Last login by sources');
  const accountValue = lastLoginRow.locator('[class*="detailOverviewLeadValue"]').first();
  const accountValueText = await accountValue.textContent();
  expect(accountValueText ?? '').toMatch(/^.+ · Reported by .+$/);
  expect(accountValueText ?? '').not.toContain('Last login by sources:');

  const accountInk = accountValue.locator('[class*="detailOverviewLeadInk"]').first();
  await expect(accountInk).toHaveCSS('color', 'rgb(20, 33, 43)');
  const accountMuted = accountValue.locator('[class*="detailOverviewLeadMuted"]').first();
  await expect(accountMuted).toHaveCSS('color', 'rgb(93, 107, 120)');
});
