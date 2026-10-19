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
});
