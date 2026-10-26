/* eslint-disable @typescript-eslint/no-explicit-any */
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

const SOURCE_FIELD_SUPPORT: Record<string, Set<string>> = {
  CrowdStrike: new Set(['host', 'os', 'ver', 'mfr', 'model', 'last']),
  SentinelOne: new Set(['host', 'os', 'ver', 'last']),
  Intune: new Set(['host', 'os', 'ver', 'mfr', 'model', 'last']),
  Jamf: new Set(['host', 'os', 'ver', 'mfr', 'model', 'last']),
  SOTI: new Set(['host', 'os', 'ver', 'mfr', 'model', 'last']),
  'Absolute Secure Endpoint': new Set(['host', 'os', 'ver', 'mfr', 'model', 'last']),
  'Portnox AgentP': new Set(['host', 'os', 'ver', 'mfr', 'model', 'last']),
  EntraID: new Set(['host', 'os', 'ver', 'last', 'name', 'group']),
  'Active Directory': new Set(['host', 'os', 'ver', 'last', 'name', 'group']),
  Okta: new Set(['host', 'os', 'ver', 'last', 'name', 'group']),
  'Google Workspace': new Set(['host', 'os', 'ver', 'mfr', 'model', 'last', 'name', 'group']),
};

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
  fieldNamesBySource?: Record<string, string>;
}

export interface AccountRecord {
  id: number;
  name: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC' | null;
  group: string | null;
  location: string | null;
  authType: string | null;
  authRepo: AuthRepository;
  nasSite: string | null;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
}

export interface DeviceRecord {
  id: number;
  name: string;
  type: 'Laptop' | 'Desktop' | 'Server' | 'Mobile' | 'IoT/Printer';
  os: string;
  location: string | null;
  account: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC' | null;
  group: string | null;
  riskScore: number | null;
  status: 'Blocked' | 'Archived' | 'No issues' | null;
  lastConnectedAt: string | null;
  createdAt: string | null;
  coverageGaps: string[];
  authType: string | null;
  authRepo: AuthRepository;
  nasSite: string | null;
  macVendor: string;
  manufacturer: string | null;
  model: string | null;
  applications: string[];
  patches: string[];
  processes: string[];
  services: string[];
  peripherals: string[];
  browser: string[];
  browserExtensions: string[];
  agentVersion: string | null;
  agentpVersion: string | null;
  riskPolicy: string | null;
  accessPolicy: string | null;
  riskViolations: RiskViolation[];
  nasIp: string | null;
  agentpLastReported: string | null | null;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
}

const DEVICE_SOURCE_FIELD_MAPS: Record<SourceName, Record<string, string>> = {
  CrowdStrike: { hostname: 'hostname', os: 'platform_name', osVersion: 'os_version', manufacturer: 'system_manufacturer', model: 'system_product_name', lastSeen: 'last_seen' },
  SentinelOne: { hostname: 'computerName', os: 'osName', osVersion: 'osRevision', manufacturer: 'manufacturer', model: 'model', lastSeen: 'lastActiveDate' },
  Intune: { hostname: 'deviceName', os: 'operatingSystem', osVersion: 'osVersion', manufacturer: 'manufacturer', model: 'model', lastSeen: 'lastSyncDateTime' },
  Jamf: { hostname: 'computer_name', os: 'os_name', osVersion: 'os_version', manufacturer: 'make', model: 'model', lastSeen: 'last_contact_time' },
  SOTI: { hostname: 'DeviceName', os: 'Platform', osVersion: 'OSVersion', manufacturer: 'Manufacturer', model: 'Model', lastSeen: 'LastCheckInTime' },
  'Absolute Secure Endpoint': { hostname: 'deviceName', os: 'osName', osVersion: 'osVersion', manufacturer: 'manufacturer', model: 'model', lastSeen: 'lastConnectedUtc' },
  'Portnox AgentP': { hostname: 'hostname', os: 'os_name', osVersion: 'os_version', manufacturer: 'manufacturer', model: 'model', lastSeen: 'last_seen_at' },
  EntraID: { hostname: 'displayName', os: 'operatingSystem', osVersion: 'operatingSystemVersion', manufacturer: 'manufacturer', model: 'model', lastSeen: 'approximateLastSignInDateTime' },
  'Active Directory': { hostname: 'cn', os: 'operatingSystem', osVersion: 'operatingSystemVersion', manufacturer: 'manufacturer', model: 'model', lastSeen: 'lastLogonTimestamp' },
  Okta: { hostname: 'displayName', os: 'platform', osVersion: 'osVersion', manufacturer: 'manufacturer', model: 'model', lastSeen: 'lastUpdated' },
  'Google Workspace': { hostname: 'name', os: 'os', osVersion: 'osVersion', manufacturer: 'manufacturer', model: 'model', lastSeen: 'lastSync' },
};

