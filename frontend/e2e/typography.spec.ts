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

  test('detail page labels use the prototype 14px / 20.3px sizing', async ({ page }) => {
    await page.goto('/');

    const search = page.locator('input[placeholder="Search devices, accounts, OS, location"]').first();
    await search.fill('MB-1175');
    await expect(page.locator('tbody tr')).toContainText('MB-1175');

    const row = page.locator('tbody tr').filter({ hasText: 'MB-1175' }).first();
    await row.click();

    const hostnameLabel = page.getByText('Hostname', { exact: true }).first();
    await expect(hostnameLabel).toHaveCSS('font-size', '14px');
    await expect(hostnameLabel).toHaveCSS('line-height', '20.3px');

    const typeRow = page.locator('dl').filter({ has: page.getByText('Type', { exact: true }) }).first();
    const typeLabel = typeRow.locator('dt').filter({ hasText: 'Type' }).first();
    const typeValue = typeRow.locator('dd').first();
    await expect(typeLabel).toHaveCSS('font-size', '13px');
    await expect(typeLabel).toHaveCSS('line-height', '18.85px');
    await expect(typeValue).toHaveCSS('font-size', '13px');
    await expect(typeValue).toHaveCSS('line-height', '18.85px');

    const riskCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Current risk score' }) }).first();
    const violationItem = riskCard.locator('li').first();
    await expect(violationItem).toHaveCSS('font-size', '13px');
    await expect(violationItem).toHaveCSS('line-height', '18.85px');
  });

  test('Overview pills use the shared status-pill styling and text on IOT-1049', async ({ page }) => {
    await page.goto('/');

    const search = page.locator('input[placeholder="Search devices, accounts, OS, location"]').first();
    await search.fill('IOT-1049');
    await expect(page.locator('tbody tr')).toContainText('IOT-1049');

    const row = page.locator('tbody tr').filter({ hasText: 'IOT-1049' }).first();
    await row.click();

    const overviewTab = page.getByRole('button', { name: /^Overview/ }).first();
    await overviewTab.click();

    const conflictPill = page.locator('[aria-label="Conflict"]').first();
    await expect(conflictPill).toHaveCSS('font-size', '12px');
    await expect(conflictPill).toHaveCSS('font-weight', '500');
    await expect(conflictPill).toHaveCSS('border-radius', '10px');
    await expect(conflictPill).toHaveCSS('padding-top', '1px');
    await expect(conflictPill).toHaveCSS('padding-left', '8px');

    const summaryPill = page.locator('[aria-label*="field differs across sources"], [aria-label*="fields differ across sources"]').first();
    await expect(summaryPill).toHaveCSS('font-size', '12px');
    await expect(summaryPill).toHaveCSS('font-weight', '500');
    await expect(summaryPill).toHaveCSS('border-radius', '10px');
    await expect(summaryPill).toHaveCSS('padding-top', '1px');
    await expect(summaryPill).toHaveCSS('padding-left', '8px');

    const agreePill = page.locator('[aria-label="Agree"]').first();
    await expect(agreePill).toHaveCSS('font-size', '12px');
    await expect(agreePill).toHaveCSS('font-weight', '500');
    await expect(agreePill).toHaveCSS('border-radius', '10px');
    await expect(agreePill).toHaveCSS('padding-top', '1px');
    await expect(agreePill).toHaveCSS('padding-left', '8px');
    await expect(agreePill).toHaveText('Agree');
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

    await page.getByRole('button', { name: 'Show/hide columns' }).click();
    await page.getByRole('checkbox', { name: 'CrowdStrike' }).check();
    await page.keyboard.press('Escape');

    const blockedPill = page.locator('[data-testid="status-pill"][aria-label="Reporting"]').first();
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
    await expect(optionLabel).toHaveCSS('font-size', '14px');
    await expect(optionLabel).toHaveCSS('line-height', '20.3px');

    const groupHeading = page.getByRole('dialog').getByText('Default filters', { exact: true }).first();
    await expect(groupHeading).toHaveCSS('font-size', '11.5px');
    await expect(groupHeading).toHaveCSS('font-weight', '600');

    const cancelButton = page.getByRole('button', { name: 'Cancel' }).first();
    await expect(cancelButton).toHaveCSS('padding-top', '7px');
    await expect(cancelButton).toHaveCSS('padding-right', '12px');
    await expect(cancelButton).toHaveCSS('padding-bottom', '7px');
    await expect(cancelButton).toHaveCSS('padding-left', '12px');
    await expect(cancelButton).toHaveCSS('border-radius', '6px');

    const applyButton = page.getByRole('button', { name: 'Apply' }).first();
    await expect(applyButton).toHaveCSS('padding-top', '7px');
    await expect(applyButton).toHaveCSS('padding-right', '12px');
    await expect(applyButton).toHaveCSS('padding-bottom', '7px');
    await expect(applyButton).toHaveCSS('padding-left', '12px');
    await expect(applyButton).toHaveCSS('border-radius', '6px');
    await expect(applyButton).toHaveCSS('background-color', 'rgb(11, 110, 138)');
    await expect(applyButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  });
});
