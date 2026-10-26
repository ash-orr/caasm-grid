import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { accounts, devices } from '../../mocks/generated/prototype-data';
import { AssetsTable } from './AssetsTable';

beforeEach(() => {
  cleanup();
});
afterEach(() => {
  cleanup();
});

async function openDeviceOverview(deviceName: string) {
  cleanup();
  render(<AssetsTable />);

  const search = document.querySelector('input[placeholder="Search devices, accounts, OS, location"]') as HTMLInputElement | null;
  expect(search).not.toBeNull();

  fireEvent.change(search as HTMLInputElement, { target: { value: deviceName } });

  await waitFor(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr')).filter((row) => (row.textContent ?? '').includes(deviceName));
    expect(rows.length).toBeGreaterThan(0);
  });

  const row = Array.from(document.querySelectorAll('tbody tr')).find((candidate) => (candidate.textContent ?? '').includes(deviceName));
  expect(row).not.toBeNull();

  fireEvent.click(row as HTMLTableRowElement);
}

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

describe('AssetsTable exposure coverage', () => {
  it('renders the device and account tab labels exactly', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);

    expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exposure coverage' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'On this device' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Alerts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ZTNA access' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connection history' })).toBeTruthy();

    const account = accounts[0];
    await openAccountOverview(account.name);

    expect(screen.getByRole('button', { name: 'Overview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exposure coverage' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Alerts' })).toBeTruthy();
  });

  it('does not render a heading inside the Exposure coverage tab', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    expect(screen.queryByRole('heading', { name: 'Exposure coverage' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: 'Exposure coverage' })).toBeNull();
  });

  it('renders a Find a source search box above the table with the prototype placeholder and aria-label', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    const input = screen.getByRole('searchbox', { name: 'Find a source' }) as HTMLInputElement;
    expect(input.placeholder).toBe('Find a source');
    expect(input.getAttribute('aria-label')).toBe('Find a source');
  });

  it('renders the Exposure coverage table columns as Source | Status | Last seen', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    const headers = Array.from(document.querySelectorAll('[class*="detailAgreementHeader"] > span')).map((node) => node.textContent?.trim());
    expect(headers).toEqual(['Source', 'Status', 'Last seen']);
    expect(document.querySelector('[class*="detailAgreementTable"]')).not.toBeNull();
  });

  it('shows one row per connected source, and account tabs only show account identity sources', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    const deviceRows = Array.from(document.querySelectorAll('[class*="detailAgreementField"]')).map((node) => node.textContent?.trim())
      .filter((value): value is string => Boolean(value));
    const expectedDeviceSources = Object.entries(device.sourceCoverage)
      .map(([source, value]) => ({ source, status: value.status }))
      .filter((entry) => entry.status !== 'N/A')
      .sort((left, right) => {
        const order = { 'Not present': 0, Stale: 1, Pending: 2, Reporting: 3, 'N/A': 4 } as const;
        return (order[left.status as keyof typeof order] ?? 99) - (order[right.status as keyof typeof order] ?? 99) || left.source.localeCompare(right.source);
      })
      .map((entry) => entry.source);

    expect(deviceRows.length).toBe(expectedDeviceSources.length);
    expect(deviceRows).toEqual(expectedDeviceSources);

    const account = accounts[0];
    await openAccountOverview(account.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    const accountRows = Array.from(document.querySelectorAll('[class*="detailAgreementField"]')).map((node) => node.textContent?.trim());
    const expectedAccountSources = Object.entries(account.sourceCoverage)
      .filter(([source]) => ['Active Directory', 'EntraID', 'Okta', 'Google Workspace'].includes(source))
      .filter(([, value]) => value.status !== 'N/A')
      .map(([source]) => source);
    expect(expectedAccountSources.length).toBeGreaterThan(0);
    expect(accountRows.filter(Boolean)).toHaveLength(expectedAccountSources.length);
  });

  it('sorts rows by status order first, then by name, using the Exposure gaps card priority', async () => {
    const device = devices[7];

    await openDeviceOverview(device.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    const labels = Array.from(document.querySelectorAll('[class*="detailAgreementField"]')).map((node) => node.textContent?.trim()) as string[];
    const expected = Object.entries(device.sourceCoverage)
      .map(([source, value]) => ({ source, status: value.status }))
      .filter((entry) => entry.status !== 'N/A')
      .sort((left, right) => {
        const order = { 'Not present': 0, Stale: 1, Pending: 2, Reporting: 3, 'N/A': 4 } as const;
        return (order[left.status as keyof typeof order] ?? 99) - (order[right.status as keyof typeof order] ?? 99) || left.source.localeCompare(right.source);
      })
      .map((entry) => entry.source);

    expect(labels).toEqual(expected);
  });

  it('keeps the Exposure coverage tab expanded with no +N reporting link', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    const tabScope = screen.getByRole('button', { name: 'Exposure coverage' }).closest('div');
    expect(tabScope).not.toBeNull();
    expect(within(tabScope as HTMLElement).queryByRole('button', { name: /\+\d/ })).toBeNull();
    expect(within(tabScope as HTMLElement).queryByRole('button', { name: 'Hide details' })).toBeNull();
    expect(within(tabScope as HTMLElement).queryByRole('button', { name: 'See details' })).toBeNull();
  });

  it('filters rows live by a case-insensitive source substring and shows the exact no-match message', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    const input = screen.getByRole('searchbox', { name: 'Find a source' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sent' } });

    const visible = Array.from(document.querySelectorAll('[class*="detailAgreementField"]')).map((node) => node.textContent?.trim());
    expect(visible.some((value) => value?.toLowerCase().includes('sent'))).toBe(true);
    expect(visible.some((value) => value?.toLowerCase().includes('intune'))).toBe(false);

    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('No sources match "zzz".')).toBeTruthy();
  });

  it('clears the search when opening another record, but keeps it when switching tabs on the same record', async () => {
    const deviceOne = devices[7];
    const deviceTwo = devices[8];

    await openDeviceOverview(deviceOne.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));
    const input = screen.getByRole('searchbox', { name: 'Find a source' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sent' } });

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));
    expect((screen.getByRole('searchbox', { name: 'Find a source' }) as HTMLInputElement).value).toBe('sent');

    await openDeviceOverview(deviceTwo.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));
    expect((screen.getByRole('searchbox', { name: 'Find a source' }) as HTMLInputElement).value).toBe('');
  });

  it('shows No connected sources. when there are no connected sources', async () => {
    const account = accounts.find((entry) => Object.values(entry.sourceCoverage).every((cell) => cell.status === 'N/A')) ?? accounts[0];

    await openAccountOverview(account.name);
    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));

    expect(screen.getByText('No connected sources.')).toBeTruthy();
  });

  it('shows the warning icon only on the Overview tab, never on Exposure coverage', async () => {
    const device = devices.find((entry) => {
      const rows = Object.values(entry.sourceCoverage).map((value) => value.status);
      const unique = new Set(rows.filter((status) => status !== 'N/A'));
      return unique.has('Reporting') && unique.has('Not present');
    }) ?? devices[7];

    await openDeviceOverview(device.name);
    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    expect(overviewTab.textContent).toContain('⚠');

    fireEvent.click(screen.getByRole('button', { name: 'Exposure coverage' }));
    expect(screen.getByRole('button', { name: 'Exposure coverage' }).textContent).not.toContain('⚠');
  });
});
