import { expect, test } from '@playwright/test';

test.describe('Typography parity', () => {
  test('matches the prototype baseline at the shared token layer', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toHaveCSS('font-family', '"Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif');
    await expect(page.locator('body')).toHaveCSS('font-size', '14px');
    await expect(page.locator('h1')).toHaveCSS('font-size', '22px');
    await expect(page.getByRole('button', { name: 'Manage filters' })).toHaveCSS('font-size', '14px');
    await expect(page.getByRole('button', { name: 'Manage filters' })).toHaveCSS('font-family', '"Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif');
  });

  test('keeps core table and filter typography aligned with the prototype', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('th').filter({ hasText: 'Device name' }).first()).toHaveCSS('font-size', '12px');
    await expect(page.locator('th').filter({ hasText: 'Device name' }).first()).toHaveCSS('font-weight', '600');

    const bodyCell = page.locator('tbody tr td').nth(2);
    await expect(bodyCell).toHaveCSS('font-size', '14px');

    await expect(page.locator('.pill').first()).toHaveCSS('font-size', '12px');
    await expect(page.locator('summary').filter({ hasText: 'Saved views' }).first()).toHaveCSS('font-size', '12.5px');
    await expect(page.locator('.tableFooter .footerCount').first()).toHaveCSS('font-size', '12.5px');

    await page.getByRole('button', { name: 'Manage filters' }).click();
    await expect(page.getByText('Status', { exact: true }).first()).toHaveCSS('font-size', '12.5px');
  });
});
