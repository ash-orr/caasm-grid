import type { AccountRecord, DeviceRecord, SourceStatus } from '../mocks/generated/prototype-data.js';
import type {
  AccountFilterState,
  AgentpReportedBucket,
  DeviceFilterState,
  OnThisDeviceCondition,
  OnThisDeviceCategory,
  SourceCoverageCondition,
} from './schema.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

function hasAny<T>(values: readonly T[] | undefined, actual: T | null | undefined): boolean {
  if (!values || values.length === 0) return true;
  return values.includes(actual as T);
}

function hasAnyByPredicate<T>(values: readonly T[] | undefined, predicate: (value: T) => boolean): boolean {
  if (!values || values.length === 0) return true;
  return values.some(predicate);
}

function isInTimeBucket(isoDate: string | null | undefined, buckets: readonly AgentpReportedBucket[] | undefined, nowMs: number): boolean {
  if (!buckets || buckets.length === 0) return true;
  if (!isoDate) return false;

  const parsedMs = Date.parse(isoDate);
  if (Number.isNaN(parsedMs)) return false;

  const ageHours = Math.max(0, (nowMs - parsedMs) / ONE_HOUR_MS);

  return buckets.some((bucket) => {
    if (bucket === 'last24h') return ageHours < 24;
    if (bucket === 'days1to7') return ageHours >= 24 && ageHours < 24 * 7;
    return ageHours >= 24 * 7;
  });
}

function toRiskBand(score: number | null | undefined): 'Access' | 'Alert' | 'Blocked' | null {
  if (score == null) return null;
  if (score >= 70) return 'Blocked';
  if (score >= 40) return 'Alert';
  return 'Access';
}

function sourceStatusForCondition(status: SourceStatus): SourceStatus | 'Present' {
  return status;
}

function isSourceCoverageMatch(sourceCoverage: DeviceRecord['sourceCoverage'] | AccountRecord['sourceCoverage'], conditions: SourceCoverageCondition[] | undefined): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    if (!condition.source || !condition.status) return true;

    const cell = sourceCoverage[condition.source];
    const actualStatus = sourceStatusForCondition(cell.status);

    if (condition.status === 'Present') {
      return actualStatus === 'Reporting' || actualStatus === 'Stale';
    }

    return actualStatus === condition.status;
  });
}

export function compareVersionsNumeric(a: string, b: string): number {
  const aParts = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const bParts = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLen; index += 1) {
    const aValue = aParts[index] ?? 0;
    const bValue = bParts[index] ?? 0;

    if (aValue !== bValue) {
      return aValue - bValue;
    }
  }

  return 0;
}

function normalizeOnThisDeviceConditions(conditions: OnThisDeviceCondition[] | undefined): Map<OnThisDeviceCategory, string[]> {
  const grouped = new Map<OnThisDeviceCategory, string[]>();

  if (!conditions) return grouped;

  conditions.forEach((condition) => {
    if (!condition.category || !condition.value) return;

    const normalizedValue = condition.value.trim();
    if (!normalizedValue) return;

    const list = grouped.get(condition.category) ?? [];
    list.push(normalizedValue);
    grouped.set(condition.category, list);
  });

  return grouped;
}

function deviceValuesForCategory(device: DeviceRecord, category: OnThisDeviceCategory): string[] {
  if (category === 'applications') return device.applications;
  if (category === 'patches') return device.patches;
  if (category === 'processes') return device.processes;
  if (category === 'services') return device.services;
  if (category === 'peripherals') return device.peripherals;
  if (category === 'browser') return device.browser;
  return device.browserExtensions;
}

function isOnThisDeviceMatch(device: DeviceRecord, conditions: OnThisDeviceCondition[] | undefined): boolean {
  const grouped = normalizeOnThisDeviceConditions(conditions);

  if (grouped.size === 0) return true;

  return Array.from(grouped.entries()).every(([category, acceptedValues]) => {
    const rowValues = deviceValuesForCategory(device, category);
    return acceptedValues.some((acceptedValue) => rowValues.includes(acceptedValue));
  });
}

