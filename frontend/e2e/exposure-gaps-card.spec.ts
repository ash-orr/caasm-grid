import { expect, test } from '@playwright/test';
import { accounts, devices } from '../src/mocks/generated/prototype-data.ts';

const ISSUE_STATUSES = new Set(['Not present', 'Stale', 'Pending']);
const ACCOUNT_IDENTITY_SOURCES = ['Active Directory', 'EntraID', 'Okta', 'Google Workspace'];

function getDeviceWithIssues() {
  return devices.find((device) => {
    const states = Object.values(device.sourceCoverage).map((entry) => entry.status);
    return states.some((status) => ISSUE_STATUSES.has(status)) && states.some((status) => status === 'Reporting');
  }) ?? null;
}

function getDeviceAllReporting() {
  return devices.find((device) => {
    const states = Object.values(device.sourceCoverage).map((entry) => entry.status);
    return states.every((status) => status === 'Reporting' || status === 'N/A');
  }) ?? null;
}

function getAccountWithIdentityIssues() {
  return accounts.find((account) => {
    const states = ACCOUNT_IDENTITY_SOURCES.map((source) => account.sourceCoverage[source]?.status ?? 'N/A');
    return states.some((status) => ISSUE_STATUSES.has(status)) && states.some((status) => status === 'Reporting');
  }) ?? null;
}

async function searchAndOpenDevice(page: Parameters<typeof test>[0]['page'], deviceName: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devices' }).click();
  const search = page.getByPlaceholder('Search devices, accounts, OS, location');
  await search.fill(deviceName);
  await expect(page.locator('tbody tr').filter({ hasText: deviceName }).first()).toBeVisible();
  await page.locator('tbody tr').filter({ hasText: deviceName }).first().click();
}

async function searchAndOpenAccount(page: Parameters<typeof test>[0]['page'], accountName: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Accounts' }).click();
  const search = page.getByPlaceholder('Search accounts or groups');
  await search.fill(accountName);
  await expect(page.locator('tbody tr').filter({ hasText: accountName }).first()).toBeVisible();
  await page.locator('tbody tr').filter({ hasText: accountName }).first().click();
}

async function getExposureGapCard(page: Parameters<typeof test>[0]['page']) {
  return page.getByRole('heading', { name: 'Exposure gaps' }).locator('xpath=..');
}

async function readExposureGapRows(page: Parameters<typeof test>[0]['page']) {
  const card = await getExposureGapCard(page);
  const rowData = await card.locator('dl > div').evaluateAll((rows) =>
    rows.map((row) => {
      const source = row.querySelector('dt')?.textContent?.trim() ?? '';
      const dd = row.querySelector('dd');
      const chips = Array.from(dd?.querySelectorAll('span') ?? []).map((span) => span.textContent?.trim() ?? '');
      return { source, status: chips[0] ?? '', text: chips.join(' ') };
    })
  );
  const buttonText = await card.locator('button').first().textContent();
  return { rowData, buttonText: buttonText?.trim() ?? '' };
}

function normalizeCollapseState(buttonText: string, rows: Array<{ status: string }>) {
  const reporting = rows.filter((row) => row.status === 'Reporting').length;
  const notApplicable = rows.filter((row) => row.status === 'N/A').length;
  if (buttonText === 'Hide details') return { reporting, notApplicable };
  if (buttonText === 'See details') return { reporting, notApplicable };
  if (buttonText.startsWith('+')) {
    const match = buttonText.match(/^\+(\d+) Reporting(?:, (\d+) Not applicable)?$/);
    return {
      reporting: Number(match?.[1] ?? 0),
      notApplicable: Number(match?.[2] ?? 0),
    };
  }
  return { reporting, notApplicable };
}

