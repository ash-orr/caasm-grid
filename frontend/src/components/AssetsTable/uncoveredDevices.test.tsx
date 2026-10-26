import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { applyDeviceFilters } from '../../filters/engine';
import { devices } from '../../mocks/generated/prototype-data';
import { AssetsTable } from './AssetsTable';
import { renderRiskScorePill, renderStatusCell } from './cellRenderers';
import { sortRowsBy } from './sort';

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

  it('opens the uncovered device detail panel with the prototype copy and null-safe values', async () => {
    render(<AssetsTable />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'SRV-1028' } });

    const matches = await screen.findAllByText(/SRV-1028/i);
    fireEvent.click(matches[0]);

    expect(screen.getByText(/Not available\. This device is not covered by Portnox AgentP, so only data from your connected sources is shown\./i)).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('Auth type')).toBeTruthy();
    expect(screen.getByText('Agent version')).toBeTruthy();
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
