import { describe, expect, it } from 'vitest';
import { accounts, devices } from '../src/mocks/generated/prototype-data.js';

describe('generated prototype data', () => {
  it('has the expected seeded counts', () => {
    expect(accounts.length).toBe(46);
    expect(devices.length).toBe(140);
    expect(accounts.some((account) => account.name === 'avery@acme.com')).toBe(true);
    expect(devices.some((device) => device.name === 'MB-1126')).toBe(true);
  });

  it('preserves required detail fields and conflict metadata', () => {
    const device = devices.find((entry) => entry.name === 'MB-1126');
    const account = accounts.find((entry) => entry.name === 'avery@acme.com');

    expect(device).toBeDefined();
    expect(device?.authType).toBeDefined();
    expect(device?.agentVersion).toBeDefined();
    expect(device?.riskPolicy).toBeDefined();
    expect(device?.accessPolicy).toBeDefined();
    expect(Array.isArray(device?.riskViolations)).toBe(true);
    expect(device?.sourceFieldValues).toBeDefined();

    expect(account).toBeDefined();
    expect(account?.authType).toBeDefined();
    expect(account?.sourceFieldValues).toBeDefined();
  });
});
