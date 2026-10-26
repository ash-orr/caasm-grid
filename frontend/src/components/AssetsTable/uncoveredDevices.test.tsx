import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyDeviceFilters } from '../../filters/engine';
import { devices } from '../../mocks/generated/prototype-data';
import { AssetsTable } from './AssetsTable';
import { renderRiskScorePill, renderStatusCell } from './cellRenderers';
import { buildSourceColumns, formatSourceCoverageText } from './sourceColumns';
import { SourceCoverageCard } from './SourceCoverageCard';
import { sortRowsBy } from './sort';

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe('uncovered devices', () => {
  it('renders null risk and status values as em dashes without pills', () => {
    const uncovered = devices.find((device) => device.name === 'SRV-1028')!;
    const { container } = render(
      <>
        {renderRiskScorePill(uncovered.riskScore)}
        {renderStatusCell(uncovered.status)}
      </>
    );

    expect(container.textContent).toContain('——');
    expect(screen.queryByTestId('risk-pill')).toBeNull();
    expect(screen.queryByTestId('status-pill')).toBeNull();
  });

  it('keeps uncovered devices last when sorting by risk score in both directions', () => {
    const rows = [
      devices.filter((device) => device.riskScore != null)[0],
      devices.find((device) => device.name === 'SRV-1028')!,
      devices.filter((device) => device.riskScore != null)[1],
    ];

    const ascending = sortRowsBy(rows, { columnId: 'riskScore', direction: 'asc' }, (row) => row.riskScore ?? null);
    const descending = sortRowsBy(rows, { columnId: 'riskScore', direction: 'desc' }, (row) => row.riskScore ?? null);

    expect(ascending[ascending.length - 1].name).toBe('SRV-1028');
    expect(descending[descending.length - 1].name).toBe('SRV-1028');
  });

  it('excludes uncovered devices from active risk and status filters but keeps them visible with no filter', () => {
    const uncovered = devices.find((device) => device.name === 'SRV-1028')!;

    const filtered = applyDeviceFilters(devices, {
      deviceType: [],
      os: [],
      location: [],
      accountType: [],
      group: [],
      riskScore: ['Access', 'Alert', 'Blocked'],
      status: ['Blocked', 'Archived', 'No issues'],
      lastConnected: [],
      sourceCoverage: [],
      manufacturer: [],
      model: [],
      createdTime: [],
      authRepo: [],
      nasSite: [],
      macVendor: [],
      nasIp: [],
      agentpLastReported: [],
      riskViolation: [],
      onThisDevice: [],
      agentpVersion: [],
      agentpVersionOlderThan: null,
    });

    expect(filtered.some((device) => device.name === 'SRV-1028')).toBe(false);
    expect(applyDeviceFilters(devices, defaultDeviceFilterState()).some((device) => device.name === 'SRV-1028')).toBe(true);
    expect(uncovered.riskScore).toBeNull();
    expect(uncovered.status).toBeNull();
  });

  it('shows Portnox first in the source-column headers when source columns are enabled', () => {
    const labels = buildSourceColumns('device').map((column) => column.label);

    expect(labels[0]).toBe('Portnox');
    expect(labels.slice(1)).toEqual(['CrowdStrike', 'Intune', 'Okta', 'Google', 'AD']);
  });

  it('starts the covered device source coverage text with Portnox', () => {
    const covered = devices.find((device) => device.riskScore != null && device.sourceCoverage['Portnox AgentP']?.status !== 'N/A')!;
    const sourceNames = (Object.entries(covered.sourceCoverage) as Array<[string, { status: string }]>).filter(
      ([, coverage]) => coverage.status !== 'N/A'
    ).map(([sourceName]) => sourceName);
    const text = formatSourceCoverageText(sourceNames);

    expect(text.startsWith('Portnox')).toBe(true);
  });

  it('shows Portnox AgentP as a Not present exposure gap for SRV-1028', () => {
    const uncovered = devices.find((device) => device.name === 'SRV-1028')!;
    const rows = Object.entries(uncovered.sourceCoverage)
      .map(([source, coverage]) => ({ source, status: coverage.status, lastSyncAt: coverage.lastSyncAt }))
      .filter((row) => row.status !== 'N/A');

    render(<SourceCoverageCard rows={rows} />);

    expect(screen.getByText('Portnox AgentP')).toBeTruthy();
    expect(screen.getByText('Not present')).toBeTruthy();
  });

  it('renders the uncovered device overview placeholders and keeps nullish strings out of the table', async () => {
    render(<AssetsTable />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'SRV-1028' } });

    const matches = await screen.findAllByText(/SRV-1028/i);
    fireEvent.click(matches[0]);

    const detailText = document.body.textContent ?? '';
    expect(detailText).toContain('Location');
    expect(detailText).toContain('AgentP last reported');
    expect(detailText).toContain('Last connected to network');
    expect(detailText).toContain('Last network authentication type');
    expect(detailText).toContain('Stale');
    expect(detailText).not.toMatch(/null|undefined|NaN/i);
  });

  it('keeps the covered device risk and status pills visible', () => {
    const covered = devices.find((device) => device.riskScore != null && device.status != null)!;
    render(<AssetsTable />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: covered.name } });

    expect(screen.getAllByTestId('risk-pill').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('status-pill').length).toBeGreaterThan(0);
  });

  it('opens the uncovered device detail panel with the prototype copy and null-safe values', async () => {
    render(<AssetsTable />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'SRV-1028' } });

    const matches = await screen.findAllByText(/SRV-1028/i);
    fireEvent.click(matches[0]);

    expect(screen.getByText(/Not available\. This device is not covered by Portnox AgentP, so only data from your connected sources is shown\./i)).toBeTruthy();
    expect(screen.getByText('Auth type')).toBeTruthy();
    expect(screen.getByText('Agent version')).toBeTruthy();
    expect(document.body.textContent ?? '').toContain('—');
    expect(document.body.textContent ?? '').not.toMatch(/null|undefined|NaN/i);
  });
});

function defaultDeviceFilterState() {
  return {
    deviceType: [],
    os: [],
    location: [],
    accountType: [],
    group: [],
    riskScore: [],
    status: [],
    lastConnected: [],
    sourceCoverage: [],
    manufacturer: [],
    model: [],
    createdTime: [],
    authRepo: [],
    nasSite: [],
    macVendor: [],
    nasIp: [],
    agentpLastReported: [],
    riskViolation: [],
    onThisDevice: [],
    agentpVersion: [],
    agentpVersionOlderThan: null,
  };
}
