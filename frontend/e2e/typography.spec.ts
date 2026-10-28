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
    await expect(conflictPill).toHaveCSS('font-variant-numeric', 'normal');

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

    const leftColumnColor = await page.locator('dt').filter({ hasText: 'Type' }).first().evaluate((element) => getComputedStyle(element).color);
    const sourceCountText = page.locator('[class*="detailAgreementSources"]').filter({ hasText: /\d+ sources?/ }).first();
    await expect(sourceCountText).toHaveCSS('color', leftColumnColor);
  });

  test('detail page score and status pills match the prototype on device and account pages', async ({ page }) => {
    await page.goto('/');

    const search = page.locator('input[placeholder="Search devices, accounts, OS, location"]').first();
    await search.fill('IOT-1049');
    await expect(page.locator('tbody tr')).toContainText('IOT-1049');

    const row = page.locator('tbody tr').filter({ hasText: 'IOT-1049' }).first();
    await row.click();

    const riskCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Current risk score' }) }).first();
    const scorePill = riskCard.locator('[data-testid="risk-pill"]').first();
    await expect(scorePill).toHaveCSS('font-size', '12px');
    await expect(scorePill).toHaveCSS('font-weight', '500');
    await expect(scorePill).toHaveCSS('border-radius', '10px');
    await expect(scorePill).toHaveCSS('padding-top', '1px');
    await expect(scorePill).toHaveCSS('padding-left', '8px');
    await expect(scorePill).toHaveCSS('font-variant-numeric', 'tabular-nums');

    const exposureCoverageTab = page.getByRole('button', { name: /^Exposure coverage/ }).first();
    await exposureCoverageTab.click();
    const coveragePill = page.locator('[data-testid="status-pill"]').filter({ hasText: /Reporting|Stale|Pending|Not present|Not applicable/ }).first();
    await expect(coveragePill).toHaveCSS('font-size', '12px');
    await expect(coveragePill).toHaveCSS('font-weight', '500');
    await expect(coveragePill).toHaveCSS('border-radius', '10px');
    await expect(coveragePill).toHaveCSS('padding-top', '1px');
    await expect(coveragePill).toHaveCSS('padding-left', '8px');

    await page.getByRole('button', { name: 'Assets' }).click();

    const gapSearch = page.locator('input[placeholder="Search devices, accounts, OS, location"]').first();
    await gapSearch.fill('avery@acme.com');
    const gapMatches = page.locator('tbody tr').filter({ hasText: 'avery@acme.com' });
    await expect(gapMatches.first()).toContainText('avery@acme.com');

    const gapRow = gapMatches.first();
    await gapRow.click();

    const exposureGapPill = page.locator('[data-testid="source-coverage-pill"]').first();
    await expect(exposureGapPill).toHaveCSS('font-size', '12px');
    await expect(exposureGapPill).toHaveCSS('font-weight', '500');
    await expect(exposureGapPill).toHaveCSS('border-radius', '10px');
    await expect(exposureGapPill).toHaveCSS('padding-top', '1px');
    await expect(exposureGapPill).toHaveCSS('padding-left', '8px');

    await page.getByRole('button', { name: 'Assets' }).click();
    await page.getByRole('button', { name: 'Accounts' }).click();

    const accountSearch = page.locator('input[placeholder="Search accounts or groups"]').first();
    await accountSearch.fill('avery@acme.com');
    const accountMatches = page.locator('tbody tr').filter({ hasText: 'avery@acme.com' });
    await expect(accountMatches.first()).toContainText('avery@acme.com');

    const accountRow = accountMatches.first();
    await accountRow.click();

    const associatedDevicesCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /Associated devices/ }) }).first();
    const associatedScorePill = associatedDevicesCard.locator('[data-testid="risk-pill"]').first();
    await expect(associatedScorePill).toHaveCSS('font-size', '12px');
    await expect(associatedScorePill).toHaveCSS('font-weight', '500');
    await expect(associatedScorePill).toHaveCSS('border-radius', '10px');
    await expect(associatedScorePill).toHaveCSS('padding-top', '1px');
    await expect(associatedScorePill).toHaveCSS('padding-left', '8px');
    await expect(associatedScorePill).toHaveCSS('font-variant-numeric', 'tabular-nums');
  });

  test('detail page header rows, source names, breadcrumb links and title weight match the prototype', async ({ page }) => {
    await page.goto('/');

    const search = page.locator('input[placeholder="Search devices, accounts, OS, location"]').first();
    await search.fill('IOT-1049');
    await expect(page.locator('tbody tr')).toContainText('IOT-1049');

    const row = page.locator('tbody tr').filter({ hasText: 'IOT-1049' }).first();
    await row.click();

    const overviewHeader = page.locator('[class*="detailAgreementHeader"]').first().locator('span').filter({ hasText: 'Field' }).first();
    await expect(overviewHeader).toHaveCSS('font-size', '12px');
    await expect(overviewHeader).toHaveCSS('line-height', '17.4px');

    const inkColor = await page.locator('[class*="detailCrumbCurrent"]').first().evaluate((element) => getComputedStyle(element).color);

    const exposureCoverageTab = page.getByRole('button', { name: /^Exposure coverage/ }).first();
    await exposureCoverageTab.click();
    const coverageHeader = page.locator('span').filter({ hasText: 'Source' }).first();
    await expect(coverageHeader).toHaveCSS('font-size', '12px');

    const sourceName = page.locator('[class*="detailAgreementField"]').filter({ hasText: 'Active Directory' }).first();
    await expect(sourceName).toHaveCSS('color', inkColor);

    const accentColor = await page.getByRole('button', { name: 'Assets' }).first().evaluate((element) => getComputedStyle(element).color);
    const breadcrumbDevices = page.locator('[class*="detailCrumb"]').first().getByText('Devices', { exact: true }).first();
    await expect(breadcrumbDevices).toHaveCSS('color', accentColor);

    const breadcrumbTitle = page.locator('[class*="detailCrumbCurrent"]').first();
    await expect(breadcrumbTitle).toHaveCSS('font-weight', '700');
  });

  test('Exposure gaps card source names stay muted while coverage tab source names stay ink', async ({ page }) => {
    await page.goto('/');

    const search = page.locator('input[placeholder="Search devices, accounts, OS, location"]').first();
    await search.fill('MB-1056');
    await expect(page.locator('tbody tr')).toContainText('MB-1056');

    const row = page.locator('tbody tr').filter({ hasText: 'MB-1056' }).first();
    await row.click();

    const typeLabel = page.locator('dt').filter({ hasText: 'Type' }).first();
    const mutedColor = await typeLabel.evaluate((element) => getComputedStyle(element).color);

    const gapSource = page.locator('[data-testid="source-coverage-source"]').filter({ hasText: 'Jamf' }).first();
    await expect(gapSource).toHaveCSS('color', mutedColor);

    const hostnameValue = page.locator('[class*="detailAgreementValue"]').filter({ hasText: 'MB-1056' }).first();
    const inkColor = await hostnameValue.evaluate((element) => getComputedStyle(element).color);

    const exposureCoverageTab = page.getByRole('button', { name: /^Exposure coverage/ }).first();
    await exposureCoverageTab.click();

    const coverageSource = page.locator('[class*="detailAgreementSourceName"]').filter({ hasText: 'Active Directory' }).first();
    await expect(coverageSource).toHaveCSS('color', inkColor);
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
