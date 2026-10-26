import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  fireEvent.change(search as HTMLInputElement, {
    target: { value: deviceName },
  });

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

function getExpectedPrototypeRawLines(
  record: { sourceFieldValues: Record<string, { valuesBySource?: Record<string, string | null>; fieldNamesBySource?: Record<string, string> }> },
  fieldKey: string,
) {
  const field = record.sourceFieldValues[fieldKey];
  if (!field || !field.valuesBySource) return [];

  const entries = Object.entries(field.valuesBySource)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([source, value]) => ({
      source,
      fieldName: field.fieldNamesBySource?.[source] ?? fieldKey,
      value: String(value),
    }));

  return entries.map(({ source, fieldName, value }) => `${source}  "${fieldName}": "${value}"`);
}

describe('AssetsTable raw values', () => {
  it('1. Device overview shows raw-values controls only on conflict rows and not on non-conflict rows.', async () => {
    await openDeviceOverview('MB-1175');

    const hostnameRow = Array.from(document.querySelectorAll('[class*="detailAgreementRow"]')).find((row) => (row.textContent ?? '').includes('Hostname'));
    expect(hostnameRow).not.toBeNull();
    expect((hostnameRow as Element).querySelector('button')).toBeNull();

    const osVersionRow = Array.from(document.querySelectorAll('[class*="detailAgreementRow"]')).find((row) => (row.textContent ?? '').includes('OS version'));
    expect(osVersionRow).not.toBeNull();
    expect((osVersionRow as Element).querySelector('button')).not.toBeNull();
  });

  it('2. Clicking expands only that row; the text becomes "Hide raw values" and aria-expanded is "true"; other conflict rows stay collapsed.', async () => {
    await openDeviceOverview('MB-1175');

    const buttons = Array.from(document.querySelectorAll('button[data-rr]'));
    expect(buttons.length).toBeGreaterThan(1);

    const osVersionButton = buttons.find((button) => button.getAttribute('data-rr') === 'osVersion') as HTMLButtonElement;
    const modelButton = buttons.find((button) => button.getAttribute('data-rr') === 'model') as HTMLButtonElement;
    expect(osVersionButton).toBeTruthy();
    expect(modelButton).toBeTruthy();

    fireEvent.click(osVersionButton);

    expect(osVersionButton.textContent).toBe('Hide raw values');
    expect(osVersionButton.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelectorAll('[class*="detailRawValues"]').length).toBe(1);
    expect(modelButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('3. Clicking again collapses it and the text returns to "View raw values".', async () => {
    await openDeviceOverview('MB-1175');

    const button = Array.from(document.querySelectorAll('button[data-rr]')).find((node) => node.getAttribute('data-rr') === 'osVersion') as HTMLButtonElement;
    fireEvent.click(button);
    expect(button.textContent).toBe('Hide raw values');

    fireEvent.click(button);
    expect(button.textContent).toBe('View raw values');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('4. Two different conflict rows can be open at the same time.', async () => {
    await openDeviceOverview('MB-1175');

    const osVersionButton = Array.from(document.querySelectorAll('button[data-rr]')).find((node) => node.getAttribute('data-rr') === 'osVersion') as HTMLButtonElement;
    const modelButton = Array.from(document.querySelectorAll('button[data-rr]')).find((node) => node.getAttribute('data-rr') === 'model') as HTMLButtonElement;
    expect(osVersionButton).toBeTruthy();
    expect(modelButton).toBeTruthy();

    fireEvent.click(osVersionButton);
    fireEvent.click(modelButton);

    expect(document.querySelectorAll('button[aria-expanded="true"]').length).toBe(2);
    expect(document.querySelectorAll('[class*="detailRawValues"]').length).toBe(2);
  });

  it('5. The expanded block has one line per source with that field, as: <Source>  "<field>": "<source\'s own value>" (assert exact text for device IOT-1049 osVersion, with each source\'s own value, not the merged value).', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);

    const osVersionButton = Array.from(document.querySelectorAll('button[data-rr]')).find((button) => button.getAttribute('data-rr') === 'osVersion') as HTMLButtonElement;
    fireEvent.click(osVersionButton);

    const rawText = (document.body.textContent ?? '');
    expect(rawText).toContain('CrowdStrike  "os_version": "12.1.472"');
    expect(rawText).toContain('SentinelOne  "osRevision": "12.1.472"');
    expect(rawText).toContain('Portnox AgentP  "os_version": "12.1.472"');
    expect(rawText).toContain('Active Directory  "operatingSystemVersion": "12.1.472"');
    expect(rawText).toContain('Okta  "osVersion": "11.1.472"');
    expect(rawText).not.toContain('Okta  "osVersion": "12.1.472"');
  });

  it('6. The raw lines for every conflict row in every record match the prototype rawRow text output.', async () => {
    const records = [...devices, ...accounts];

    for (const record of records) {
      const fieldKeys = Object.keys(record.sourceFieldValues ?? {}).filter((fieldKey) => record.sourceFieldValues[fieldKey]?.hasConflict);
      if (fieldKeys.length === 0) continue;

      cleanup();
      render(<AssetsTable />);

      const searchInput = document.querySelector('input[placeholder="Search devices, accounts, OS, location"]') as HTMLInputElement | null;
      if (searchInput) {
        fireEvent.change(searchInput, { target: { value: record.name } });
      }

      await waitFor(() => {
        const matches = Array.from(document.querySelectorAll('tbody tr')).filter((row) => (row.textContent ?? '').includes(record.name));
        expect(matches.length).toBeGreaterThan(0);
      });

      const tableRow = Array.from(document.querySelectorAll('tbody tr')).find((candidate) => (candidate.textContent ?? '').includes(record.name));
      expect(tableRow).not.toBeNull();
      fireEvent.click(tableRow as HTMLTableRowElement);

      for (const fieldKey of fieldKeys) {
        const field = record.sourceFieldValues[fieldKey];
        if (!field?.hasConflict || !field.valuesBySource) continue;

        cleanup();
        render(<AssetsTable />);

        const searchInput = document.querySelector('input[placeholder="Search devices, accounts, OS, location"]') as HTMLInputElement | null;
        if (searchInput) {
          fireEvent.change(searchInput, { target: { value: record.name } });
        }

        await waitFor(() => {
          const matches = Array.from(document.querySelectorAll('tbody tr')).filter((row) => (row.textContent ?? '').includes(record.name));
          expect(matches.length).toBeGreaterThan(0);
        });

        const tableRow = Array.from(document.querySelectorAll('tbody tr')).find((candidate) => (candidate.textContent ?? '').includes(record.name));
        expect(tableRow).not.toBeNull();
        fireEvent.click(tableRow as HTMLTableRowElement);

        const button = Array.from(document.querySelectorAll('button[data-rr]')).find((candidate) => candidate.getAttribute('data-rr') === fieldKey) as HTMLButtonElement | undefined;
        if (!button) continue;

        fireEvent.click(button);
        const rawLines = Array.from(document.querySelectorAll('[class*="detailRawValue"]'))
          .filter((line) => !(line.className.toString().includes('detailRawValues')))
          .map((line) => (line.textContent ?? '').trim());
        const expectedLines = getExpectedPrototypeRawLines(record, fieldKey);

        expect(rawLines).toEqual(expectedLines);
      }
    }
  }, 20000);

  it('7. Sources whose value differs from the majority are marked as different, and the majority lines are not.', async () => {
    await openDeviceOverview('MB-1175');

    const osVersionButton = Array.from(document.querySelectorAll('button[data-rr]')).find((node) => node.getAttribute('data-rr') === 'osVersion') as HTMLButtonElement;
    fireEvent.click(osVersionButton);

    const rawValues = Array.from(document.querySelectorAll('[class*="detailRawValue"]'))
      .filter((line) => !(line.className.toString().includes('detailRawValues')));
    const text = rawValues.map((line) => line.textContent ?? '').join('\n');

    expect(text).toContain('Google Workspace  "osVersion": "16.2.849"');
    expect(text).toContain('Portnox AgentP  "os_version": "17.2.849"');
    expect(rawValues.some((line) => line.className.includes('detailRawValueDiff'))).toBe(true);
    expect(rawValues.some((line) => line.className.includes('detailRawValueDiff') && (line.textContent ?? '').includes('Google Workspace'))).toBe(true);
    expect(rawValues.some((line) => !line.className.includes('detailRawValueDiff') && (line.textContent ?? '').includes('Portnox AgentP'))).toBe(true);
  });

  it('8. The same works for an account conflict row (group).', async () => {
    const account = accounts.find((entry) => entry.accountType === 'LDAP' && entry.sourceFieldValues.group?.hasConflict) ?? accounts[0];
    await openAccountOverview(account.name);

    const groupRow = Array.from(document.querySelectorAll('[class*="detailAgreementRow"]')).find((row) => (row.textContent ?? '').includes('Group')) as HTMLElement | undefined;
    expect(groupRow).toBeTruthy();

    const button = groupRow?.querySelector('button[data-rr]') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    fireEvent.click(button as HTMLButtonElement);

    const text = document.body.textContent ?? '';
    expect(text).toContain('"department":');
    expect(text).toContain('"profile.department":');
    expect(text).toContain('EntraID');
    expect(text).toContain('Active Directory');
    expect(text).toContain('Okta');
  });

  it('9. The "Last seen by sources" row has no button, and expanded text has no "null", "undefined" or "NaN".', async () => {
    const device = devices[7];
    await openDeviceOverview(device.name);

    const row = Array.from(document.querySelectorAll('[class*="detailOverviewLead"]')).find((candidate) => (candidate.textContent ?? '').includes('Last seen by sources')) as HTMLElement | undefined;
    if (row) {
      expect(row.querySelector('button')).toBeNull();
    } else {
      const fallbackRow = Array.from(document.querySelectorAll('[class*="detailAgreementRow"]')).find((candidate) => (candidate.textContent ?? '').includes('Last seen by sources')) as HTMLElement | undefined;
      expect(fallbackRow).toBeUndefined();
    }

    const text = (document.body.textContent ?? '').toLowerCase();
    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('nan');
  });
});
