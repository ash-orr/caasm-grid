import { expect, test } from '@playwright/test';

test.describe('Button styles', () => {
  test('matches the prototype button token contract in light mode', async ({ page }) => {
    await page.goto('/');

    const viewsButton = page.getByRole('button', { name: 'Views' }).first();
    await expect(viewsButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(viewsButton).toHaveCSS('color', 'rgb(0, 124, 150)');
    await expect(viewsButton).toHaveCSS('border-color', 'rgb(0, 131, 143)');

    const exportButton = page.getByRole('button', { name: 'Export' }).first();
    await expect(exportButton).toHaveCSS('background-color', 'rgb(0, 131, 143)');
    await expect(exportButton).toHaveCSS('border-color', 'rgb(0, 131, 143)');
    await expect(exportButton).toHaveCSS('color', 'rgb(255, 255, 255)');
    await exportButton.hover();
    await expect(exportButton).toHaveCSS('background-color', 'rgb(35, 153, 173)');

    const prevButton = page.getByRole('button', { name: 'Prev' }).first();
    await expect(prevButton).toBeDisabled();
    await expect(prevButton).toHaveCSS('color', 'rgb(93, 107, 120)');
    await expect(prevButton).toHaveCSS('border-color', 'rgb(220, 226, 232)');
  });

  test('matches the prototype button token contract in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    const exportButton = page.getByRole('button', { name: 'Export' }).first();
    await expect(exportButton).toHaveCSS('background-color', 'rgb(29, 73, 84)');
    await expect(exportButton).toHaveCSS('border-color', 'rgb(29, 73, 84)');
    await expect(exportButton).toHaveCSS('color', 'rgb(255, 255, 255)');

    const viewsButton = page.getByRole('button', { name: 'Views' }).first();
    await expect(viewsButton).toHaveCSS('color', 'rgb(79, 184, 212)');
    await expect(viewsButton).toHaveCSS('border-color', 'rgb(79, 184, 212)');
  });
});
