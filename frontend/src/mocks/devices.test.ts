import { describe, expect, it } from 'vitest';
import { accounts, createPrototypeData, devices } from './devices';

describe('prototype mock data parity', () => {
  it('matches the prototype seed counts', () => {
    const generated = createPrototypeData();

    expect(generated.accounts.length).toBe(46);
    expect(generated.devices.length).toBe(140);
    expect(generated.accounts.some((account) => account.name === 'avery@acme.com')).toBe(true);
    expect(generated.devices.some((device) => device.name === 'MB-1126')).toBe(true);
  });

  it('matches key seeded prototype records', () => {
    const generated = createPrototypeData();
    const firstAccount = generated.accounts.find((account) => account.name === 'avery@acme.com');
    const prototypeDevice = generated.devices.find((device) => device.name === 'MB-1126');

    expect(firstAccount).toMatchObject({
      accountType: 'LDAP',
      group: 'Executive',
      location: 'Denver',
      authRepo: 'EntraID',
      nasSite: 'DEN-CORE-01',
    });

    expect(prototypeDevice).toMatchObject({
      type: 'Mobile',
      os: 'Android 14',
      location: 'Singapore',
      account: 'zane@acme.com',
      group: 'IT Ops',
      riskScore: 10,
      status: 'No issues',
    });

    expect(prototypeDevice?.sourceCoverage.CrowdStrike.status).toBe('Reporting');
    expect(prototypeDevice?.sourceCoverage.EntraID.status).toBe('Not present');
    expect(firstAccount?.sourceCoverage.EntraID.status).toBe('Reporting');
  });

  it('is deterministic', () => {
    const first = createPrototypeData({ seed: 7, nowMs: Date.parse('2026-10-16T13:35:00.000Z') });
    const second = createPrototypeData({ seed: 7, nowMs: Date.parse('2026-10-16T13:35:00.000Z') });

    expect(first.accounts).toEqual(second.accounts);
    expect(first.devices).toEqual(second.devices);
    expect(first.accounts).toEqual(accounts);
    expect(first.devices).toEqual(devices);
  });
});