test('device exposure gaps card shows collapsed issue rows and toggles the hidden-reporting link', async ({ page }) => {
  const device = getDeviceWithIssues();
  expect(device).not.toBeNull();

  await searchAndOpenDevice(page, device!.name);

  const initial = await readExposureGapRows(page);
  const visibleStatuses = initial.rowData.map((row) => row.status);

  expect(visibleStatuses.every((status) => ISSUE_STATUSES.has(status))).toBeTruthy();
  expect(initial.buttonText).toMatch(/^\+[0-9]+ Reporting(?:, [0-9]+ Not applicable)?$/);

  const expectedCounts = normalizeCollapseState(initial.buttonText, initial.rowData);
  expect(expectedCounts.reporting).toBeGreaterThan(0);
  expect(expectedCounts.notApplicable).toBeGreaterThanOrEqual(0);

  const card = await getExposureGapCard(page);
  await card.getByRole('button', { name: initial.buttonText }).click();
  await expect(card.getByRole('button', { name: 'Hide details' })).toBeVisible();

  const expanded = await readExposureGapRows(page);
  const totalSourceCount = Object.values(device.sourceCoverage).length;
  expect(expanded.rowData).toHaveLength(totalSourceCount);
  expect(expanded.rowData.some((row) => row.status === 'Reporting')).toBeTruthy();
  const trailingNotApplicable = expanded.rowData.filter((row) => row.status === 'N/A');
  if (trailingNotApplicable.length > 0) {
    expect(expanded.rowData.slice(-trailingNotApplicable.length).every((row) => row.status === 'N/A')).toBeTruthy();
  }

  await card.getByRole('button', { name: 'Hide details' }).click();
  const collapsedAgain = await readExposureGapRows(page);
  expect(collapsedAgain.rowData.every((row) => ISSUE_STATUSES.has(row.status))).toBeTruthy();

  const nextDevice = devices.find((item) => item.name !== device!.name && Object.values(item.sourceCoverage).some((entry) => ISSUE_STATUSES.has(entry.status)) && Object.values(item.sourceCoverage).some((entry) => entry.status === 'Reporting'));
  expect(nextDevice).not.toBeNull();
  await searchAndOpenDevice(page, nextDevice!.name);
  const resetCard = await readExposureGapRows(page);
  expect(resetCard.rowData.every((row) => ISSUE_STATUSES.has(row.status))).toBeTruthy();
});

test('device exposure gaps card shows all sources reporting and expands to full details', async ({ page }) => {
  const device = getDeviceAllReporting();
  expect(device).not.toBeNull();

  await searchAndOpenDevice(page, device!.name);

  const card = await getExposureGapCard(page);
  await expect(card).toContainText('All sources reporting');
  await expect(card.getByRole('button', { name: 'See details' })).toBeVisible();

  await card.getByRole('button', { name: 'See details' }).click();
  await expect(card.getByRole('button', { name: 'Hide details' })).toBeVisible();
  const expandedRows = await readExposureGapRows(page);
  expect(expandedRows.rowData.length).toBeGreaterThan(0);
});

test('account exposure gaps card uses identity sources and collapses only when the seeded data has an issue mix', async ({ page }) => {
  const account = getAccountWithIdentityIssues();
  expect(account).not.toBeNull();

  await searchAndOpenAccount(page, account!.name);

  const { rowData, buttonText } = await readExposureGapRows(page);
  const identityRows = rowData.filter((row) => ACCOUNT_IDENTITY_SOURCES.includes(row.source));
  expect(identityRows.length).toBeGreaterThan(0);
  expect(identityRows.every((row) => ISSUE_STATUSES.has(row.status))).toBeTruthy();
  expect(buttonText).toMatch(/^\+[0-9]+ Reporting(?:, [0-9]+ Not applicable)?$/);

  const card = await getExposureGapCard(page);
  await card.getByRole('button', { name: buttonText }).click();
  await expect(card.getByRole('button', { name: 'Hide details' })).toBeVisible();

  const expanded = await readExposureGapRows(page);
  expect(expanded.rowData).toHaveLength(ACCOUNT_IDENTITY_SOURCES.length);
  const trailingNotApplicable = expanded.rowData.filter((row) => row.status === 'N/A');
  if (trailingNotApplicable.length > 0) {
    expect(expanded.rowData.slice(-trailingNotApplicable.length).every((row) => row.status === 'N/A')).toBeTruthy();
  }

  await card.getByRole('button', { name: 'Hide details' }).click();
  const collapsed = await readExposureGapRows(page);
  expect(collapsed.rowData.every((row) => ISSUE_STATUSES.has(row.status))).toBeTruthy();
});
