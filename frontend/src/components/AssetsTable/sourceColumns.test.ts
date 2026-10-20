import { describe, expect, it } from 'vitest';
import {
  buildSourceColumns,
  formatCoverageGapText,
  formatSourceCoverageText,
  getDefaultVisibleDeviceColumnIds,
  getSourceColumnLabel,
} from './sourceColumns';

describe('source column helpers', () => {
  it('uses short labels for source headers', () => {
    expect(getSourceColumnLabel('Portnox AgentP')).toBe('AgentP');
    expect(getSourceColumnLabel('Active Directory')).toBe('AD');
    expect(getSourceColumnLabel('Google Workspace')).toBe('Google');
    expect(getSourceColumnLabel('Absolute Secure Endpoint')).toBe('ASE');
  });

  it('keeps Created time visible by default for device tables', () => {
    const visibleColumns = getDefaultVisibleDeviceColumnIds();

    expect(visibleColumns).toContain('createdTime');
    expect(visibleColumns.indexOf('lastConnected')).toBeLessThan(visibleColumns.indexOf('createdTime'));
    expect(visibleColumns.indexOf('createdTime')).toBeLessThan(visibleColumns.indexOf('coverageGaps'));
  });

  it('formats coverage gaps like the prototype', () => {
    expect(formatCoverageGapText([])).toBe('None');
    expect(formatCoverageGapText(['CrowdStrike'])).toBe('CrowdStrike');
    expect(formatCoverageGapText(['CrowdStrike', 'Okta'])).toBe('CrowdStrike, Okta');
    expect(formatCoverageGapText(['CrowdStrike', 'Okta', 'Google Workspace', 'Active Directory'])).toContain('+2');
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
});
