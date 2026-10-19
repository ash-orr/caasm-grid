import type { SourceName, SourceStatus } from '../../mocks/generated/prototype-data.js';

export type SourceStatusInput = {
  source: SourceName;
  coverage: boolean | null;
  createdAt?: string | null;
  lastSeenAt?: string | null;
  nowMs?: number;
};

export const SOURCE_POLL_INTERVALS: Record<SourceName, { ago: number }> = {
  CrowdStrike: { ago: 15 },
  SentinelOne: { ago: 5 },
  Intune: { ago: 3 },
  Jamf: { ago: 10 },
  SOTI: { ago: 2 },
  'Absolute Secure Endpoint': { ago: 4 },
  'Portnox AgentP': { ago: 0.4 },
  EntraID: { ago: 1 },
  'Active Directory': { ago: 6 },
  Okta: { ago: 2 },
  'Google Workspace': { ago: 1 },
};

export function getSourceStatus({
  source,
  coverage,
  createdAt,
  lastSeenAt,
  nowMs = Date.now(),
}: SourceStatusInput): SourceStatus {
  if (coverage === null) return 'N/A';

  if (!coverage) {
    if (!createdAt) return 'Not present';

    const created = Date.parse(createdAt);
    if (Number.isNaN(created)) return 'Not present';

    const ageHours = (nowMs - created) / (1000 * 60 * 60);
    return ageHours < SOURCE_POLL_INTERVALS[source].ago ? 'Pending' : 'Not present';
  }

  if (!lastSeenAt) return 'Pending';

  const seen = Date.parse(lastSeenAt);
  if (Number.isNaN(seen)) return 'Pending';

  const ageHours = (nowMs - seen) / (1000 * 60 * 60);
  return ageHours >= 24 ? 'Stale' : 'Reporting';
}
