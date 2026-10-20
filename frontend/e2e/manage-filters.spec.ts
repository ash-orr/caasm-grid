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
    await page.getByRole('button', { name: 'View settings' }).click();
    await page.getByRole('menuitem', { name: 'Show/hide columns' }).click();
    await page.getByRole('checkbox', { name: 'CrowdStrike' }).check();
    await expect(page.getByRole('button', { name: 'CrowdStrike', exact: true }).first()).toBeVisible();
  });
});
