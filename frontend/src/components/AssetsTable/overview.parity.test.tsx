import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { devices } from '../../mocks/generated/prototype-data';
import { AssetsTable } from './AssetsTable';
import { getSourceFieldAgreementRows } from './sourceAgreement';

beforeEach(() => {
  cleanup();
});
afterEach(() => {
  cleanup();
});

const device = devices[7];
const expectedDeviceOverviewLabels = [
  'Hostname',
  'Device type',
  'Vendor',
  'Device model',
  'OS',
  'OS version',
  'Location',
  'Motherboard serial number',
  'AgentP last reported',
  'Last connected to network',
  'Stale',
  'Last network authentication type',
  'MAC address',
  'Public IP',
  'Ethernet IP',
  'Network',
  'VLAN',
  'Port',
  'NAS name (NAS IP)',
  'Portnox AgentP',
  'Device ID',
];

async function openDeviceOverview(deviceName: string) {
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

describe('AssetsTable overview parity', () => {
  it('renders the exact device Overview column headers', async () => {
    await openDeviceOverview(device.name);

    const headers = Array.from(document.querySelectorAll('[class*="detailAgreementHeader"] > span')).map((node) => node.textContent?.trim());

    expect(headers).toEqual(['Field', 'Value', 'Sources']);
  });

  it('renders the exact device Overview row labels in prototype order', async () => {
    await openDeviceOverview(device.name);

    const labels = Array.from(document.querySelectorAll('[class*="detailAgreementField"]')).map((node) => node.textContent?.trim());

    expect(labels).toEqual(expectedDeviceOverviewLabels);
  });

  it('keeps AgentP last reported and Last connected to network as separate rows', async () => {
    await openDeviceOverview(device.name);

    const labels = Array.from(document.querySelectorAll('[class*="detailAgreementField"]')).map((node) => node.textContent?.trim());
    const agentpIndex = labels.indexOf('AgentP last reported');
    const connectedIndex = labels.indexOf('Last connected to network');

    expect(agentpIndex).toBeGreaterThan(-1);
    expect(connectedIndex).toBeGreaterThan(-1);
    expect(connectedIndex - agentpIndex).toBeGreaterThan(0);
  });

  it('does not render null, undefined or NaN in the device Overview', async () => {
    await openDeviceOverview(device.name);

    const text = (document.body.textContent ?? '').toLowerCase();

    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('nan');
  });

  it('clicking View raw values on one row expands only that row', async () => {
    await openDeviceOverview(device.name);

    const rawButtons = await screen.findAllByRole('button', { name: 'View raw values' });
    expect(rawButtons.length).toBeGreaterThan(0);

    fireEvent.click(rawButtons[0]);

    expect(document.querySelectorAll('[class*="detailRawValues"]').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Hide raw values' })).toBeTruthy();
  });

  it('lists each source value inside the expanded raw values', async () => {
    await openDeviceOverview(device.name);

    const rawButtons = await screen.findAllByRole('button', { name: 'View raw values' });
    fireEvent.click(rawButtons[0]);

    const raw = document.body.textContent ?? '';
    const row = getSourceFieldAgreementRows(device).find((entry) => entry.hasConflict) ?? getSourceFieldAgreementRows(device)[0];

    row.sources
      .filter((source) => source.value !== null)
      .forEach(({ source, value }) => {
        expect(raw).toContain(`${source}  "${row.fieldKey}": "${value}"`);
      });
  });

  it('renders different Sources text for a conflict row and an all-agree row', async () => {
    const rows = getSourceFieldAgreementRows(device);
    const conflictRow = rows.find((row) => row.hasConflict) ?? rows[0];
    const agreeRow = rows.find((row) => !row.hasConflict) ?? rows[0];

    await openDeviceOverview(device.name);

    const sourceEntries = Array.from(document.querySelectorAll('[class*="detailAgreementSources"]'))
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean) as string[];

    const conflictText = sourceEntries.find((entry) => entry.includes('Conflict')) ?? '';
    const agreeText = sourceEntries.find((entry) => entry.includes('Agree')) ?? '';

    expect(conflictText).toContain('Conflict');
    expect(agreeText).toContain(`Agree ${agreeRow.sourceCount} source${agreeRow.sourceCount === 1 ? '' : 's'}`);
    expect(conflictText).not.toBe(agreeText);
    expect(conflictRow.hasConflict).toBe(true);
    expect(agreeRow.hasConflict).toBe(false);
  });
});
