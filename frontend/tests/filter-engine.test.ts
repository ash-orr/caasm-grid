import { describe, expect, it } from 'vitest';
import { accounts, devices, type DeviceRecord } from '../src/mocks/generated/prototype-data.js';
import {
  applyAccountFilters,
  applyDeviceFilters,
  compareVersionsNumeric,
  type AccountFilterRow,
} from '../src/filters/engine.js';
import { FILTER_SCHEMA, getFilterDefinitions, type DeviceFilterState } from '../src/filters/schema.js';

function deviceWith(overrides: Partial<DeviceRecord>): DeviceRecord {
  return {
    ...devices[0],
    ...overrides,
  };
}

function accountWith(overrides: Partial<AccountFilterRow>): AccountFilterRow {
  return {
    ...accounts[0],
    ...overrides,
  };
}

describe('filter schema', () => {
  it('includes default and addable sections for both entities', () => {
    const deviceDefs = getFilterDefinitions('devices');
    const accountDefs = getFilterDefinitions('accounts');

    expect(deviceDefs.some((item) => item.id === 'sourceCoverage' && item.placement === 'default')).toBe(true);
    expect(deviceDefs.some((item) => item.id === 'onThisDevice' && item.placement === 'addable')).toBe(true);
    expect(accountDefs.some((item) => item.id === 'location' && item.placement === 'addable')).toBe(true);
    expect(FILTER_SCHEMA.some((item) => item.id === 'agentpVersion' && item.group === 'On this device (NAC)')).toBe(true);
  });
});

describe('device filter engine', () => {
  const now = new Date('2026-10-16T14:00:00.000Z');

  it('returns all rows for empty filter state', () => {
    const rows = [devices[0], devices[1], devices[2]];

    expect(applyDeviceFilters(rows, {}, now)).toEqual(rows);
  });

  it('uses any-of semantics within one checklist filter', () => {
    const rows = [
      deviceWith({ id: 100, type: 'Laptop', authRepo: 'Okta' }),
      deviceWith({ id: 101, type: 'Desktop', authRepo: 'EntraID' }),
      deviceWith({ id: 102, type: 'Mobile', authRepo: 'Google Workspace' }),
    ];
    const state: DeviceFilterState = { deviceType: ['Laptop', 'Desktop'] };

    const filtered = applyDeviceFilters(rows, state, now);

    expect(filtered.map((row) => row.id)).toEqual([100, 101]);
  });

  it('uses AND semantics between different filters', () => {
    const rows = [
      deviceWith({ id: 110, type: 'Laptop', authRepo: 'Okta' }),
      deviceWith({ id: 111, type: 'Desktop', authRepo: 'EntraID' }),
      deviceWith({ id: 112, type: 'Mobile', authRepo: 'Okta' }),
    ];
    const state: DeviceFilterState = {
      deviceType: ['Laptop', 'Desktop'],
      authRepo: ['Okta'],
    };

    const filtered = applyDeviceFilters(rows, state, now);

    expect(filtered.map((row) => row.id)).toEqual([110]);
  });

  it('matches NAS IP by exact value only', () => {
    const rowA = deviceWith({ id: 901, nasIp: '10.10.1.12' });
    const rowB = deviceWith({ id: 902, nasIp: '10.10.1.120' });

    const filtered = applyDeviceFilters([rowA, rowB], { nasIp: ['10.10.1.12'] }, now);

    expect(filtered.map((row) => row.id)).toEqual([901]);
  });

  it('applies agentp older-than via numeric version comparison', () => {
    const rows = [
      deviceWith({ id: 910, agentpVersion: '9.9' }),
      deviceWith({ id: 911, agentpVersion: '9.10' }),
      deviceWith({ id: 912, agentpVersion: '10.0' }),
    ];

    const filtered = applyDeviceFilters(rows, { agentpVersionOlderThan: '9.10' }, now);

    expect(filtered.map((row) => row.id)).toEqual([910]);
  });

  it('handles same-category on-this-device rules with any-of semantics', () => {
    const rows = [
      deviceWith({ id: 920, applications: ['Slack'] }),
      deviceWith({ id: 921, applications: ['Chrome'] }),
      deviceWith({ id: 922, applications: ['Zoom'] }),
    ];

    const filtered = applyDeviceFilters(
      rows,
      {
        onThisDevice: [
          { category: 'applications', value: 'Slack' },
          { category: 'applications', value: 'Chrome' },
        ],
      },
      now
    );

    expect(filtered.map((row) => row.id)).toEqual([920, 921]);
  });

  it('handles different-category on-this-device rules with all-of semantics', () => {
    const rows = [
      deviceWith({ id: 930, applications: ['Slack'], browserExtensions: ['1Password'] }),
      deviceWith({ id: 931, applications: ['Slack'], browserExtensions: [] }),
      deviceWith({ id: 932, applications: [], browserExtensions: ['1Password'] }),
    ];

    const filtered = applyDeviceFilters(
      rows,
      {
        onThisDevice: [
          { category: 'applications', value: 'Slack' },
          { category: 'browserExtensions', value: '1Password' },
        ],
      },
      now
    );

    expect(filtered.map((row) => row.id)).toEqual([930]);
  });

  it('ignores incomplete on-this-device rows', () => {
    const rows = [
      deviceWith({ id: 940, applications: ['Slack'] }),
      deviceWith({ id: 941, applications: ['Chrome'] }),
    ];

    const filtered = applyDeviceFilters(
      rows,
      {
        onThisDevice: [
          { category: 'applications', value: 'Slack' },
          { category: 'applications', value: '' },
          { category: null, value: 'Chrome' },
          { category: 'browser', value: null },
        ],
      },
      now
    );

    expect(filtered.map((row) => row.id)).toEqual([940]);
  });

  it('returns no rows when condition needs values but row list field is empty', () => {
    const row = deviceWith({ id: 950, applications: [] });

    const filtered = applyDeviceFilters(
      [row],
      { onThisDevice: [{ category: 'applications', value: 'Slack' }] },
      now
    );

    expect(filtered).toEqual([]);
  });

  it('supports source coverage conditions and ignores incomplete conditions', () => {
    const rowReporting = deviceWith({
      id: 960,
      sourceCoverage: {
        ...devices[0].sourceCoverage,
        CrowdStrike: { status: 'Reporting', lastSyncAt: '2026-10-16T13:00:00.000Z' },
      },
    });
    const rowNotPresent = deviceWith({
      id: 961,
      sourceCoverage: {
        ...devices[0].sourceCoverage,
        CrowdStrike: { status: 'Not present', lastSyncAt: '2026-10-16T13:00:00.000Z' },
      },
    });

    const filtered = applyDeviceFilters(
      [rowReporting, rowNotPresent],
      {
        sourceCoverage: [
          { source: 'CrowdStrike', status: 'Present' },
          { source: null, status: 'Not present' },
        ],
      },
      now
    );

    expect(filtered.map((row) => row.id)).toEqual([960]);
  });
});

