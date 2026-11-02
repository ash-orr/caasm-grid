import { expect, test } from '@playwright/test';

test.describe('table cell tooltips', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('label').filter({ hasText: 'Rows per page' }).locator('select').selectOption({ value: '-1' });
  });

  test('Devices table Account cell tooltip shows labels Account, Type, Group, Devices, Exposure gap', async ({ page }) => {
    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: 'drew@acme.com' }).first();

    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveCSS('border-bottom-style', 'dotted');

    await trigger.hover();

    const tooltip = page.getByRole('tooltip').filter({ hasText: 'Account' }).first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Account');
    await expect(tooltip).toContainText('Type');
    await expect(tooltip).toContainText('Group');
    await expect(tooltip).toContainText('Devices');
    await expect(tooltip).toContainText('Exposure gap');
  });

  test('Accounts table Devices count > 0 shows headers Device, Type, Risk score, Last connected, Exposure gap and at most 3 device rows', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: '5' }).first();

    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveCSS('border-bottom-style', 'dotted');

    await trigger.hover();

    const tooltip = page.getByRole('tooltip').first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Device');
    await expect(tooltip).toContainText('Type');
    await expect(tooltip).toContainText('Risk score');
    await expect(tooltip).toContainText('Last connected');
    await expect(tooltip).toContainText('Exposure gap');
    await expect(tooltip).not.toContainText('SRV-1791');
  });

  test('a row with more than 3 devices shows "+N more" with the correct N', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: '5' }).first();
    await trigger.hover();

    await expect(page.getByRole('tooltip').first()).toContainText('+2 more');
  });

  test('A Devices count of 0 has no dotted underline and no tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const row = page.locator('tbody tr').filter({ hasText: 'parker@acme.com' }).first();
    const trigger = row.locator('td').filter({ hasText: /^0$/ }).first();

    await expect(trigger).toBeVisible();
    await expect(trigger).not.toHaveCSS('border-bottom-style', 'dotted');

    await trigger.hover();
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  });

  test('Account cell and Devices count have border-bottom-style dotted', async ({ page }) => {
    const deviceRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const deviceAccountTrigger = deviceRow.locator('span').filter({ hasText: 'drew@acme.com' }).first();
    await expect(deviceAccountTrigger).toHaveCSS('border-bottom-style', 'dotted');

    await page.getByRole('button', { name: 'Accounts' }).click();
    const accountRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const countTrigger = accountRow.locator('span').filter({ hasText: '5' }).first();
    await expect(countTrigger).toHaveCSS('border-bottom-style', 'dotted');
  });

  test('moving the mouse away hides the tooltip', async ({ page }) => {
    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: 'drew@acme.com' }).first();

    await trigger.hover();
    const tooltip = page.getByRole('tooltip').filter({ hasText: 'Account' }).first();
    await expect(tooltip).toBeVisible();

    await page.mouse.move(20, 20);
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  });

  test('Accounts blocked status pill keeps exact text and styling inside the tooltip wrapper', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();
    await page.locator('label').filter({ hasText: 'Rows per page' }).locator('select').selectOption({ value: '-1' });

    const blockedPill = page.locator('tbody [data-testid="status-pill"]').filter({ hasText: /^Blocked$/ }).first();
    await expect(blockedPill).toHaveText('Blocked');
    await expect(blockedPill).toHaveCSS('font-size', '12px');
    await expect(blockedPill).toHaveCSS('padding', '1px 8px');
    await expect(blockedPill).toHaveCSS('border-radius', '10px');
  });

  test('a red Blocked pill in Accounts and in Devices shows "Blocked by Admin" or "Blocked by Policy" text matching the row\'s mock data, and a Not blocked pill shows no tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const accountRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const blockedPill = accountRow.locator('span').filter({ hasText: 'Blocked' }).first();
    await blockedPill.hover();

    const accountTooltip = page.getByRole('tooltip').first();
    await expect(accountTooltip).toContainText('Blocked by Admin');
    await expect(accountTooltip).toContainText('Marcus Lee');

    const safeRow = page.locator('tbody tr').filter({ hasText: 'avery@acme.com' }).first();
    const safePill = safeRow.locator('span').filter({ hasText: 'Not blocked' }).first();
    await safePill.hover();
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Devices' }).nth(0).click();
    const deviceRow = page.locator('tbody tr').filter({ hasText: 'MB-1119' }).first();
    const deviceBlockedPill = deviceRow.locator('span').filter({ hasText: 'Blocked' }).first();
    await deviceBlockedPill.hover();

    const deviceTooltip = page.getByRole('tooltip').first();
    await expect(deviceTooltip).toContainText('Blocked by Policy');
    await expect(deviceTooltip).toContainText('Stale_Device_Policy');
  });
});
