export const DEVICE_SOURCE_COLUMN_NAMES = [
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

export const ACCOUNT_SOURCE_COLUMN_NAMES = [
  'Active Directory',
  'EntraID',
  'Okta',
  'Google Workspace',
] as const;

const SOURCE_COLUMN_SHORT_LABELS: Record<string, string> = {
  'Absolute Secure Endpoint': 'ASE',
  'Portnox AgentP': 'AgentP',
  'Active Directory': 'AD',
  'Google Workspace': 'Google',
};

export function getSourceColumnLabel(sourceName: string): string {
  return SOURCE_COLUMN_SHORT_LABELS[sourceName] ?? sourceName;
}

export function getSourceColumnFullName(sourceName: string): string {
  return sourceName;
}

export function getDefaultVisibleDeviceColumnIds(): string[] {
  return [
    'name',
    'type',
    'os',
    'location',
    'account',
    'accountType',
    'group',
    'riskScore',
    'status',
    'lastConnected',
    'createdTime',
    'coverageGaps',
    ...DEVICE_SOURCE_COLUMN_NAMES.map((sourceName) => `source:${sourceName}`),
  ];
}

export function buildSourceColumns(entity: 'device' | 'account'): Array<{ id: string; label: string }> {
  const sourceNames = entity === 'device' ? DEVICE_SOURCE_COLUMN_NAMES : ACCOUNT_SOURCE_COLUMN_NAMES;

  return sourceNames.map((sourceName) => ({
    id: `source:${sourceName}`,
    label: getSourceColumnLabel(sourceName),
  }));
}
