import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getSourceStatus } from '../components/AssetsTable/sourceStatus.js';

export type DeviceStatus = 'Blocked' | 'Archived' | 'No issues';
export type SourceStatus = 'Reporting' | 'Stale' | 'Pending' | 'Not present' | 'N/A';

export type SourceName =
  | 'CrowdStrike'
  | 'SentinelOne'
  | 'Intune'
  | 'Jamf'
  | 'SOTI'
  | 'Absolute Secure Endpoint'
  | 'Portnox AgentP'
  | 'EntraID'
  | 'Active Directory'
  | 'Okta'
  | 'Google Workspace';

export type AuthRepository = 'Active Directory' | 'EntraID' | 'Okta' | 'Google Workspace' | null;

export type RiskViolation =
  | 'Administrator privileges'
  | 'Antivirus'
  | 'Applications'
  | 'Certificates'
  | 'Geolocation'
  | 'Peripheral devices'
  | 'Rootkit'
  | 'Running services'
  | 'Windows registry'
  | 'Generative AI';

export interface SourceCoverageCell {
  status: SourceStatus;
  lastSyncAt: string | null;
}

export type SourceCoverage = Record<SourceName, SourceCoverageCell>;

export interface AccountRecord {
  id: number;
  name: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC';
  group: string;
  location: string;
  authRepo: AuthRepository;
  nasSite: string;
  sourceCoverage: SourceCoverage;
}

export interface DeviceRecord {
  id: number;
  name: string;
  type: 'Laptop' | 'Desktop' | 'Server' | 'Mobile' | 'IoT/Printer';
  os: string;
  location: string;
  account: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC';
  group: string;
  riskScore: number;
  status: DeviceStatus;
  lastConnectedAt: string;
  createdAt: string;
  coverageGaps: string[];
  authRepo: AuthRepository;
  nasSite: string;
  macVendor: string;
  manufacturer: string;
  model: string;
  applications: string[];
  patches: string[];
  processes: string[];
  services: string[];
  peripherals: string[];
  browser: string[];
  browserExtensions: string[];
  agentpVersion: string;
  riskViolations: RiskViolation[];
  nasIp: string;
  agentpLastReported: string;
  sourceCoverage: SourceCoverage;
}

const SOURCE_ORDER: SourceName[] = [
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
];

const SOURCE_LAST_SYNC: Record<SourceName, string> = {
  CrowdStrike: '2026-10-16T13:35:00.000Z',
  SentinelOne: '2026-10-16T13:05:00.000Z',
  Intune: '2026-10-16T12:40:00.000Z',
  Jamf: '2026-10-16T11:50:00.000Z',
  SOTI: '2026-10-16T12:15:00.000Z',
  'Absolute Secure Endpoint': '2026-10-16T12:55:00.000Z',
  'Portnox AgentP': '2026-10-16T13:20:00.000Z',
  EntraID: '2026-10-16T13:10:00.000Z',
  'Active Directory': '2026-10-16T12:45:00.000Z',
  Okta: '2026-10-16T12:30:00.000Z',
  'Google Workspace': '2026-10-16T12:20:00.000Z',
};

const PROTOTYPE_SEED = 7;

function buildSourceCoverage(
  coverageMap: Partial<Record<SourceName, boolean | null>>,
  createdAt?: string,
  nowMs = Date.now(),
): SourceCoverage {
  const coverage = {} as SourceCoverage;

  for (const source of SOURCE_ORDER) {
    const declaredStatus = coverageMap[source] ?? null;
    const declaredCoverage = declaredStatus === null ? null : declaredStatus === false ? false : true;
    const lastSeenAt = SOURCE_LAST_SYNC[source];
    const status = getSourceStatus({
      source,
      coverage: declaredCoverage,
      createdAt,
      lastSeenAt,
      nowMs,
    });

    coverage[source] = {
      status,
      lastSyncAt: lastSeenAt,
    };
  }

  return coverage;
}

function readPrototypeData(seed = PROTOTYPE_SEED): {
  accounts: Array<{ id: number; name: string; type: string; group: string; loc?: string; srcs?: string[]; mfa?: boolean; priv?: boolean; lastLogin?: number; devices?: Array<{ id: number; name: string }> }>;
  devices: Array<{ id: number; name: string; type: string; os: string; loc: string; acct: string; acctType: string; group: string; score: number; cov: Partial<Record<SourceName, boolean | null>>; srcs: SourceName[]; nac: string; status?: DeviceStatus; gaps?: string[]; }>;
} {
  const prototypeHtml = readFileSync(path.resolve(process.cwd(), '../design/prototype/caasm-console.html'), 'utf8');
  const match = prototypeHtml.match(/\/\/ ---------- data ----------([\s\S]*?)\/\/ ---------- state ----------/);
  if (!match) {
    throw new Error('Prototype data script not found in caasm-console.html');
  }

  const patchedScript = match[1].replace(/let s=7;/, `let s=${seed};`);
  const factory = new Function(
    'console',
    'Date',
    'Math',
    'Set',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean',
    'RegExp',
    'Intl',
    `return (() => {${patchedScript}; return { accounts, devices }; })();`,
  );

  return factory(
    console,
    Date,
    Math,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Intl,
  );
}

