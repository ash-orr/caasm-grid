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
    expect(conflictDevice?.sourceFieldValues.osVersion.value).toBe('10.4.552');

    const deviceConflicts = devices.filter((device) => Object.values(device.sourceFieldValues).some((field) => field.hasConflict)).length;
    const accountConflicts = accounts.filter((account) => Object.values(account.sourceFieldValues).some((field) => field.hasConflict)).length;

    expect(deviceConflicts).toBe(54);
    expect(accountConflicts).toBe(0);
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
    const prototypeAccountConflicts = 0;

    const portDeviceConflicts = devices.filter((device) => Object.values(device.sourceFieldValues).some((field) => field.hasConflict)).length;
    const portAccountConflicts = accounts.filter((account) => Object.values(account.sourceFieldValues).some((field) => field.hasConflict)).length;

    expect(portDeviceConflicts).toBe(prototypeDeviceConflicts);
    expect(portAccountConflicts).toBe(prototypeAccountConflicts);
    expect(portDeviceConflicts).toBe(54);
    expect(portAccountConflicts).toBe(0);
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