describe('account filter engine', () => {
  it('supports any-of and AND semantics for account filters', () => {
    const rows: AccountFilterRow[] = [
      accountWith({ id: 1001, accountType: 'Cloud', group: 'Engineering', authRepo: 'EntraID', nasSite: 'AUS-HQ-01' }),
      accountWith({ id: 1002, accountType: 'LDAP', group: 'Engineering', authRepo: 'Active Directory', nasSite: 'AUS-HQ-01' }),
      accountWith({ id: 1003, accountType: 'Cloud', group: 'Finance', authRepo: 'EntraID', nasSite: 'DEN-CORE-01' }),
    ];

    const filtered = applyAccountFilters(rows, {
      accountType: ['Cloud', 'LDAP'],
      group: ['Engineering'],
      authRepo: ['EntraID'],
    });

    expect(filtered.map((row) => row.id)).toEqual([1001]);
  });

  it('handles null values in account fields safely', () => {
    const rows: AccountFilterRow[] = [
      accountWith({ id: 1010, accountType: 'MAC', authRepo: null, nasSite: 'AUS-HQ-PRN', location: 'Austin HQ' }),
    ];

    expect(applyAccountFilters(rows, {})).toHaveLength(1);
    expect(applyAccountFilters(rows, { authRepo: ['Okta'] })).toHaveLength(0);
  });

  it('supports account source coverage conditions', () => {
    const rowReporting = accountWith({
      id: 1020,
      sourceCoverage: {
        ...accounts[0].sourceCoverage,
        Okta: { status: 'Reporting', lastSyncAt: '2026-10-16T13:00:00.000Z' },
      },
    });
    const rowMissing = accountWith({
      id: 1021,
      sourceCoverage: {
        ...accounts[0].sourceCoverage,
        Okta: { status: 'Not present', lastSyncAt: '2026-10-16T13:00:00.000Z' },
      },
    });

    const filtered = applyAccountFilters([rowReporting, rowMissing], {
      sourceCoverage: [{ source: 'Okta', status: 'Reporting' }],
    });

    expect(filtered.map((row) => row.id)).toEqual([1020]);
  });
});

describe('version comparison', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersionsNumeric('9.10', '9.9')).toBeGreaterThan(0);
    expect(compareVersionsNumeric('9.9', '9.10')).toBeLessThan(0);
    expect(compareVersionsNumeric('9.10.0', '9.10')).toBe(0);
  });
});