const ACCOUNT_SOURCE_FIELD_MAPS: Record<SourceName, Record<string, string>> = {
  CrowdStrike: { name: 'name', group: 'group', lastLogin: 'lastLogin' },
  SentinelOne: { name: 'name', group: 'group', lastLogin: 'lastLogin' },
  Intune: { name: 'name', group: 'group', lastLogin: 'lastLogin' },
  Jamf: { name: 'name', group: 'group', lastLogin: 'lastLogin' },
  SOTI: { name: 'name', group: 'group', lastLogin: 'lastLogin' },
  'Absolute Secure Endpoint': { name: 'name', group: 'group', lastLogin: 'lastLogin' },
  'Portnox AgentP': { name: 'name', group: 'group', lastLogin: 'lastLogin' },
  EntraID: { name: 'userPrincipalName', group: 'department', lastLogin: 'signInActivity.lastSignInDateTime' },
  'Active Directory': { name: 'userPrincipalName', group: 'department', lastLogin: 'lastLogonTimestamp' },
  Okta: { name: 'profile.login', group: 'profile.department', lastLogin: 'lastLogin' },
  'Google Workspace': { name: 'primaryEmail', group: 'orgUnitPath', lastLogin: 'lastLoginTime' },
};

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
const IDENTITY_SOURCE_ORDER = ['Active Directory', 'EntraID', 'Okta', 'Google Workspace'] as const;
const SEEDED_ACCOUNT_SOURCE_OVERRIDES: Record<string, Partial<Record<(typeof IDENTITY_SOURCE_ORDER)[number], SourceStatus>>> = {
  'avery@acme.com': { 'Active Directory': 'Not present', EntraID: 'Reporting', Okta: 'Reporting' },
  'blake@acme.com': { 'Active Directory': 'Reporting', Okta: 'Not present', 'Google Workspace': 'Reporting' },
  'casey@acme.com': { 'Active Directory': 'Not present', EntraID: 'Reporting', Okta: 'Reporting' },
  'harper@acme.com': { 'Active Directory': 'Reporting', EntraID: 'Reporting', Okta: 'Reporting', 'Google Workspace': 'Reporting' },
  'jordan@acme.com': { 'Active Directory': 'Reporting', EntraID: 'Reporting', Okta: 'Reporting', 'Google Workspace': 'Reporting' },
  'morgan@acme.com': { 'Active Directory': 'Reporting', EntraID: 'Reporting', Okta: 'Reporting', 'Google Workspace': 'Reporting' },
  'noor@acme.com': { 'Active Directory': 'Reporting', EntraID: 'Reporting', Okta: 'Reporting', 'Google Workspace': 'Reporting' },
  'quinn@acme.com': { 'Active Directory': 'Reporting', EntraID: 'Reporting', Okta: 'Reporting', 'Google Workspace': 'Reporting' },
};

function applySeededAccountSourceCoverage(accountRecords: AccountRecord[]): void {
  for (const account of accountRecords) {
    const overrides = SEEDED_ACCOUNT_SOURCE_OVERRIDES[account.name];
    if (!overrides) continue;

    const nextCoverage: SourceCoverage = { ...account.sourceCoverage };
    for (const source of IDENTITY_SOURCE_ORDER) {
      const status = overrides[source];
      if (!status) continue;
      nextCoverage[source] = {
        ...nextCoverage[source],
        status,
      };
    }
    account.sourceCoverage = nextCoverage;
  }
}

