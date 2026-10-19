import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RUNNER_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(RUNNER_DIR, '..');
const PROTOTYPE_HTML_PATH = path.resolve(FRONTEND_DIR, '..', 'design', 'prototype', 'caasm-console.html');
const GENERATED_FILE_PATH = path.resolve(FRONTEND_DIR, 'src', 'mocks', 'generated', 'prototype-data.ts');

const SOURCE_ORDER = [
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

type SourceName = (typeof SOURCE_ORDER)[number];
type SourceStatus = 'Reporting' | 'Stale' | 'Pending' | 'Not present' | 'N/A';
type AuthRepository = 'Active Directory' | 'EntraID' | 'Okta' | 'Google Workspace' | null;
type RiskViolation =
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

interface SourceCoverageCell {
  status: SourceStatus;
  lastSyncAt: string | null;
}

type SourceCoverage = Record<SourceName, SourceCoverageCell>;

interface SourceFieldValue {
  value: string | null;
  hasConflict: boolean;
  valuesBySource: Record<string, string | null>;
}

export interface AccountRecord {
  id: number;
  name: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC';
  group: string;
  location: string;
  authType: string;
  authRepo: AuthRepository;
  nasSite: string;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
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
  status: 'Blocked' | 'Archived' | 'No issues';
  lastConnectedAt: string;
  createdAt: string;
  coverageGaps: string[];
  authType: string;
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
  agentVersion: string;
  agentpVersion: string;
  riskPolicy: string;
  accessPolicy: string;
  riskViolations: RiskViolation[];
  nasIp: string;
  agentpLastReported: string;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
}

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

const DEFAULT_NOW_MS = Date.parse('2026-10-16T13:35:00.000Z');

function normalizeFieldValue(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

function getSourceStatus({
  source,
  coverage,
  createdAt,
  lastSeenAt,
  nowMs,
}: {
  source: SourceName;
  coverage: boolean | null;
  createdAt?: string | null;
  lastSeenAt?: string | null;
  nowMs: number;
}): SourceStatus {
  if (coverage === null) return 'N/A';
  if (!coverage) {
    if (!createdAt) return 'Not present';
    const created = Date.parse(createdAt);
    if (Number.isNaN(created)) return 'Not present';
    const ageHours = (nowMs - created) / (1000 * 60 * 60);
    const thresholds: Record<SourceName, number> = {
      CrowdStrike: 15,
      SentinelOne: 5,
      Intune: 3,
      Jamf: 10,
      SOTI: 2,
      'Absolute Secure Endpoint': 4,
      'Portnox AgentP': 0.4,
      EntraID: 1,
      'Active Directory': 6,
      Okta: 2,
      'Google Workspace': 1,
    };
    return ageHours < thresholds[source] ? 'Pending' : 'Not present';
  }

  if (!lastSeenAt) return 'Pending';
  const seen = Date.parse(lastSeenAt);
  if (Number.isNaN(seen)) return 'Pending';
  const ageHours = (nowMs - seen) / (1000 * 60 * 60);
  return ageHours >= 24 ? 'Stale' : 'Reporting';
}

function buildSourceCoverage(
  coverageMap: Partial<Record<SourceName, boolean | null>>,
  createdAt?: string,
  nowMs = DEFAULT_NOW_MS,
): SourceCoverage {
  const coverage = {} as SourceCoverage;

  for (const source of SOURCE_ORDER) {
    const declaredStatus = coverageMap[source] ?? null;
    const declaredCoverage = declaredStatus === null ? null : declaredStatus === false ? false : true;
    const lastSeenAt = SOURCE_LAST_SYNC[source];
    coverage[source] = {
      status: getSourceStatus({
        source,
        coverage: declaredCoverage,
        createdAt,
        lastSeenAt,
        nowMs,
      }),
      lastSyncAt: lastSeenAt,
    };
  }

  return coverage;
}

function buildSourceFieldValues(
  rawSourceRecords: Record<string, Record<string, unknown>> | undefined,
  fieldMap: Record<string, string>,
): Record<string, SourceFieldValue> {
  const result: Record<string, SourceFieldValue> = {};

  for (const [fieldKey, prototypeField] of Object.entries(fieldMap)) {
    const valuesBySource: Record<string, string | null> = {};
    const counts = new Map<string, number>();
    const normalizedValues: string[] = [];

    for (const source of SOURCE_ORDER) {
      const rawValue = rawSourceRecords?.[source]?.[prototypeField];
      const normalizedValue = normalizeFieldValue(rawValue);
      valuesBySource[source] = normalizedValue;
      if (normalizedValue !== null) {
        normalizedValues.push(normalizedValue);
        counts.set(normalizedValue.toLowerCase(), (counts.get(normalizedValue.toLowerCase()) ?? 0) + 1);
      }
    }

    const distinctValues = new Set(normalizedValues.map((value) => value.toLowerCase()));
    const hasConflict = normalizedValues.length > 1 && distinctValues.size > 1;
    const winner = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

    result[fieldKey] = {
      value: winner ? winner[0] : null,
      hasConflict,
      valuesBySource,
    };
  }

  return result;
}

async function readPrototypeData(seed = 7): Promise<{ accounts: Array<any>; devices: Array<any> }> {
  const html = await fs.readFile(PROTOTYPE_HTML_PATH, 'utf8');
  const match = html.match(/\/\/ ---------- data ----------([\s\S]*?)\/\/ ---------- state ----------/);
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

function deriveAccountAuthRepo(rawAccount: Record<string, any>): AuthRepository {
  if (rawAccount.type === 'MAC') return null;
  if (rawAccount.type === 'LDAP') {
    return rawAccount.srcs?.includes('Active Directory') ? 'Active Directory' : 'EntraID';
  }
  if (rawAccount.srcs?.includes('Okta')) return 'Okta';
  if (rawAccount.srcs?.includes('Google Workspace')) return 'Google Workspace';
  return 'EntraID';
}

function deriveAccountLocation(rawAccount: Record<string, any>): string {
  const location = rawAccount.loc ?? 'Austin HQ';
  if (location === 'Austin HQ') return 'Austin HQ';
  if (location === 'Denver') return 'Denver';
  if (location === 'London') return 'London';
  if (location === 'Singapore') return 'Singapore';
  if (location === 'Remote – US') return 'Remote – US';
  return 'Frankfurt';
}

function annotateConflicts(data: { accounts: AccountRecord[]; devices: DeviceRecord[] }): { accounts: AccountRecord[]; devices: DeviceRecord[] } {
  const deviceConflicts = new Set([10, 24, 53, 88]);
  const accountConflicts = new Set([2, 12, 33, 41]);

  for (const device of data.devices) {
    if (deviceConflicts.has(device.id)) {
      device.sourceFieldValues.os = {
        ...device.sourceFieldValues.os,
        hasConflict: true,
        value: 'Windows 11',
        valuesBySource: {
          ...device.sourceFieldValues.os.valuesBySource,
          'Active Directory': 'Windows 10',
          EntraID: 'Windows 11',
        },
      };
    }
  }

  for (const account of data.accounts) {
    if (accountConflicts.has(account.id)) {
      account.sourceFieldValues.group = {
        ...account.sourceFieldValues.group,
        hasConflict: true,
        value: account.group,
        valuesBySource: {
          ...account.sourceFieldValues.group.valuesBySource,
          EntraID: 'Finance',
          'Active Directory': 'Engineering',
        },
      };
    }
  }

  return data;
}

export async function generatePrototypeData(input: { seed?: number; nowMs?: number } = {}): Promise<{
  accounts: AccountRecord[];
  devices: DeviceRecord[];
}> {
  const seed = input.seed ?? 7;
  const nowMs = input.nowMs ?? DEFAULT_NOW_MS;
  const prototypeData = await readPrototypeData(seed);

  const accountRecords: AccountRecord[] = prototypeData.accounts.map((account) => {
    const authRepo = deriveAccountAuthRepo(account);
    const location = deriveAccountLocation(account);
    const sourceFieldValues = buildSourceFieldValues(account.rec, {
      name: 'name',
      group: 'group',
      lastLogin: 'last',
    });

    return {
      id: account.id,
      name: account.name,
      accountType: account.type as AccountRecord['accountType'],
      group: account.group,
      location,
      authType: account.type,
      authRepo,
      nasSite: account.type === 'MAC'
        ? (location === 'Austin HQ' ? 'AUS-HQ-PRN' : location === 'Denver' ? 'DEN-IOT-01' : location === 'London' ? 'LON-IOT-01' : location === 'Singapore' ? 'SIN-IOT-01' : location === 'Remote – US' ? 'US-REMOTE-POOL' : 'FRA-IOT-01')
        : location === 'Austin HQ' ? 'AUS-HQ-01' : location === 'Denver' ? 'DEN-CORE-01' : location === 'London' ? 'LON-CORP-01' : location === 'Singapore' ? 'SIN-CORP-01' : location === 'Remote – US' ? 'US-REMOTE-POOL' : 'FRA-CORE-01',
      sourceCoverage: buildSourceCoverage(
        {
          EntraID: authRepo === 'EntraID' ? true : null,
          'Active Directory': authRepo === 'Active Directory' ? true : null,
          Okta: authRepo === 'Okta' ? true : null,
          'Google Workspace': authRepo === 'Google Workspace' ? true : null,
        },
        undefined,
        nowMs,
      ),
      sourceFieldValues,
    };
  });

  const accountLookup = new Map(accountRecords.map((account) => [account.name, account]));

  const deviceRecords: DeviceRecord[] = prototypeData.devices.map((device) => {
    const account = accountLookup.get(device.acct) ?? accountRecords[0];
    const sourceFieldValues = buildSourceFieldValues(device.rec, {
      hostname: 'host',
      os: 'os',
      osVersion: 'ver',
      manufacturer: 'mfr',
      model: 'model',
      lastSeen: 'last',
    });

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
      status: device.nac === 'Blocked' ? 'Blocked' : 'No issues',
      lastConnectedAt: new Date(nowMs - ((device.id * 17) % 29) * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(nowMs - ((device.id * 11) % 320) * 24 * 60 * 60 * 1000).toISOString(),
      coverageGaps: device.gaps ?? SOURCE_ORDER.filter((source) => sourceCoverage[source].status === 'Not present'),
      authType: device.auth ?? 'Unknown',
      authRepo: account?.authRepo ?? null,
      nasSite: account?.nasSite ?? 'AUS-HQ-01',
      macVendor: 'Samsung',
      manufacturer: device.mfr ?? 'Samsung',
      model: device.model ?? 'Galaxy S24',
      applications: ['Chrome'],
      patches: ['KB5034441'],
      processes: ['chrome.exe'],
      services: ['Windows Update'],
      peripherals: [],
      browser: ['Chrome 124'],
      browserExtensions: [],
      agentVersion: device.agent ?? '1.1.261',
      agentpVersion: device.agent ?? '1.1.261',
      riskPolicy: device.policy ?? 'Corp_Laptop_Policy',
      accessPolicy: device.access ?? 'Onsite_Office_Policy',
      riskViolations: (device.viol ?? []) as RiskViolation[],
      nasIp: device.nasIp ?? '10.0.0.1',
      agentpLastReported: new Date(nowMs - ((device.id * 7) % 10) * 24 * 60 * 60 * 1000).toISOString(),
      sourceCoverage,
      sourceFieldValues,
    };
  });

  return annotateConflicts({ accounts: accountRecords, devices: deviceRecords });
}

function serializeTsValue(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const entries = value.map((item) => `${pad}  ${serializeTsValue(item, indent + 1)}`).join(',\n');
    return `[
${entries},
${pad}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const body = entries
      .map(([key, entry]) => `${pad}  ${JSON.stringify(key)}: ${serializeTsValue(entry, indent + 1)}`)
      .join(',\n');
    return `{
${body},
${pad}}`;
  }
  return String(value);
}

export async function writePrototypeDataFile(outputPath = GENERATED_FILE_PATH): Promise<{ accounts: AccountRecord[]; devices: DeviceRecord[] }> {
  const data = await generatePrototypeData();
  const fileContent = `export type SourceName = ${SOURCE_ORDER.map((source) => JSON.stringify(source)).join(' | ')};
export type SourceStatus = 'Reporting' | 'Stale' | 'Pending' | 'Not present' | 'N/A';
export type AuthRepository = 'Active Directory' | 'EntraID' | 'Okta' | 'Google Workspace' | null;
export type RiskViolation = ${[
  'Administrator privileges',
  'Antivirus',
  'Applications',
  'Certificates',
  'Geolocation',
  'Peripheral devices',
  'Rootkit',
  'Running services',
  'Windows registry',
  'Generative AI',
].map((value) => JSON.stringify(value)).join(' | ')};

export interface SourceCoverageCell {
  status: SourceStatus;
  lastSyncAt: string | null;
}

export type SourceCoverage = Record<SourceName, SourceCoverageCell>;

export interface SourceFieldValue {
  value: string | null;
  hasConflict: boolean;
  valuesBySource: Record<string, string | null>;
}

export interface AccountRecord {
  id: number;
  name: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC';
  group: string;
  location: string;
  authType: string;
  authRepo: AuthRepository;
  nasSite: string;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
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
  status: 'Blocked' | 'Archived' | 'No issues';
  lastConnectedAt: string;
  createdAt: string;
  coverageGaps: string[];
  authType: string;
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
  agentVersion: string;
  agentpVersion: string;
  riskPolicy: string;
  accessPolicy: string;
  riskViolations: RiskViolation[];
  nasIp: string;
  agentpLastReported: string;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
}

export const accounts: AccountRecord[] = ${serializeTsValue(data.accounts)};
export const devices: DeviceRecord[] = ${serializeTsValue(data.devices)};

export function generatePrototypeData(_input: { seed?: number; nowMs?: number } = {}): Promise<{
  accounts: AccountRecord[];
  devices: DeviceRecord[];
}> {
  return Promise.resolve({
    accounts,
    devices,
  });
}

export function createPrototypeData(_input: { seed?: number; nowMs?: number } = {}): Promise<{
  accounts: AccountRecord[];
  devices: DeviceRecord[];
}> {
  return generatePrototypeData(_input);
}
`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, fileContent, 'utf8');
  return data;
}

async function main(): Promise<void> {
  await writePrototypeDataFile();
}

const isMain = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  await main();
}
