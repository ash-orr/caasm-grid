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

const LIVE_SOURCE_NAMES = [
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
  const liveSources = sources.filter(
    (source): source is (typeof LIVE_SOURCE_NAMES)[number] =>
      !!source && source !== '—' && LIVE_SOURCE_NAMES.includes(source as (typeof LIVE_SOURCE_NAMES)[number]),
  );

  if (!liveSources.length) return '—';

  const orderedSources = [
    ...liveSources.filter((sourceName) => sourceName === 'Portnox AgentP'),
    ...liveSources.filter((sourceName) => sourceName !== 'Portnox AgentP'),
  ];

  return orderedSources.map((sourceName) => getSourceColumnLabel(sourceName)).join(', ');
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