function normalizeFieldValue(value: unknown, fieldKey?: string): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (text.length === 0) return null;

  const lower = text.toLowerCase();
  if (fieldKey === 'hostname' || fieldKey === 'host') {
    return lower.split('.')[0];
  }

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return lower;
  }

  const withoutSuffix = lower.replace(/\.(local|acme|corp|internal|lan|com|net|org|io)$/i, '');
  return withoutSuffix.replace(/\.$/, '');
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
  sourceFieldMaps: Record<string, Record<string, string>>,
  nowMs = DEFAULT_NOW_MS,
): Record<string, SourceFieldValue> {
  const result: Record<string, SourceFieldValue> = {};

  for (const [fieldKey, prototypeField] of Object.entries(fieldMap)) {
    const valuesBySource: Record<string, string | null> = {};
    const fieldNamesBySource: Record<string, string> = {};
    const normalizedValues: string[] = [];

    for (const source of SOURCE_ORDER) {
      const sourceFieldName = sourceFieldMaps[source]?.[fieldKey] ?? prototypeField;
      fieldNamesBySource[source] = sourceFieldName;

      if (!SOURCE_FIELD_SUPPORT[source]?.has(prototypeField)) {
        valuesBySource[source] = null;
        continue;
      }

      const rawValue = rawSourceRecords?.[source]?.[prototypeField];
      const normalizedValue = normalizeFieldValue(rawValue, fieldKey);
      valuesBySource[source] = normalizedValue;
      if (normalizedValue !== null) {
        normalizedValues.push(normalizedValue);
      }
    }

    const distinctValues = new Set(normalizedValues);

    if (fieldKey === 'lastSeen' || fieldKey === 'lastLogin') {
      const validEntries = Object.entries(valuesBySource)
        .filter(([, value]) => value !== null)
        .map(([source, value]) => ({
          source,
          value,
          millis: Date.parse(value as string),
          displayValue: fieldKey === 'lastLogin'
            ? String(Math.max(0, Math.floor((nowMs - Date.parse(value as string)) / (1000 * 60 * 60 * 24))))
            : value,
        }))
        .filter((entry) => Number.isFinite(entry.millis));

      const newest = validEntries.sort((a, b) => b.millis - a.millis)[0];

      const normalizedValuesBySource: Record<string, string | null> = {};
      for (const [source, value] of Object.entries(valuesBySource)) {
        if (value == null) {
          normalizedValuesBySource[source] = null;
          continue;
        }

        const millis = Date.parse(value);
        if (fieldKey !== 'lastLogin' || !Number.isFinite(millis)) {
          normalizedValuesBySource[source] = value;
          continue;
        }

        normalizedValuesBySource[source] = String(Math.max(0, Math.floor((nowMs - millis) / (1000 * 60 * 60 * 24))));
      }

      result[fieldKey] = {
        value: newest ? newest.displayValue : null,
        hasConflict: false,
        valuesBySource: normalizedValuesBySource,
        fieldNamesBySource,
      };
      continue;
    }

    const counts = new Map<string, number>();
    for (const normalizedValue of normalizedValues) {
      counts.set(normalizedValue, (counts.get(normalizedValue) ?? 0) + 1);
    }

    const winner = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    result[fieldKey] = {
      value: winner ? winner[0] : null,
      hasConflict: normalizedValues.length > 1 && distinctValues.size > 1,
      valuesBySource,
      fieldNamesBySource,
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
    }, ACCOUNT_SOURCE_FIELD_MAPS, nowMs);

    const description = account.desc ?? '';
    const credentialsExpire = account.exp == null || account.exp === 'Never'
      ? 'Never'
      : new Date(account.exp).toISOString();
    const createdBy = account.createdBy ?? 'Portnox admin (dana.whitfield@acme.com)';
    const allowDevicesWithoutAgentP = account.noAgent ?? false;
    const totalMacAddresses = account.macs ?? 0;
    const totalMacVendors = account.vendors ?? 0;

    return {
      id: account.id,
      name: account.name,
      accountType: account.type as AccountRecord['accountType'],
      group: account.group,
      description,
      credentialsExpire,
      createdBy,
      allowDevicesWithoutAgentP,
      totalMacAddresses,
      totalMacVendors,
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

  applySeededAccountSourceCoverage(accountRecords);

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
    }, DEVICE_SOURCE_FIELD_MAPS, nowMs);

    const sourceCoverage = buildSourceCoverage(device.cov ?? {}, undefined, nowMs);
    const isUncovered = Boolean(device.uncov);
    const coverageGaps = Array.isArray(device.gaps)
      ? device.gaps.filter((gap) => !(gap === 'Portnox AgentP' && !isUncovered))
      : SOURCE_ORDER.filter((source) => sourceCoverage[source].status === 'Not present');

    return {
      id: device.id,
      name: device.name,
      type: device.type as DeviceRecord['type'],
      os: device.os,
      location: isUncovered ? null : device.loc,
      account: device.acct,
      accountType: isUncovered ? null : device.acctType as DeviceRecord['accountType'],
      group: isUncovered ? null : device.group,
      riskScore: isUncovered ? null : device.score,
      status: isUncovered ? null : device.archived ? 'Archived' : device.blocked ? 'Blocked' : 'No issues',
      lastConnectedAt: isUncovered ? null : new Date(nowMs - ((device.id * 17) % 29) * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(nowMs - ((device.id * 11) % 320) * 24 * 60 * 60 * 1000).toISOString(),
      coverageGaps,
      authType: isUncovered ? null : (device.auth ?? 'Unknown'),
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
      agentVersion: isUncovered ? null : (device.agent ?? '1.1.261'),
      agentpVersion: isUncovered ? null : (device.agent ?? '1.1.261'),
      riskPolicy: device.policy ?? 'Corp_Laptop_Policy',
      accessPolicy: device.access ?? 'Onsite_Office_Policy',
      riskViolations: (device.viol ?? []) as RiskViolation[],
      nasIp: device.nasIp ?? '10.0.0.1',
      agentpLastReported: isUncovered ? null : new Date(nowMs - ((device.id * 7) % 10) * 24 * 60 * 60 * 1000).toISOString(),
      sourceCoverage,
      sourceFieldValues,
    };
  });

  return { accounts: accountRecords, devices: deviceRecords };
}

