import { describe, expect, it } from 'vitest';
import { accounts, devices } from '../src/mocks/generated/prototype-data.js';

describe('mock data contract', () => {
  it('keeps lastConnectedAt and agentpLastReported separate fields', () => {
    const firstDevice = devices[0];

    expect(firstDevice).toHaveProperty('lastConnectedAt');
    expect(firstDevice).toHaveProperty('agentpLastReported');
    expect(typeof firstDevice.lastConnectedAt).toBe('string');
    expect(typeof firstDevice.agentpLastReported).toBe('string');
  });

  it('allows MAC-based accounts to have no auth repository', () => {
    const macAccount = accounts.find((account) => account.accountType === 'MAC');

    expect(macAccount).toBeDefined();
    expect(macAccount?.authRepo).toBeNull();
  });
});
