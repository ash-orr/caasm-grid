export const DEVICE_SOURCE_COLUMN_NAMES = [
  'Portnox AgentP',
  'CrowdStrike',
  'Intune',
  'Okta',
  'Google Workspace',
  'Active Directory',
] as const;

export const ACCOUNT_SOURCE_COLUMN_NAMES = [
  'Okta',
  'Google Workspace',
  'Active Directory',
  'EntraID',
] as const;

const SOURCE_COLUMN_ORDER = Object.fromEntries([
  ...DEVICE_SOURCE_COLUMN_NAMES,
  ...ACCOUNT_SOURCE_COLUMN_NAMES,
  'Absolute Secure Endpoint',
  'EntraID',
].map((sourceName, index) => [sourceName, index])) as Record<string, number>;

const SOURCE_COLUMN_SHORT_LABELS: Record<string, string> = {
  'Absolute Secure Endpoint': 'ASE',
  'Portnox AgentP': 'Portnox',
  'Active Directory': 'AD',
  'Google Workspace': 'Google',
};

export function getSourceColumnLabel(sourceName: string): string {
  return SOURCE_COLUMN_SHORT_LABELS[sourceName] ?? sourceName;
}

export function getSourceColumnFullName(sourceName: string): string {
  return sourceName;
}

export function formatCoverageGapText(gaps: string[]): string {
  if (gaps.length === 0) return 'None';
  if (gaps.length <= 2) return gaps.join(', ');
  return `${gaps[0]}, ${gaps[1]}, +${gaps.length - 2}`;
}

export function formatSourceCoverageText(sources: string[]): string {
  const liveSources = sources
    .filter((source) => source && source !== '—')
    .sort((left, right) => {
      const leftOrder = SOURCE_COLUMN_ORDER[left] ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = SOURCE_COLUMN_ORDER[right] ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });

  if (!liveSources.length) return '—';
  return liveSources.map((sourceName) => getSourceColumnLabel(sourceName)).join(', ');
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
    'sourceCoverage',
  ];
}

export function buildSourceColumns(entity: 'device' | 'account'): Array<{ id: string; label: string }> {
  const sourceNames = entity === 'device' ? DEVICE_SOURCE_COLUMN_NAMES : ACCOUNT_SOURCE_COLUMN_NAMES;

  return sourceNames.map((sourceName) => ({
    id: `source:${sourceName}`,
    label: getSourceColumnLabel(sourceName),
  }));
}
