import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { devices } from '../src/mocks/generated/prototype-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_HTML_PATH = path.resolve(__dirname, '..', '..', 'design', 'prototype', 'caasm-console.html');

type ProtoDevice = { name: string; uncov?: boolean };
let protoDevices: ProtoDevice[] = [];

beforeAll(async () => {
  const html = await fs.readFile(PROTOTYPE_HTML_PATH, 'utf8');
  const match = html.match(/\/\/ ---------- data ----------([\s\S]*?)\/\/ ---------- state ----------/);
  const factory = new Function(
    'console', 'Date', 'Math', 'Set', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Intl',
    `return (() => {${match![1]}; return { accounts, devices }; })();`,
  );
  protoDevices = factory(console, Date, Math, Set, Array, Object, String, Number, Boolean, RegExp, Intl).devices;
});

const uncoveredPort = () => devices.filter((d) => d.coverageGaps.includes('Portnox AgentP'));

describe('devices not covered by Portnox AgentP', () => {
  it('the prototype has 16 uncovered devices', () => {
    expect(protoDevices.filter((d) => d.uncov).length).toBe(16);
  });

  it('the mocks mark exactly the same devices as uncovered as the prototype', () => {
    const proto = protoDevices.filter((d) => d.uncov).map((d) => d.name).sort();
    const port = uncoveredPort().map((d) => d.name).sort();
    expect(port).toEqual(proto);
  });

  it('uncovered devices have null risk score, location, account type and group', () => {
    for (const d of uncoveredPort()) {
      expect(d.riskScore, d.name).toBeNull();
      expect(d.location, d.name).toBeNull();
      expect(d.accountType, d.name).toBeNull();
      expect(d.group, d.name).toBeNull();
    }
  });

  it('uncovered devices have a null status', () => {
    for (const d of uncoveredPort()) expect(d.status, d.name).toBeNull();
  });

  it('uncovered devices have null last connected, auth type and agent versions', () => {
    for (const d of uncoveredPort()) {
      expect(d.lastConnectedAt, d.name).toBeNull();
      expect(d.authType, d.name).toBeNull();
      expect(d.agentVersion, d.name).toBeNull();
      expect(d.agentpVersion, d.name).toBeNull();
    }
  });

  it('covered devices keep their values', () => {
    const covered = devices.filter((d) => !d.coverageGaps.includes('Portnox AgentP'));
    expect(covered.length).toBe(124);
    for (const d of covered) {
      expect(d.riskScore, d.name).not.toBeNull();
      expect(d.status, d.name).not.toBeNull();
    }
  });
});
