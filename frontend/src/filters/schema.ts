import type { DeviceRecord, RiskViolation, SourceName, SourceStatus } from '../mocks/generated/prototype-data.js';

export type FilterEntity = 'devices' | 'accounts';

export type FilterGroup = 'General' | 'Network (NAC)' | 'Risk (NAC)' | 'On this device (NAC)' | null;

export type FilterPlacement = 'default' | 'addable';

export type FilterKind =
  | 'checklist'
  | 'time-buckets'
  | 'source-coverage-conditions'
  | 'on-this-device-conditions'
  | 'agentp-version';

export interface FilterDefinition {
  id: string;
  label: string;
  kind: FilterKind;
  group: FilterGroup;
  placement: FilterPlacement;
  entities: FilterEntity[];
}

export type AgentpReportedBucket = 'last24h' | 'days1to7' | 'over7d';

export type OnThisDeviceCategory =
  | 'applications'
  | 'patches'
  | 'processes'
  | 'services'
  | 'peripherals'
  | 'browser'
  | 'browserExtensions';

export interface OnThisDeviceCondition {
  category: OnThisDeviceCategory | null;
  value: string | null;
}

export interface SourceCoverageCondition {
  source: SourceName | null;
  status: SourceCoverageConditionStatus | null;
}

export type SourceCoverageConditionStatus =
  | 'Present'
  | Extract<SourceStatus, 'Reporting' | 'Stale' | 'Pending' | 'Not present'>;

export interface DeviceFilterState {
  deviceType?: DeviceRecord['type'][];
  os?: string[];
  location?: string[];
  accountType?: DeviceRecord['accountType'][];
  group?: string[];
  riskScore?: ('Access' | 'Alert' | 'Blocked')[];
  status?: DeviceRecord['status'][];
  lastConnected?: AgentpReportedBucket[];
  sourceCoverage?: SourceCoverageCondition[];
  manufacturer?: string[];
  model?: string[];
  createdTime?: ('last7d' | 'days7to30' | 'days30to90' | 'over90d')[];
  authRepo?: string[];
  nasSite?: string[];
  macVendor?: string[];
  nasIp?: string[];
  agentpLastReported?: AgentpReportedBucket[];
  riskViolation?: RiskViolation[];
  onThisDevice?: OnThisDeviceCondition[];
  agentpVersion?: string[];
  agentpVersionOlderThan?: string | null;
}

export interface AccountFilterState {
  accountType?: ('LDAP' | 'Cloud' | 'MAC')[];
  group?: string[];
  blocked?: ('Blocked' | 'Not blocked')[];
  devices?: ('none' | 'oneToTwo' | 'threeToFive' | 'sixPlus')[];
  lastLogin?: ('today' | 'days1to7' | 'days8to30' | 'over30d')[];
  sourceCoverage?: SourceCoverageCondition[];
  location?: string[];
  authRepo?: string[];
  nasSite?: string[];
}

export const FILTER_SCHEMA: FilterDefinition[] = [
  { id: 'deviceType', label: 'Device type', kind: 'checklist', group: null, placement: 'default', entities: ['devices'] },
  { id: 'os', label: 'OS', kind: 'checklist', group: null, placement: 'default', entities: ['devices'] },
  { id: 'location', label: 'Location', kind: 'checklist', group: null, placement: 'default', entities: ['devices'] },
  { id: 'accountType', label: 'Account type', kind: 'checklist', group: null, placement: 'default', entities: ['devices', 'accounts'] },
  { id: 'group', label: 'Group', kind: 'checklist', group: null, placement: 'default', entities: ['devices', 'accounts'] },
  { id: 'riskScore', label: 'Risk score', kind: 'checklist', group: null, placement: 'default', entities: ['devices'] },
  { id: 'status', label: 'Status', kind: 'checklist', group: null, placement: 'default', entities: ['devices'] },
  { id: 'lastConnected', label: 'Last connected', kind: 'time-buckets', group: null, placement: 'default', entities: ['devices'] },
  {
    id: 'sourceCoverage',
    label: 'Source coverage',
    kind: 'source-coverage-conditions',
    group: null,
    placement: 'default',
    entities: ['devices', 'accounts'],
  },
  { id: 'blocked', label: 'Blocked', kind: 'checklist', group: null, placement: 'default', entities: ['accounts'] },
  { id: 'devices', label: 'Devices', kind: 'checklist', group: null, placement: 'default', entities: ['accounts'] },
  { id: 'lastLogin', label: 'Last login', kind: 'time-buckets', group: null, placement: 'default', entities: ['accounts'] },

  { id: 'manufacturer', label: 'Device manufacturer', kind: 'checklist', group: 'General', placement: 'addable', entities: ['devices'] },
  { id: 'model', label: 'Device model', kind: 'checklist', group: 'General', placement: 'addable', entities: ['devices'] },
  { id: 'createdTime', label: 'Created time', kind: 'time-buckets', group: 'General', placement: 'addable', entities: ['devices'] },
  { id: 'location', label: 'Location', kind: 'checklist', group: 'General', placement: 'addable', entities: ['accounts'] },

  {
    id: 'authRepo',
    label: 'Authentication repository',
    kind: 'checklist',
    group: 'Network (NAC)',
    placement: 'addable',
    entities: ['devices', 'accounts'],
  },
  { id: 'nasSite', label: 'NAS site', kind: 'checklist', group: 'Network (NAC)', placement: 'addable', entities: ['devices', 'accounts'] },
  { id: 'macVendor', label: 'MAC vendor', kind: 'checklist', group: 'Network (NAC)', placement: 'addable', entities: ['devices'] },
  { id: 'nasIp', label: 'NAS IP', kind: 'checklist', group: 'Network (NAC)', placement: 'addable', entities: ['devices'] },
  {
    id: 'agentpLastReported',
    label: 'AgentP last reported',
    kind: 'time-buckets',
    group: 'Network (NAC)',
    placement: 'addable',
    entities: ['devices'],
  },

  {
    id: 'riskViolation',
    label: 'Risk score violation',
    kind: 'checklist',
    group: 'Risk (NAC)',
    placement: 'addable',
    entities: ['devices'],
  },

  {
    id: 'onThisDevice',
    label: 'On this device',
    kind: 'on-this-device-conditions',
    group: 'On this device (NAC)',
    placement: 'addable',
    entities: ['devices'],
  },
  {
    id: 'agentpVersion',
    label: 'AgentP version',
    kind: 'agentp-version',
    group: 'On this device (NAC)',
    placement: 'addable',
    entities: ['devices'],
  },
];

export function getFilterDefinitions(entity: FilterEntity): FilterDefinition[] {
  return FILTER_SCHEMA.filter((filter) => filter.entities.includes(entity));
}