export function applyDeviceFilters(rows: DeviceRecord[], state: DeviceFilterState, now: Date = new Date()): DeviceRecord[] {
  const nowMs = now.getTime();

  return rows.filter((row) => {
    return (
      hasAny(state.deviceType, row.type) &&
      hasAny(state.os, row.os) &&
      hasAny(state.location, row.location) &&
      hasAny(state.accountType, row.accountType) &&
      hasAny(state.group, row.group) &&
      hasAny(state.riskScore, toRiskBand(row.riskScore)) &&
      hasAny(state.status, row.status) &&
      isInTimeBucket(row.lastConnectedAt, state.lastConnected, nowMs) &&
      isSourceCoverageMatch(row.sourceCoverage, state.sourceCoverage) &&
      hasAny(state.manufacturer, row.manufacturer) &&
      hasAny(state.model, row.model) &&
      hasAny(state.authRepo, row.authRepo) &&
      hasAny(state.nasSite, row.nasSite) &&
      hasAny(state.macVendor, row.macVendor) &&
      hasAny(state.nasIp, row.nasIp) &&
      isInTimeBucket(row.agentpLastReported, state.agentpLastReported, nowMs) &&
      hasAnyByPredicate(state.riskViolation, (selected) => row.riskViolations.includes(selected)) &&
      hasAny(state.agentpVersion, row.agentpVersion) &&
      (!state.agentpVersionOlderThan || row.agentpVersion == null || compareVersionsNumeric(row.agentpVersion, state.agentpVersionOlderThan) < 0) &&
      isOnThisDeviceMatch(row, state.onThisDevice)
    );
  });
}

function devicesBucketMatch(deviceCount: number, selected: AccountFilterState['devices']): boolean {
  if (!selected || selected.length === 0) return true;

  return selected.some((bucket) => {
    if (bucket === 'none') return deviceCount === 0;
    if (bucket === 'oneToTwo') return deviceCount >= 1 && deviceCount <= 2;
    if (bucket === 'threeToFive') return deviceCount >= 3 && deviceCount <= 5;
    return deviceCount >= 6;
  });
}

function lastLoginBucketMatch(lastLoginDays: number | null | undefined, selected: AccountFilterState['lastLogin']): boolean {
  if (!selected || selected.length === 0) return true;
  if (lastLoginDays == null) return false;

  return selected.some((bucket) => {
    if (bucket === 'today') return lastLoginDays === 0;
    if (bucket === 'days1to7') return lastLoginDays >= 1 && lastLoginDays <= 7;
    if (bucket === 'days8to30') return lastLoginDays >= 8 && lastLoginDays <= 30;
    return lastLoginDays > 30;
  });
}

export interface AccountFilterRow extends AccountRecord {
  blocked?: boolean;
  deviceCount?: number;
  lastLoginDays?: number;
}

export function applyAccountFilters(rows: AccountFilterRow[], state: AccountFilterState): AccountFilterRow[] {
  return rows.filter((row) => {
    const blockedState = row.blocked ? 'Blocked' : 'Not blocked';
    const deviceCount = row.deviceCount ?? 0;
    const lastLoginDays = row.lastLoginDays ?? null;

    return (
      hasAny(state.accountType, row.accountType) &&
      hasAny(state.group, row.group) &&
      hasAny(state.location, row.location) &&
      hasAny(state.authRepo, row.authRepo) &&
      hasAny(state.nasSite, row.nasSite) &&
      hasAny(state.blocked, blockedState) &&
      devicesBucketMatch(deviceCount, state.devices) &&
      lastLoginBucketMatch(lastLoginDays, state.lastLogin) &&
      isSourceCoverageMatch(row.sourceCoverage, state.sourceCoverage)
    );
  });
}
