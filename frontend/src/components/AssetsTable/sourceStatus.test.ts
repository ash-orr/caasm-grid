import { describe, expect, it } from 'vitest';
import { getSourceStatus } from './sourceStatus';

describe('source status helper', () => {
  it('returns Pending while a recently created device is still waiting for a source poll', () => {
    const nowMs = Date.parse('2026-10-17T12:20:00.000Z');

    expect(getSourceStatus({
      source: 'Portnox AgentP',
      coverage: false,
      createdAt: '2026-10-17T12:00:00.000Z',
      lastSeenAt: null,
      nowMs,
    })).toBe('Pending');
  });

  it('returns Not present once the expected poll window has passed without a report', () => {
    const nowMs = Date.parse('2026-10-17T13:00:00.000Z');

    expect(getSourceStatus({
      source: 'Portnox AgentP',
      coverage: false,
      createdAt: '2026-10-17T12:00:00.000Z',
      lastSeenAt: null,
      nowMs,
    })).toBe('Not present');
  });

  it('returns Stale for data older than 24 hours', () => {
    const nowMs = Date.parse('2026-10-17T12:00:00.000Z');

    expect(getSourceStatus({
      source: 'Okta',
      coverage: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      lastSeenAt: '2026-10-15T12:00:00.000Z',
      nowMs,
    })).toBe('Stale');
  });

  it('returns Reporting while a source is still within the staleness window', () => {
    const nowMs = Date.parse('2026-10-17T12:00:00.000Z');

    expect(getSourceStatus({
      source: 'Google Workspace',
      coverage: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      lastSeenAt: '2026-10-16T18:00:00.000Z',
      nowMs,
    })).toBe('Reporting');
  });
});
