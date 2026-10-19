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
});
