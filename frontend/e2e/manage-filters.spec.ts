import { expect, test } from '@playwright/test';

test.describe('Manage filters dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('focus goes to search on open and back to the button on close', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Manage filters' });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: /Manage filters/i });
    await expect(dialog).toBeVisible();

    const search = page.getByLabel('Search filters');
    await expect(search).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('shows source status columns after opening Columns', async ({ page }) => {
    await page.getByRole('button', { name: 'Show/hide columns' }).click();
    await page.getByRole('checkbox', { name: 'CrowdStrike' }).check();
    await expect(page.getByRole('button', { name: 'CrowdStrike', exact: true }).first()).toBeVisible();
  });

  test('default view restores its own column set after switching away and back', async ({ page }) => {
    const defaultView = page.getByRole('radio', { name: 'Default view' });
    const exposureView = page.getByRole('radio', { name: 'Exposure Risk view' });
    const getVisibleHeaders = async () => (await page.locator('thead th').allTextContents())
      .map((value) => value.replace(/\s*[▲▼]/g, '').trim())
      .filter(Boolean);

    const defaultDeviceHeaders = [
      'Device name',
      'Type',
      'OS',
      'Location',
      'Account',
      'Account type',
      'Group',
      'Risk score',
      'Status',
      'Last connected',
      'Created time',
      'Exposure gaps',
      'Source coverage',
    ];

    const exposureDeviceHeaders = [
      'Device name',
      'Account',
      'Exposure gaps',
      'Source coverage',
      'CrowdStrike',
      'Intune',
      'Okta',
      'Google',
      'AD',
      'AgentP',
    ];

    const defaultAccountHeaders = [
      'Account name',
      'Account type',
      'Group',
      'Devices',
      'Blocked',
      'Last login',
      'Exposure gaps',
      'Source coverage',
    ];

    const exposureAccountHeaders = [
      'Account name',
      'Devices',
      'Exposure gaps',
      'Source coverage',
      'Okta',
      'Google',
      'AD',
      'EntraID',
    ];

    await expect(defaultView).toBeChecked();
    await expect(await getVisibleHeaders()).toEqual(defaultDeviceHeaders);

    await exposureView.check();
    await expect(exposureView).toBeChecked();
    await expect(await getVisibleHeaders()).toEqual(exposureDeviceHeaders);

    await page.getByRole('button', { name: 'Show/hide columns' }).click();
    await page.getByRole('checkbox', { name: 'Type', exact: true }).uncheck();
    await page.keyboard.press('Escape');
    await expect(await getVisibleHeaders()).not.toContain('Type');
    await defaultView.check();
    await expect(defaultView).toBeChecked();
    await expect(await getVisibleHeaders()).toEqual(defaultDeviceHeaders);

    await page.getByRole('button', { name: 'Accounts' }).click();
    await expect(defaultView).toBeChecked();
    await expect(await getVisibleHeaders()).toEqual(defaultAccountHeaders);

    await exposureView.check();
    await expect(exposureView).toBeChecked();
    await expect(await getVisibleHeaders()).toEqual(exposureAccountHeaders);

    await page.getByRole('button', { name: 'Show/hide columns' }).click();
    await page.getByRole('checkbox', { name: 'Account type', exact: true }).uncheck();
    await page.keyboard.press('Escape');
    await expect(await getVisibleHeaders()).not.toContain('Account type');
    await defaultView.check();
    await expect(defaultView).toBeChecked();
    await expect(await getVisibleHeaders()).toEqual(defaultAccountHeaders);
  });
});
