import { describe, expect, it } from 'vitest';
import type { SourceCoverageRow } from './sourceCoverage';
import {
  buildSourceColumns,
  formatCoverageGapText,
  formatSourceCoverageText,
  getDefaultVisibleDeviceColumnIds,
  getSourceColumnLabel,
} from './sourceColumns';
import {
  formatSourceSyncAge,
  getExposureGapCardState,
  sortSourceCoverageRows,
} from './sourceCoverage';

describe('source column helpers', () => {
  it('uses short labels for source headers', () => {
    expect(getSourceColumnLabel('Portnox AgentP')).toBe('AgentP');
    expect(getSourceColumnLabel('Active Directory')).toBe('AD');
    expect(getSourceColumnLabel('Google Workspace')).toBe('Google');
    expect(getSourceColumnLabel('Absolute Secure Endpoint')).toBe('ASE');
  });

  it('keeps source coverage visible immediately after exposure gaps by default', () => {
    const visibleColumns = getDefaultVisibleDeviceColumnIds();

    expect(visibleColumns).toContain('createdTime');
    expect(visibleColumns.indexOf('createdTime')).toBeLessThan(visibleColumns.indexOf('coverageGaps'));
    expect(visibleColumns.indexOf('coverageGaps')).toBeLessThan(visibleColumns.indexOf('sourceCoverage'));
  });

  it('formats exposure gaps like the prototype', () => {
    expect(formatCoverageGapText([])).toBe('None');
    expect(formatCoverageGapText(['CrowdStrike'])).toBe('CrowdStrike');
    expect(formatCoverageGapText(['CrowdStrike', 'Okta'])).toBe('CrowdStrike, Okta');
    expect(formatCoverageGapText(['CrowdStrike', 'Okta', 'Google Workspace', 'Active Directory'])).toContain(', +2');
  });

  it('formats source coverage as the short labels and the count takes precedence for sorting', () => {
    expect(formatSourceCoverageText([])).toBe('—');
    expect(formatSourceCoverageText(['CrowdStrike'])).toBe('CrowdStrike');
    expect(formatSourceCoverageText(['CrowdStrike', 'Google Workspace', 'Active Directory'])).toBe('CrowdStrike, Google, AD');
  });

  it('orders device and account source columns by the prototype source type order', () => {
    expect(buildSourceColumns('device').map((column) => column.id)).toEqual([
      'source:CrowdStrike',
      'source:Intune',
      'source:Okta',
      'source:Google Workspace',
      'source:Active Directory',
      'source:Portnox AgentP',
    ]);

    expect(buildSourceColumns('account').map((column) => column.id)).toEqual([
      'source:Okta',
      'source:Google Workspace',
      'source:Active Directory',
      'source:EntraID',
    ]);
  });

  it('sorts the exposure-gap rows by the prototype status order and then source name', () => {
    const rows: SourceCoverageRow[] = [
      { source: 'Google Workspace', status: 'Reporting', lastSyncAt: '2026-10-17T12:00:00.000Z' },
      { source: 'Active Directory', status: 'Not present', lastSyncAt: null },
      { source: 'Portnox AgentP', status: 'Stale', lastSyncAt: '2026-10-10T00:00:00.000Z' },
      { source: 'CrowdStrike', status: 'Pending', lastSyncAt: null },
      { source: 'Okta', status: 'N/A', lastSyncAt: '2026-10-15T00:00:00.000Z' },
    ];

    expect(sortSourceCoverageRows(rows).map((row) => row.source)).toEqual([
      'Active Directory',
      'Portnox AgentP',
      'CrowdStrike',
      'Google Workspace',
      'Okta',
    ]);
  });

  it('keeps only issue rows visible by default and shows the hidden counts in the toggle label', () => {
    const rows: SourceCoverageRow[] = [
      { source: 'CrowdStrike', status: 'Reporting', lastSyncAt: '2026-10-17T12:00:00.000Z' },
      { source: 'EntraID', status: 'Not present', lastSyncAt: null },
      { source: 'Okta', status: 'Stale', lastSyncAt: '2026-10-10T00:00:00.000Z' },
      { source: 'Google Workspace', status: 'N/A', lastSyncAt: '2026-10-15T00:00:00.000Z' },
    ];

    const state = getExposureGapCardState(rows, false);

    expect(state.visibleRows.map((row) => row.source)).toEqual(['EntraID', 'Okta']);
    expect(state.toggleLabel).toBe('+1 Reporting, 1 Not applicable');
    expect(state.showToggle).toBe(true);
  });

  it('shows the all-sources-reporting state when there are no issues', () => {
    const rows: SourceCoverageRow[] = [
      { source: 'Google Workspace', status: 'Reporting', lastSyncAt: '2026-10-17T12:00:00.000Z' },
      { source: 'Okta', status: 'Reporting', lastSyncAt: '2026-10-16T18:00:00.000Z' },
    ];

    const state = getExposureGapCardState(rows, false);

    expect(state.summaryText).toBe('All sources reporting');
    expect(state.toggleLabel).toBe('See details');
    expect(state.visibleRows).toHaveLength(0);
  });

  it('uses the prototype time boundaries for reporting rows and hides time for no-time statuses', () => {
    const now = Date.parse('2026-10-18T12:00:00.000Z');

    expect(formatSourceSyncAge('Reporting', '2026-10-18T11:30:00.000Z', now)).toBe('<1h ago');
    expect(formatSourceSyncAge('Reporting', '2026-10-18T11:00:00.000Z', now)).toBe('1h ago');
    expect(formatSourceSyncAge('Reporting', '2026-10-16T13:00:00.000Z', now)).toBe('47h ago');
    expect(formatSourceSyncAge('Reporting', '2026-10-16T12:00:00.000Z', now)).toBe('2d ago');
    expect(formatSourceSyncAge('Pending', '2026-10-17T12:00:00.000Z', now)).toBeNull();
    expect(formatSourceSyncAge('N/A', '2026-10-17T12:00:00.000Z', now)).toBeNull();
    expect(formatSourceSyncAge('Not present', '2026-10-17T12:00:00.000Z', now)).toBeNull();
  });

  it('keeps the card collapsed when nothing is hidden and when only N/A rows are hidden', () => {
    const reportingOnlyRows: SourceCoverageRow[] = [
      { source: 'CrowdStrike', status: 'Reporting', lastSyncAt: '2026-10-17T12:00:00.000Z' },
      { source: 'Google Workspace', status: 'Reporting', lastSyncAt: '2026-10-17T11:00:00.000Z' },
    ];

    const allNotApplicableRows: SourceCoverageRow[] = [
      { source: 'Active Directory', status: 'N/A', lastSyncAt: '2026-10-17T12:00:00.000Z' },
      { source: 'Google Workspace', status: 'N/A', lastSyncAt: '2026-10-17T11:00:00.000Z' },
    ];

    expect(getExposureGapCardState(reportingOnlyRows, false).summaryText).toBe('All sources reporting');
    expect(getExposureGapCardState(reportingOnlyRows, false).showToggle).toBe(true);
    expect(getExposureGapCardState(reportingOnlyRows, false).toggleLabel).toBe('See details');
    expect(getExposureGapCardState(allNotApplicableRows, false).showToggle).toBe(false);
    expect(getExposureGapCardState(allNotApplicableRows, false).toggleLabel).toBe('');
  });

  it('keeps the hidden-link text in the exact prototype format for reporting and not-applicable combinations', () => {
    const rows: SourceCoverageRow[] = [
      { source: 'CrowdStrike', status: 'Reporting', lastSyncAt: '2026-10-17T12:00:00.000Z' },
      { source: 'EntraID', status: 'Not present', lastSyncAt: null },
      { source: 'Google Workspace', status: 'N/A', lastSyncAt: '2026-10-16T12:00:00.000Z' },
      { source: 'Okta', status: 'Reporting', lastSyncAt: '2026-10-17T11:00:00.000Z' },
      { source: 'Portnox AgentP', status: 'Pending', lastSyncAt: null },
    ];

    const state = getExposureGapCardState(rows, false);

    expect(state.visibleRows.map((row) => row.source)).toEqual(['EntraID', 'Portnox AgentP']);
    expect(state.toggleLabel).toBe('+2 Reporting, 1 Not applicable');
  });
});
