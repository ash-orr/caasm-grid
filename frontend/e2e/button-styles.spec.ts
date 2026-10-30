import { expect, test } from '@playwright/test';

test('toolbar icon buttons use the secondary button border contract', async ({ page }) => {
  await page.goto('/');

  const columnsButton = page.getByRole('button', { name: 'Show/hide columns' }).first();
  await expect(columnsButton).toHaveCSS('border-color', 'rgb(0, 131, 143)');
  await expect(columnsButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(columnsButton).toHaveCSS('color', 'rgb(0, 124, 150)');
  await columnsButton.hover();
  await expect(columnsButton).toHaveCSS('background-color', 'rgb(242, 250, 251)');
  await expect(columnsButton).toHaveCSS('height', '32px');
  await expect(columnsButton).toHaveCSS('padding', '7px 9px');
});

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
    await expect(prevButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(prevButton).toHaveCSS('color', 'rgb(163, 163, 163)');
    await expect(prevButton).toHaveCSS('border-color', 'rgb(222, 222, 222)');

    const nextButton = page.getByRole('button', { name: 'Next' }).first();
    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(nextButton).toHaveCSS('color', 'rgb(0, 124, 150)');
    await expect(nextButton).toHaveCSS('border-color', 'rgb(0, 131, 143)');

    const checkbox = page.locator('input[aria-label^="Select row"]').first();
    await checkbox.check();
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.hover();
    await expect(deleteButton).toHaveCSS('background-color', 'rgb(254, 240, 240)');
    await expect(deleteButton).toHaveCSS('color', 'rgb(202, 14, 12)');
    await expect(deleteButton).toHaveCSS('border-color', 'rgb(211, 48, 47)');
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

    const prevButton = page.getByRole('button', { name: 'Prev' }).first();
    await expect(prevButton).toBeDisabled();
    await expect(prevButton).toHaveCSS('background-color', 'rgb(22, 32, 42)');
    await expect(prevButton).toHaveCSS('color', 'rgb(93, 107, 120)');
    await expect(prevButton).toHaveCSS('border-color', 'rgb(38, 51, 65)');

    const viewsDropdown = page.getByRole('button', { name: 'Views' }).first();
    await viewsDropdown.click();
    const removeViewItem = page.getByText('Remove view').first();
    await expect(removeViewItem).toHaveAttribute('aria-disabled', 'true');
    await expect(removeViewItem).toBeVisible();
  });

  test('matches the remove-view dialog button contract', async ({ page }) => {
    await page.goto('/');
    const viewsButton = page.getByRole('button', { name: 'Views' }).first();
    await viewsButton.click();
    await page.getByText('Save view').click();
    await page.locator('input#save-view-name').fill('Prototype follow-up view');
    await page.getByRole('button', { name: 'Save as new' }).click();
    await viewsButton.click();
    await page.getByText('Remove view').click();

    const cancelButton = page.getByRole('button', { name: 'Cancel' }).last();
    await expect(cancelButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(cancelButton).toHaveCSS('color', 'rgb(0, 124, 150)');
    await expect(cancelButton).toHaveCSS('border-color', 'rgb(0, 131, 143)');

    const removeButton = page.getByRole('button', { name: 'Remove view' }).last();
    await expect(removeButton).toHaveCSS('background-color', 'rgb(211, 48, 47)');
    await expect(removeButton).toHaveCSS('border-color', 'rgb(211, 48, 47)');
    await expect(removeButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  });
});
