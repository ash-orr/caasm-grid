import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { accounts } from '../../mocks/generated/prototype-data';
import { AssetsTable } from './AssetsTable';

beforeEach(() => {
  cleanup();
});
afterEach(() => {
  cleanup();
});

async function openAccountOverview(accountName: string) {
  cleanup();
  render(<AssetsTable />);

  fireEvent.click(screen.getByRole('button', { name: 'Accounts' }));

  const search = document.querySelector('input[placeholder="Search accounts or groups"]') as HTMLInputElement | null;
  expect(search).not.toBeNull();

  fireEvent.change(search as HTMLInputElement, { target: { value: accountName } });

  await waitFor(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr')).filter((row) => (row.textContent ?? '').includes(accountName));
    expect(rows.length).toBeGreaterThan(0);
  });

  const row = Array.from(document.querySelectorAll('tbody tr')).find((candidate) => (candidate.textContent ?? '').includes(accountName));
  expect(row).not.toBeNull();

  fireEvent.click(row as HTMLTableRowElement);
}

function collectAccountOverviewLabels() {
  return Array.from(document.querySelectorAll('[class*="detailAgreementField"]')).map((node) => node.textContent?.trim()).filter((value): value is string => Boolean(value));
}

describe('AssetsTable account overview parity', () => {
  it('renders the exact account Overview column headers', async () => {
    const account = accounts.find((entry) => entry.accountType === 'MAC') ?? accounts[0];
    await openAccountOverview(account.name);

    const headers = Array.from(document.querySelectorAll('[class*="detailAgreementHeader"] > span')).map((node) => node.textContent?.trim());
    expect(headers).toEqual(['Field', 'Value', 'Sources']);
  });

  it('renders the exact MAC account Overview row labels in prototype order', async () => {
    const account = accounts.find((entry) => entry.accountType === 'MAC') ?? accounts[0];
    await openAccountOverview(account.name);

    expect(collectAccountOverviewLabels()).toEqual([
      'Account name',
      'Account type',
      'Group',
      'Description',
      'Credentials expire',
      'Created by',
      'Allow devices without AgentP to connect using this account',
      'Total MAC addresses',
      'Total MAC vendors',
    ]);
  });

  it('renders the exact LDAP account Overview row labels in prototype order', async () => {
    const account = accounts.find((entry) => entry.accountType === 'LDAP') ?? accounts[0];
    await openAccountOverview(account.name);

    expect(collectAccountOverviewLabels()).toEqual([
      'Account name',
      'Account type',
      'Group',
      'Description',
      'Credentials expire',
      'Created by',
      'Allow devices without AgentP to connect using this account',
    ]);
  });

  it('shows Last login by sources with Today or N days ago and a Reported by source list', async () => {
    const account = accounts.find((entry) => entry.accountType === 'LDAP') ?? accounts[0];
    await openAccountOverview(account.name);

    expect(screen.getByText(/Last login by sources/i)).toBeTruthy();
    const leadText = (document.body.textContent ?? '');
    expect(leadText).toMatch(/Today|\d+ days ago/);
    expect(leadText).toContain('Reported by');
  });

  it('renders the summary pill as All sources agree or N field(s) differ across sources', async () => {
    const account = accounts.find((entry) => entry.accountType === 'LDAP') ?? accounts[0];
    await openAccountOverview(account.name);

    const summary = document.body.textContent ?? '';
    expect(summary).toMatch(/All sources agree|\d+ field(s)? differ across sources|1 field differs across sources/);
  });

  it('shows MAC-based for MAC accounts and LDAP or Cloud otherwise', async () => {
    const macAccount = accounts.find((entry) => entry.accountType === 'MAC') ?? accounts[0];
    const ldapAccount = accounts.find((entry) => entry.accountType === 'LDAP') ?? accounts[0];

    await openAccountOverview(macAccount.name);
    expect(screen.getAllByText('MAC-based').length).toBeGreaterThan(0);

    await openAccountOverview(ldapAccount.name);
    expect(screen.getAllByText('LDAP').length).toBeGreaterThan(0);
  });

  it('renders Description as em dash when empty and Credentials expire as Never or a medium date and short time', async () => {
    const macAccount = accounts.find((entry) => entry.accountType === 'MAC') ?? accounts[0];
    await openAccountOverview(macAccount.name);

    const text = document.body.textContent ?? '';
    expect(text).toContain('Description');
    expect(text).toContain('Credentials expire');
    expect(text).toMatch(/Never|\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM)/);
  });

  it('renders the allow devices without AgentP row as Yes or No', async () => {
    const account = accounts.find((entry) => entry.accountType === 'MAC') ?? accounts[0];
    await openAccountOverview(account.name);

    const text = document.body.textContent ?? '';
    expect(text).toContain('Allow devices without AgentP to connect using this account');
    expect(text).toMatch(/Yes|No/);
  });

  it('shows Agreement text only for Account name and Group and leaves other rows empty in the Sources cell', async () => {
    const account = accounts.find((entry) => entry.accountType === 'LDAP') ?? accounts[0];
    await openAccountOverview(account.name);

    const rows = Array.from(document.querySelectorAll('[class*="detailAgreementRow"]'));
    expect(rows.some((row) => (row.textContent ?? '').includes('Account name') && (row.textContent ?? '').includes('Agree'))).toBe(true);
    expect(rows.some((row) => (row.textContent ?? '').includes('Group') && (row.textContent ?? '').includes('Agree'))).toBe(true);
    const nonAgreementRows = rows.filter((row) => !(row.textContent ?? '').includes('Account name') && !(row.textContent ?? '').includes('Group'));
    expect(nonAgreementRows.every((row) => !(row.textContent ?? '').includes('Agree') && !(row.textContent ?? '').includes('Conflict'))).toBe(true);
  });

  it('clicking View raw values on one conflict row expands only that row', async () => {
    const account = accounts.find((entry) =>
      entry.accountType === 'LDAP' && Object.values(entry.sourceFieldValues ?? {}).some((field) => field?.hasConflict)
    ) ?? accounts.find((entry) => entry.accountType === 'LDAP') ?? accounts[0];
    await openAccountOverview(account.name);

    const rawButtons = screen.queryAllByRole('button', { name: 'View raw values' });
    expect(rawButtons.length).toBeGreaterThan(0);

    fireEvent.click(rawButtons[0]);
    expect(document.querySelectorAll('[class*="detailRawValues"]').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Hide raw values' })).toBeTruthy();
  });

  it('does not render null, undefined or NaN in the account Overview', async () => {
    const account = accounts.find((entry) => entry.accountType === 'MAC') ?? accounts[0];
    await openAccountOverview(account.name);

    const text = (document.body.textContent ?? '').toLowerCase();
    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('nan');
  });

  it('does not render the MAC rows for a LDAP or Cloud account', async () => {
    const account = accounts.find((entry) => entry.accountType === 'LDAP') ?? accounts[0];
    await openAccountOverview(account.name);

    expect(screen.queryByText('Total MAC addresses')).toBeNull();
    expect(screen.queryByText('Total MAC vendors')).toBeNull();
  });
});
