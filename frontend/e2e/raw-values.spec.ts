import { expect, test } from '@playwright/test';

test.describe('raw values button activation', () => {
  test('View raw values toggles via the native button control', async ({ page }) => {
    await page.goto('/');

    const search = page.getByPlaceholder('Search devices, accounts, OS, location');
    await search.fill('MB-1175');

    const row = page.locator('tbody tr').filter({ hasText: 'MB-1175' }).first();
    await expect(row).toBeVisible();
    await row.click();

    const button = page.locator('button[data-rr="osVersion"]').first();
    await expect(button).toBeVisible();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button).toHaveText('Hide raw values');

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveText('View raw values');
  });
});
