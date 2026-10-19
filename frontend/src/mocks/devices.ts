import {
  accounts,
  devices,
  type AccountRecord,
  type AuthRepository,
  type DeviceRecord,
  type RiskViolation,
  type SourceCoverage,
  type SourceCoverageCell,
  type SourceFieldValue,
  type SourceName,
  type SourceStatus,
} from './generated/prototype-data.js';

export type {
  AccountRecord,
  AuthRepository,
  DeviceRecord,
  RiskViolation,
  SourceCoverage,
  SourceCoverageCell,
  SourceFieldValue,
  SourceName,
  SourceStatus,
};

export { accounts, devices };

export function loadPrototypeData(): Promise<{ accounts: AccountRecord[]; devices: DeviceRecord[] }> {
  return Promise.resolve({ accounts, devices });
}

export function ensurePrototypeData(): { accounts: AccountRecord[]; devices: DeviceRecord[] } {
  return { accounts, devices };
}

export function createPrototypeData(_input: { seed?: number; nowMs?: number } = {}): {
  accounts: AccountRecord[];
  devices: DeviceRecord[];
} {
  return { accounts, devices };
}
