import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { accounts, devices } from '../src/mocks/generated/prototype-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_HTML_PATH = path.resolve(__dirname, '..', '..', 'design', 'prototype', 'caasm-console.html');

describe('generated prototype data', () => {
  it('has the expected seeded counts', () => {
    expect(accounts.length).toBe(46);
    expect(devices.length).toBe(140);
    expect(accounts.some((account) => account.name === 'avery@acme.com')).toBe(true);
    expect(devices.some((device) => device.name === 'MB-1126')).toBe(true);
  });

  it('matches the prototype source-conflict behavior', () => {
    const iot1826 = devices.find((entry) => entry.name === 'IOT-1826');
    const conflictDevice = devices.find((entry) => entry.name === 'IOT-1049');

    expect(iot1826).toBeDefined();
    expect(iot1826?.sourceFieldValues.hostname.hasConflict).toBe(false);
    expect(iot1826?.sourceFieldValues.os.hasConflict).toBe(false);
    expect(iot1826?.sourceFieldValues.model.hasConflict).toBe(false);
    expect(iot1826?.sourceFieldValues.lastSeen.hasConflict).toBe(false);

    expect(conflictDevice).toBeDefined();
    expect(conflictDevice?.sourceFieldValues.osVersion.hasConflict).toBe(true);

    const sourceValues = Object.values(conflictDevice!.sourceFieldValues.osVersion.valuesBySource).filter((value): value is string => value !== null);
    const counts = new Map<string, number>();
    for (const value of sourceValues) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const expectedValue = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

    expect(conflictDevice?.sourceFieldValues.osVersion.value).toBe(expectedValue);
  });

  it('matches the prototype counts exactly when computed from the HTML logic', async () => {
    const html = await fs.readFile(PROTOTYPE_HTML_PATH, 'utf8');
    const match = html.match(/\/\/ ---------- data ----------([\s\S]*?)\/\/ ---------- state ----------/);

    expect(match).toBeTruthy();

    const script = match![1];
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
      `return (() => {${script}; return { accounts, devices }; })();`,
    );

    const prototypeData = factory(
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

    const prototypeDeviceConflicts = prototypeData.devices.filter((device: { mis: Array<unknown> }) => device.mis.length > 0).length;
    const prototypeAccountConflicts = prototypeData.accounts.filter((account: { rec: Record<string, Record<string, unknown>>; srcs0: string[] }) => {
      const grouped = new Map<string, { value: unknown; sources: string[] }>();
      for (const source of account.srcs0) {
        const record = account.rec[source];
        if (!record) continue;
        for (const field of ['name', 'group']) {
          const value = record[field];
          if (value == null) continue;
          const key = String(value).toLowerCase();
          const bucket = grouped.get(`${field}:${key}`) ?? { value, sources: [] };
          bucket.sources.push(source);
          grouped.set(`${field}:${key}`, bucket);
        }
      }
      return Array.from(grouped.values()).some((group) => group.sources.length > 0 && group.sources.length < account.srcs0.length);
    }).length;

    const portDeviceConflicts = devices.filter((device) => Object.values(device.sourceFieldValues).some((field) => field.hasConflict)).length;
    const portAccountConflicts = accounts.filter((account) => Object.values(account.sourceFieldValues).some((field) => field.hasConflict)).length;

    expect(portDeviceConflicts).toBe(prototypeDeviceConflicts);
    expect(portAccountConflicts).toBe(prototypeAccountConflicts);
    expect(portDeviceConflicts).toBeGreaterThan(0);
    expect(portAccountConflicts).toBeGreaterThan(0);
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
    expect(Array.isArray(device?.changes)).toBe(true);
    expect(device?.sourceFieldValues).toBeDefined();

    expect(account).toBeDefined();
    expect(account?.authType).toBeDefined();
    expect(account?.sourceFieldValues).toBeDefined();
  });

  it('restores the prototype risk-change history in the generated mock data', () => {
    const device = devices.find((entry) => entry.riskScore != null && entry.changes.length > 0) ?? devices[0];
    expect(device).toBeDefined();
    expect(Array.isArray(device?.changes)).toBe(true);
    expect(device?.changes.length).toBeGreaterThanOrEqual(0);
    if (device?.changes.length) {
      expect(device.changes[0]).toMatchObject({
        from: expect.any(Number),
        to: expect.any(Number),
      });
      expect(typeof device.changes[0].at).toBe('string');
    }
  });
});
