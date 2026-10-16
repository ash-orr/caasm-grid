import { describe, expect, it } from 'vitest';
import { buildSourceColumns, getSourceColumnLabel } from './sourceColumns';

describe('source column helpers', () => {
  it('uses short labels for source headers', () => {
    expect(getSourceColumnLabel('Portnox AgentP')).toBe('AgentP');
    expect(getSourceColumnLabel('Active Directory')).toBe('AD');
    expect(getSourceColumnLabel('Google Workspace')).toBe('Google');
    expect(getSourceColumnLabel('Absolute Secure Endpoint')).toBe('ASE');
  });

  it('builds device and account source columns with the expected sources', () => {
    const deviceColumns = buildSourceColumns('device');
    const accountColumns = buildSourceColumns('account');

    expect(deviceColumns.some((column) => column.id === 'source:CrowdStrike')).toBe(true);
    expect(deviceColumns.some((column) => column.id === 'source:Active Directory')).toBe(true);
    expect(accountColumns.every((column) => ['source:Active Directory', 'source:EntraID', 'source:Okta', 'source:Google Workspace'].includes(column.id))).toBe(true);
    expect(accountColumns.some((column) => column.id === 'source:CrowdStrike')).toBe(false);
  });
});
