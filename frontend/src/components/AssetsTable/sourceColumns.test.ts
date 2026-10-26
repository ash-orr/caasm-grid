import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_HTML_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'design', 'prototype', 'caasm-console.html');

const LIVE_PROTOTYPE_SOURCES = [
  'CrowdStrike',
  'SentinelOne',
  'Intune',
  'Jamf',
  'SOTI',
  'Absolute Secure Endpoint',
  'Portnox AgentP',
  'EntraID',
  'Active Directory',
  'Okta',
  'Google Workspace',
] as const;

const PROTOTYPE_SHORT_LABELS: Record<string, string> = {
  'Absolute Secure Endpoint': 'ASE',
  'Portnox AgentP': 'Portnox',
  'Active Directory': 'AD',
  'Google Workspace': 'Google',
};

let prototypeRecords: Array<{ srcs?: string[]; name?: string }> = [];
let prototypeSourceText: (sources: string[]) => string = () => '—';

beforeAll(async () => {
  const html = await fs.readFile(PROTOTYPE_HTML_PATH, 'utf8');
  const match = html.match(/\/\/ ---------- data ----------([\s\S]*?)\/\/ ---------- state ----------/);
  const factory = new Function(
    'console', 'Date', 'Math', 'Set', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Intl',
    `return (() => {${match![1]}; return { accounts, devices }; })();`,
  );

  const data = factory(console, Date, Math, Set, Array, Object, String, Number, Boolean, RegExp, Intl);
  prototypeRecords = [...data.devices, ...data.accounts].map((record) => ({
    name: record.name,
    srcs: record.srcs ?? [],
  }));
  prototypeSourceText = (sources: string[]) => {
    const liveSources = sources.filter(
      (source) => source && source !== '—' && LIVE_PROTOTYPE_SOURCES.includes(source as (typeof LIVE_PROTOTYPE_SOURCES)[number]),
    );
    const ordered = [
      ...liveSources.filter((sourceName) => sourceName === 'Portnox AgentP'),
      ...liveSources.filter((sourceName) => sourceName !== 'Portnox AgentP'),
    ];
    const markup = ordered
      .map((sourceName) => PROTOTYPE_SHORT_LABELS[sourceName] ?? sourceName)
      .join(', ');
    const htmlString = markup ? `<span class="sctx" data-tip="sn|${markup}">${markup}</span>` : '—';
    const match = htmlString.match(/data-tip="sn\|([^"]+)"/);
    return (match ? match[1] : htmlString.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim() || '—';
  };
});

describe('source column helpers', () => {
  it('uses short labels for source headers', () => {
    expect(getSourceColumnLabel('Portnox AgentP')).toBe('Portnox');
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

  it('keeps SentinelOne before Active Directory, with Portnox first if present', () => {
    expect(formatSourceCoverageText(['SentinelOne', 'Active Directory'])).toBe('SentinelOne, AD');
    expect(formatSourceCoverageText(['Portnox AgentP', 'SentinelOne', 'Active Directory'])).toBe('Portnox, SentinelOne, AD');
  });

  it('source coverage text matches the prototype for every record', () => {
    expect(prototypeRecords).toHaveLength(186);
    for (const record of prototypeRecords) {
      const expected = prototypeSourceText(record.srcs ?? []);
      const actual = formatSourceCoverageText(record.srcs ?? []);
      expect(actual, record.name ?? 'record').toBe(expected);
    }
  });

  it('orders device and account source columns by the prototype source type order', () => {
    expect(buildSourceColumns('device').map((column) => column.id)).toEqual([
      'source:Portnox AgentP',
      'source:CrowdStrike',
      'source:Intune',
      'source:Okta',
      'source:Google Workspace',
      'source:Active Directory',
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
