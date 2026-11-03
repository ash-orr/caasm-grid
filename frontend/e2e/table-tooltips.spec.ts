import { expect, test } from '@playwright/test';
import { devices } from '../src/mocks/generated/prototype-data';

const riskCategory = (score: number | null): 'Access' | 'Alert' | 'Blocked' => {
  if (score == null) return 'Access';
  if (score >= 70) return 'Blocked';
  if (score >= 40) return 'Alert';
  return 'Access';
};

test.describe('table cell tooltips', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('label').filter({ hasText: 'Rows per page' }).locator('select').selectOption({ value: '-1' });
  });

  test('Devices table Account cell tooltip shows labels Account, Type, Group, Devices, Exposure gap', async ({ page }) => {
    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: 'drew@acme.com' }).first();

    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveCSS('border-bottom-style', 'dotted');

    await trigger.hover();

    const tooltip = page.getByRole('tooltip').filter({ hasText: 'Account' }).first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Account');
    await expect(tooltip).toContainText('Type');
    await expect(tooltip).toContainText('Group');
    await expect(tooltip).toContainText('Devices');
    await expect(tooltip).toContainText('Exposure gap');
  });

  test('Accounts table Devices count > 0 shows headers Device, Type, Risk score, Last connected, Exposure gap and at most 3 device rows', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: '5' }).first();

    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveCSS('border-bottom-style', 'dotted');

    await trigger.hover();

    const tooltip = page.getByRole('tooltip').first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Device');
    await expect(tooltip).toContainText('Type');
    await expect(tooltip).toContainText('Risk score');
    await expect(tooltip).toContainText('Last connected');
    await expect(tooltip).toContainText('Exposure gap');
    await expect(tooltip).not.toContainText('SRV-1791');
  });

  test('a row with more than 3 devices shows "+N more" with the correct N', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: '5' }).first();
    await trigger.hover();

    await expect(page.getByRole('tooltip').first()).toContainText('+2 more');
  });

  test('A Devices count of 0 has no dotted underline and no tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const row = page.locator('tbody tr').filter({ hasText: 'parker@acme.com' }).first();
    const trigger = row.locator('td').filter({ hasText: /^0$/ }).first();

    await expect(trigger).toBeVisible();
    await expect(trigger).not.toHaveCSS('border-bottom-style', 'dotted');

    await trigger.hover();
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  });

  test('Account cell and Devices count have border-bottom-style dotted', async ({ page }) => {
    const deviceRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const deviceAccountTrigger = deviceRow.locator('span').filter({ hasText: 'drew@acme.com' }).first();
    await expect(deviceAccountTrigger).toHaveCSS('border-bottom-style', 'dotted');

    await page.getByRole('button', { name: 'Accounts' }).click();
    const accountRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const countTrigger = accountRow.locator('span').filter({ hasText: '5' }).first();
    await expect(countTrigger).toHaveCSS('border-bottom-style', 'dotted');
  });

  test('moving the mouse away hides the tooltip', async ({ page }) => {
    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: 'drew@acme.com' }).first();

    await trigger.hover();
    const tooltip = page.getByRole('tooltip').filter({ hasText: 'Account' }).first();
    await expect(tooltip).toBeVisible();

    await page.mouse.move(20, 20);
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  });

  test('Account tooltip matches the prototype layout and styling', async ({ page }) => {
    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: 'drew@acme.com' }).first();
    await trigger.hover();

    const tooltip = page.getByRole('tooltip').filter({ hasText: 'Account' }).first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveCSS('font-size', '12.5px');
    await expect(tooltip).toHaveCSS('padding', '12px 14px');
    await expect(tooltip).toHaveCSS('border-radius', '8px');
    await expect(tooltip).toHaveCSS('border-color', 'rgb(220, 226, 232)');
    await expect(tooltip).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(tooltip.locator('svg')).toHaveCount(0);

    const label = tooltip.locator('span').filter({ hasText: 'Account' }).first();
    await expect(label).toHaveCSS('color', 'rgb(93, 107, 120)');
    await expect(tooltip).toContainText('Account');
    await expect(tooltip).toContainText('Type');
    await expect(tooltip).toContainText('Group');
    await expect(tooltip).toContainText('Devices');
    await expect(tooltip).toContainText('Exposure gap');
    await expect(tooltip).not.toContainText(':');
    await expect(tooltip.locator('strong')).toHaveCount(1);
  });

  test('Devices tooltip matches the prototype layout and styling', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();
    const row = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const trigger = row.locator('span').filter({ hasText: '5' }).first();
    await trigger.hover();

    const tooltip = page.getByRole('tooltip').first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Device');
    await expect(tooltip).toContainText('Type');
    await expect(tooltip).toContainText('Risk score');
    await expect(tooltip).toContainText('Last connected');
    await expect(tooltip).toContainText('Exposure gap');
    await expect(tooltip.locator('text=+2 more')).toBeVisible();
    await expect(tooltip.locator('strong')).toHaveCount(3);
  });

  test('the current line is shown for rows with history and rows without history', async ({ page }) => {
    for (const rowName of ['MB-1119', 'LT-1000']) {
      const row = page.locator('tbody tr').filter({ hasText: rowName }).first();
      const trigger = row.locator('[data-testid="risk-pill"]').first();

      await expect(trigger).toBeVisible();
      await trigger.hover();

      const scoreText = await trigger.textContent();
      const score = Number(scoreText?.trim());
      expect(Number.isFinite(score)).toBeTruthy();

      const tooltip = rowName === 'LT-1000'
        ? page.getByRole('tooltip').filter({ hasText: 'No changes in the last 7 days' }).first()
        : page.getByRole('tooltip').filter({ hasText: 'Risk score changes, last 7 days' }).first();

      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(`Current: ${score} (${riskCategory(score)})`);
      const currentLine = tooltip.locator('div').filter({ hasText: /^Current:/ }).first();
      await expect(currentLine).toHaveCSS('color', 'rgb(93, 107, 120)');

      await page.mouse.move(20, 20);
      await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
    }
  });

  test('a named row that has history shows the arrowed history lines in newest-first order with categories in parentheses', async ({ page }) => {
    const rowName = 'MB-1119';
    const device = devices.find((entry) => entry.name === rowName);
    expect(device).toBeTruthy();
    expect(device?.changes.length).toBeGreaterThan(1);

    const row = page.locator('tbody tr').filter({ hasText: rowName }).first();
    const trigger = row.locator('[data-testid="risk-pill"]').first();

    await trigger.hover();
    const tooltip = page.getByRole('tooltip').filter({ hasText: 'Risk score changes, last 7 days' }).first();
    const tooltipText = await tooltip.textContent();

    expect(tooltipText).toContain('→');
    expect(tooltipText).toContain(`Current: ${device!.riskScore} (${riskCategory(device!.riskScore)})`);

    const [newest, previous] = device!.changes;
    const newestLine = `${newest.from} (${riskCategory(newest.from)}) → ${newest.to} (${riskCategory(newest.to)})`;
    const previousLine = `${previous.from} (${riskCategory(previous.from)}) → ${previous.to} (${riskCategory(previous.to)})`;

    expect(tooltipText).toContain(newestLine);
    expect(tooltipText).toContain(previousLine);
    expect(tooltipText!.indexOf(newestLine)).toBeLessThan(tooltipText!.indexOf(previousLine));
  });

  test('a named row with no history shows only the empty-history message and current score', async ({ page }) => {
    const rowName = 'LT-1000';
    const device = devices.find((entry) => entry.name === rowName);
    expect(device).toBeTruthy();
    expect(device?.changes.length).toBe(0);

    const row = page.locator('tbody tr').filter({ hasText: rowName }).first();
    const trigger = row.locator('[data-testid="risk-pill"]').first();

    await trigger.hover();
    const tooltip = page.getByRole('tooltip').filter({ hasText: 'No changes in the last 7 days' }).first();
    const tooltipText = await tooltip.textContent();

    const scoreText = await trigger.textContent();
    const score = Number(scoreText?.trim());
    expect(Number.isFinite(score)).toBeTruthy();
    const expectedCurrent = `Current: ${score} (${riskCategory(score)})`;

    expect(tooltipText).toContain('No changes in the last 7 days');
    expect(tooltipText).toContain(expectedCurrent);
    expect(tooltipText).not.toContain('Risk score changes, last 7 days');

    const emptyLine = tooltip.locator('div').filter({ hasText: /^No changes in the last 7 days$/ }).first();
    await expect(emptyLine).toHaveCSS('font-weight', '600');
    await expect(emptyLine).toHaveCSS('color', 'rgb(20, 33, 43)');

    const currentLine = tooltip.locator('div').filter({ hasText: /^Current:/ }).first();
    await expect(currentLine).toHaveCSS('color', 'rgb(93, 107, 120)');
    await expect(currentLine).toHaveCSS('margin-top', '2px');
  });

  test('the risk tooltip heading has weight 600 and the current line uses the muted subtitle color', async ({ page }) => {
    const rowName = 'MB-1119';
    const row = page.locator('tbody tr').filter({ hasText: rowName }).first();
    const trigger = row.locator('[data-testid="risk-pill"]').first();

    await trigger.hover();
    const tooltip = page.getByRole('tooltip').filter({ hasText: 'Risk score changes, last 7 days' }).first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('div').first()).toHaveCSS('font-weight', '600');

    const currentLine = tooltip.locator('div').filter({ hasText: /^Current:/ }).first();
    await expect(currentLine).toHaveCSS('color', 'rgb(93, 107, 120)');
  });

  test('a device without a score has no tooltip', async ({ page }) => {
    const rowName = 'SRV-1028';
    const device = devices.find((entry) => entry.name === rowName);
    expect(device).toBeTruthy();
    expect(device?.riskScore).toBeNull();

    const row = page.locator('tbody tr').filter({ hasText: rowName }).first();
    const trigger = row.locator('td').filter({ hasText: '—' }).first();

    await expect(trigger).toBeVisible();
    await trigger.hover();
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  });

  test('moving the mouse away hides the risk tooltip', async ({ page }) => {
    const rowName = 'MB-1119';
    const row = page.locator('tbody tr').filter({ hasText: rowName }).first();
    const trigger = row.locator('[data-testid="risk-pill"]').first();

    await trigger.hover();
    await expect(page.getByRole('tooltip')).toHaveCount(1);

    await page.mouse.move(20, 20);
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);
  });

  test('Accounts blocked status pill keeps exact text and styling inside the tooltip wrapper', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();
    await page.locator('label').filter({ hasText: 'Rows per page' }).locator('select').selectOption({ value: '-1' });

    const blockedPill = page.locator('tbody [data-testid="status-pill"]').filter({ hasText: /^Blocked$/ }).first();
    await expect(blockedPill).toHaveText('Blocked');
    await expect(blockedPill).toHaveCSS('font-size', '12px');
    await expect(blockedPill).toHaveCSS('padding', '1px 8px');
    await expect(blockedPill).toHaveCSS('border-radius', '10px');
  });

  test('a red Blocked pill in Accounts and in Devices shows "Blocked by Admin" or "Blocked by Policy" text matching the row\'s mock data, and a Not blocked pill shows no tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'Accounts' }).click();

    const accountRow = page.locator('tbody tr').filter({ hasText: 'drew@acme.com' }).first();
    const blockedPill = accountRow.locator('span').filter({ hasText: 'Blocked' }).first();
    await blockedPill.hover();

    const accountTooltip = page.getByRole('tooltip').first();
    await expect(accountTooltip).toContainText('Blocked by Admin');
    await expect(accountTooltip).toContainText('Marcus Lee');

    const safeRow = page.locator('tbody tr').filter({ hasText: 'avery@acme.com' }).first();
    const safePill = safeRow.locator('span').filter({ hasText: 'Not blocked' }).first();
    await safePill.hover();
    await expect(page.locator('[role="tooltip"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Devices' }).nth(0).click();
    const deviceRow = page.locator('tbody tr').filter({ hasText: 'MB-1119' }).first();
    const deviceBlockedPill = deviceRow.locator('span').filter({ hasText: 'Blocked' }).first();
    await deviceBlockedPill.hover();

    const deviceTooltip = page.getByRole('tooltip').first();
    await expect(deviceTooltip).toContainText('Blocked by Policy');
    await expect(deviceTooltip).toContainText('Stale_Device_Policy');
  });
});