export function createPrototypeData(input: { seed?: number; nowMs?: number } = {}): {
  accounts: AccountRecord[];
  devices: DeviceRecord[];
} {
  const seed = input.seed ?? PROTOTYPE_SEED;
  const nowMs = input.nowMs ?? Date.parse('2026-10-16T13:35:00.000Z');
  const prototypeData = readPrototypeData(seed);

  const accountRecords: AccountRecord[] = prototypeData.accounts.map((account) => {
    const authRepo: AuthRepository = account.type === 'MAC'
      ? null
      : account.type === 'LDAP'
        ? (account.srcs?.includes('Active Directory') ? 'Active Directory' : 'EntraID')
        : account.srcs?.includes('Okta')
          ? 'Okta'
          : account.srcs?.includes('Google Workspace')
            ? 'Google Workspace'
            : 'EntraID';

    const location = account.loc ?? 'Austin HQ';
    const nasSite = account.type === 'MAC'
      ? (location === 'Austin HQ' ? 'AUS-HQ-PRN' : location === 'Denver' ? 'DEN-IOT-01' : location === 'London' ? 'LON-IOT-01' : location === 'Singapore' ? 'SIN-IOT-01' : location === 'Remote – US' ? 'US-REMOTE-POOL' : 'FRA-IOT-01')
      : location === 'Austin HQ' ? 'AUS-HQ-01' : location === 'Denver' ? 'DEN-CORE-01' : location === 'London' ? 'LON-CORP-01' : location === 'Singapore' ? 'SIN-CORP-01' : location === 'Remote – US' ? 'US-REMOTE-POOL' : 'FRA-CORE-01';

    const sourceCoverage = buildSourceCoverage(
      {
        EntraID: authRepo === 'EntraID' ? true : null,
        'Active Directory': authRepo === 'Active Directory' ? true : null,
        Okta: authRepo === 'Okta' ? true : null,
        'Google Workspace': authRepo === 'Google Workspace' ? true : null,
      },
      undefined,
      nowMs,
    );

    return {
      id: account.id,
      name: account.name,
      accountType: account.type as AccountRecord['accountType'],
      group: account.group,
      location,
      authRepo,
      nasSite,
      sourceCoverage,
    };
  });

  const accountLookup = new Map(accountRecords.map((account) => [account.name, account]));

  const deviceRecords: DeviceRecord[] = prototypeData.devices.map((device) => {
    const account = accountLookup.get(device.acct) ?? accountRecords[0];
    const sourceCoverage = buildSourceCoverage(device.cov ?? {}, undefined, nowMs);

    return {
      id: device.id,
      name: device.name,
      type: device.type as DeviceRecord['type'],
      os: device.os,
      location: device.loc,
      account: device.acct,
      accountType: device.acctType as DeviceRecord['accountType'],
      group: device.group,
      riskScore: device.score,
      status: (device.nac === 'Blocked' ? 'Blocked' : 'No issues') as DeviceStatus,
      lastConnectedAt: new Date(nowMs - ((device.id * 17) % 29) * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(nowMs - ((device.id * 11) % 320) * 24 * 60 * 60 * 1000).toISOString(),
      coverageGaps: device.gaps ?? SOURCE_ORDER.filter((source) => sourceCoverage[source].status === 'Not present'),
      authRepo: account?.authRepo ?? null,
      nasSite: account?.nasSite ?? 'AUS-HQ-01',
      macVendor: 'Samsung',
      manufacturer: 'Samsung',
      model: 'Galaxy S24',
      applications: ['Chrome'],
      patches: ['KB5034441'],
      processes: ['chrome.exe'],
      services: ['Windows Update'],
      peripherals: [],
      browser: ['Chrome 124'],
      browserExtensions: [],
      agentpVersion: '1.1.261',
      riskViolations: [],
      nasIp: '10.0.0.1',
      agentpLastReported: new Date(nowMs - ((device.id * 7) % 10) * 24 * 60 * 60 * 1000).toISOString(),
      sourceCoverage,
    };
  });

  return { accounts: accountRecords, devices: deviceRecords };
}

export const { accounts, devices } = createPrototypeData();
