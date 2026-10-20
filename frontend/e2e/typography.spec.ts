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

    const headerCell = page.locator('th').filter({ hasText: 'Device name' }).first();
    await expect(headerCell).toHaveCSS('font-size', '12px');
    await expect(headerCell).toHaveCSS('font-weight', '600');
    await expect(parseFloat(await headerCell.evaluate((element) => getComputedStyle(element).height))).toBeCloseTo(39.9, 1);

    const bodyCell = page.locator('tbody tr td').nth(2);
    await expect(bodyCell).toHaveCSS('font-size', '14px');
    await expect(bodyCell).toHaveCSS('line-height', '20.3px');

    const blockedPill = page.locator('span').filter({ hasText: /^Reporting$/ }).first();
    await expect(blockedPill).toHaveCSS('font-size', '12px');
    await expect(blockedPill).toHaveCSS('font-weight', '500');

    const clearButton = page.getByRole('button', { name: 'Clear' }).first();
    await expect(clearButton).toHaveCSS('padding-top', '0px');
    await expect(clearButton).toHaveCSS('padding-right', '0px');
    await expect(clearButton).toHaveCSS('padding-bottom', '0px');
    await expect(clearButton).toHaveCSS('padding-left', '0px');
    await expect(clearButton).toHaveCSS('font-size', '14px');
    await expect(clearButton).toHaveCSS('line-height', '20.3px');

    await expect(page.locator('summary').filter({ hasText: 'Saved views' }).first()).toHaveCSS('font-size', '12.5px');
    await expect(page.locator('summary').filter({ hasText: 'Saved views' }).first()).toHaveCSS('line-height', '18.125px');

    const prevButton = page.getByRole('button', { name: 'Prev' }).first();
    await expect(prevButton).toHaveCSS('font-size', '12.5px');
    await expect(prevButton).toHaveCSS('line-height', '18.125px');
    await expect(prevButton).toHaveCSS('color', 'rgb(93, 107, 120)');

    const rowsPerPageLabel = page.locator('label').filter({ hasText: /Rows per page/ }).first();
    const rowsPerPageLabelHeight = parseFloat(await rowsPerPageLabel.evaluate((element) => getComputedStyle(element).height));
    expect(rowsPerPageLabelHeight).toBeCloseTo(30.1, 0);

    const rowsPerPageSelect = page.locator('label').filter({ hasText: /Rows per page/ }).locator('select').first();
    await expect(rowsPerPageSelect).toHaveCSS('color', 'rgb(93, 107, 120)');
    await expect(rowsPerPageSelect).toHaveCSS('padding-top', '5px');
    await expect(rowsPerPageSelect).toHaveCSS('padding-right', '30px');
    await expect(rowsPerPageSelect).toHaveCSS('padding-bottom', '5px');
    await expect(rowsPerPageSelect).toHaveCSS('padding-left', '10px');
    const rowsPerPageSelectHeight = parseFloat(await rowsPerPageSelect.evaluate((element) => getComputedStyle(element).height));
    expect(rowsPerPageSelectHeight).toBeCloseTo(30.1, 0);

    await page.getByRole('button', { name: 'Manage filters' }).click();
    const dialogTitle = page.getByRole('dialog').locator('h2').first();
    await expect(dialogTitle).toHaveCSS('font-size', '17px');
    await expect(dialogTitle).toHaveCSS('line-height', '24.7px');

    const optionLabel = page.getByRole('dialog').getByText('Status', { exact: true }).first();
    await expect(optionLabel).toHaveCSS('font-size', '12.5px');
    await expect(optionLabel).toHaveCSS('line-height', '18.125px');

    const blockedLabel = page.getByText('Blocked', { exact: true }).first();
    await expect(blockedLabel).toHaveCSS('font-size', '12.5px');
  });
});