function serializeTsValue(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
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
  fieldNamesBySource?: Record<string, string>;
}

export interface AccountRecord {
  id: number;
  name: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC' | null;
  group: string | null;
  description?: string;
  credentialsExpire?: string;
  createdBy?: string;
  allowDevicesWithoutAgentP?: boolean;
  totalMacAddresses?: number | null;
  totalMacVendors?: number | null;
  location: string | null;
  authType: string | null;
  authRepo: AuthRepository;
  nasSite: string | null;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
}

export interface DeviceRecord {
  id: number;
  name: string;
  type: 'Laptop' | 'Desktop' | 'Server' | 'Mobile' | 'IoT/Printer';
  os: string;
  location: string | null;
  account: string;
  accountType: 'LDAP' | 'Cloud' | 'MAC' | null;
  group: string | null;
  riskScore: number | null;
  status: 'Blocked' | 'Archived' | 'No issues' | null;
  lastConnectedAt: string | null;
  createdAt: string | null;
  coverageGaps: string[];
  authType: string | null;
  authRepo: AuthRepository;
  nasSite: string | null;
  macVendor: string;
  manufacturer: string | null;
  model: string | null;
  applications: string[];
  patches: string[];
  processes: string[];
  services: string[];
  peripherals: string[];
  browser: string[];
  browserExtensions: string[];
  agentVersion: string | null;
  agentpVersion: string | null;
  riskPolicy: string | null;
  accessPolicy: string | null;
  riskViolations: RiskViolation[];
  nasIp: string | null;
  agentpLastReported: string | null;
  sourceCoverage: SourceCoverage;
  sourceFieldValues: Record<string, SourceFieldValue>;
}

export const accounts: AccountRecord[] = ${serializeTsValue(data.accounts)};
export const devices: DeviceRecord[] = ${serializeTsValue(data.devices)};

export function generatePrototypeData(): Promise<{
  accounts: AccountRecord[];
  devices: DeviceRecord[];
}> {
  return Promise.resolve({
    accounts,
    devices,
  });
}

export function createPrototypeData(): Promise<{
  accounts: AccountRecord[];
  devices: DeviceRecord[];
}> {
  return generatePrototypeData();
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
