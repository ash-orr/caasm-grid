import { expect, type Page, test } from '@playwright/test';

type InlineMeasure = {
  pillWidth: number;
  pillHeight: number;
  pillX: number;
  pillY: number;
  textX: number;
  textY: number;
  textWidth: number;
  textHeight: number;
  buttonY: number | null;
};

async function measureInlineRow(page: Page, rowText: string, buttonName?: string): Promise<InlineMeasure> {
  const row = page.locator('[class*="detailAgreementRow"]').filter({ hasText: rowText }).first();
  await expect(row).toBeVisible();

  const inline = row.locator('[class*="detailSourceLine"]').first();
  await expect(inline).toBeVisible();

  const pill = inline.locator('[data-testid="status-pill"]').first();
  const text = inline.locator('[class*="detailSourceText"]').first();

  const pillBox = await pill.boundingBox();
  const textBox = await text.boundingBox();
  const button = buttonName ? row.getByRole('button', { name: buttonName }).first() : null;
  const buttonBox = button ? await button.boundingBox() : null;

  expect(pillBox).not.toBeNull();
  expect(textBox).not.toBeNull();

  if (!pillBox || !textBox) {
    throw new Error(`Missing measurement for ${rowText}`);
  }

  const measurement = {
    pillWidth: pillBox.width,
    pillHeight: pillBox.height,
    pillX: pillBox.x,
    pillY: pillBox.y,
    textX: textBox.x,
    textY: textBox.y,
    textWidth: textBox.width,
    textHeight: textBox.height,
    buttonY: buttonBox ? buttonBox.y : null,
  };

  console.log(`${rowText}: pill=${measurement.pillWidth.toFixed(2)}x${measurement.pillHeight.toFixed(2)} at (${measurement.pillX.toFixed(2)}, ${measurement.pillY.toFixed(2)}), text=${measurement.textX.toFixed(2)}x${measurement.textY.toFixed(2)} ${measurement.textWidth.toFixed(2)}x${measurement.textHeight.toFixed(2)}, buttonY=${measurement.buttonY?.toFixed(2) ?? 'n/a'}`);
  return measurement;
}

test('Overview Sources keeps the status pill inline with the text and raw values below', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Devices' }).click();
  const deviceSearch = page.locator('input[placeholder="Search devices, accounts, OS, location"]').first();
  await deviceSearch.fill('IOT-1049');
  await expect(page.locator('tbody tr')).toContainText('IOT-1049');
  const deviceRow = page.locator('tbody tr').filter({ hasText: 'IOT-1049' }).first();
  await deviceRow.click();

  const agreeMeasure = await measureInlineRow(page, 'Hostname');
  expect(agreeMeasure.pillWidth).toBeLessThanOrEqual(70);
  expect(Math.abs(agreeMeasure.pillHeight - 19.4)).toBeLessThanOrEqual(0.5);
  expect(agreeMeasure.textX).toBeGreaterThan(agreeMeasure.pillX + agreeMeasure.pillWidth - 1);
  expect(Math.abs((agreeMeasure.pillY + agreeMeasure.pillHeight / 2) - (agreeMeasure.textY + agreeMeasure.textHeight / 2))).toBeLessThanOrEqual(4);

  const conflictMeasure = await measureInlineRow(page, 'OS version', 'View raw values');
  expect(conflictMeasure.pillWidth).toBeLessThanOrEqual(80);
  expect(conflictMeasure.textX).toBeGreaterThan(conflictMeasure.pillX + conflictMeasure.pillWidth - 1);
  expect(Math.abs((conflictMeasure.pillY + conflictMeasure.pillHeight / 2) - (conflictMeasure.textY + conflictMeasure.textHeight / 2))).toBeLessThanOrEqual(4);
  expect(conflictMeasure.buttonY).not.toBeNull();
  expect(conflictMeasure.buttonY).toBeGreaterThanOrEqual(conflictMeasure.textY + conflictMeasure.textHeight);

  const deviceEmptyRows = ['Device type', 'Location'];
  for (const label of deviceEmptyRows) {
    const field = page.locator('[class*="detailAgreementField"]').filter({ hasText: label }).first();
    await expect(field).toBeVisible();
    const row = field.locator('xpath=ancestor::*[contains(@class,"detailAgreementRow")][1]');
    const sources = row.locator('[class*="detailAgreementSources"]').first();
    await expect(sources).toHaveText('');
  }

  await page.getByRole('button', { name: 'Assets' }).click();
  await page.getByRole('button', { name: 'Accounts' }).click();
  const accountSearch = page.locator('input[placeholder="Search accounts or groups"]').first();
  await accountSearch.fill('drew@acme.com');
  await expect(page.locator('tbody tr')).toContainText('drew@acme.com');
  const accountRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
  await accountRow.click();

  const accountNameMeasure = await measureInlineRow(page, 'Account name');
  expect(accountNameMeasure.pillWidth).toBeLessThanOrEqual(70);
  expect(Math.abs(accountNameMeasure.pillHeight - 19.4)).toBeLessThanOrEqual(0.5);
  expect(accountNameMeasure.textX).toBeGreaterThan(accountNameMeasure.pillX + accountNameMeasure.pillWidth - 1);
  expect(Math.abs((accountNameMeasure.pillY + accountNameMeasure.pillHeight / 2) - (accountNameMeasure.textY + accountNameMeasure.textHeight / 2))).toBeLessThanOrEqual(4);

  const groupMeasure = await measureInlineRow(page, 'Group');
  expect(groupMeasure.pillWidth).toBeLessThanOrEqual(70);
  expect(Math.abs(groupMeasure.pillHeight - 19.4)).toBeLessThanOrEqual(0.5);
  expect(groupMeasure.textX).toBeGreaterThan(groupMeasure.pillX + groupMeasure.pillWidth - 1);
  expect(Math.abs((groupMeasure.pillY + groupMeasure.pillHeight / 2) - (groupMeasure.textY + groupMeasure.textHeight / 2))).toBeLessThanOrEqual(4);

  const accountEmptyRows = ['Account type', 'Description', 'Credentials expire', 'Created by', 'Allow devices without AgentP to connect using this account'];
  for (const label of accountEmptyRows) {
    const field = page.locator('[class*="detailAgreementField"]').filter({ hasText: label }).first();
    await expect(field).toBeVisible();
    const row = field.locator('xpath=ancestor::*[contains(@class,"detailAgreementRow")][1]');
    const sources = row.locator('[class*="detailAgreementSources"]').first();
    await expect(sources).toHaveText('');
  }

  const sourceCountText = page.locator('[class*="detailSourceText"]').filter({ hasText: /\d+ source/ }).first();
  await expect(sourceCountText).toBeVisible();
  await expect(sourceCountText).toHaveCSS('color', 'rgb(93, 107, 120)');
  await expect(sourceCountText).toHaveCSS('font-size', '14px');
  await expect(sourceCountText).toHaveCSS('line-height', '20.3px');
});
