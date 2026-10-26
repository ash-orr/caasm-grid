import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { accounts, devices } from '../../mocks/generated/prototype-data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_HTML_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'design', 'prototype', 'caasm-console.html');

type PrototypeField = {
  valuesBySource?: Record<string, string | null>;
  fieldNamesBySource?: Record<string, string>;
  hasConflict?: boolean;
};

type PrototypeRecord = {
  name?: string;
  sourceFieldValues?: Record<string, PrototypeField>;
};

async function loadPrototypeData(): Promise<{ devices: PrototypeRecord[]; accounts: PrototypeRecord[] }> {
  const html = await fs.readFile(PROTOTYPE_HTML_PATH, 'utf8');
  const match = html.match(/\/\/ ---------- data ----------([\s\S]*?)\/\/ ---------- state ----------/);
  if (!match) {
    throw new Error('Prototype data script not found in caasm-console.html');
  }

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
    `return (() => {${match[1]}; return { accounts, devices }; })();`,
  );

  const prototype = factory(
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

  return { devices: prototype.devices, accounts: prototype.accounts };
}

function getExpectedPrototypeRawLines(record: PrototypeRecord, fieldKey: string): string[] {
  const field = record.sourceFieldValues?.[fieldKey];
  if (!field || !field.valuesBySource) return [];

  return Object.entries(field.valuesBySource)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([source, value]) => {
      const fieldName = field.fieldNamesBySource?.[source] ?? fieldKey;
      return `${source}  "${fieldName}": "${String(value)}"`;
    });
}

describe('raw-values parity', () => {
  it('raw lines match the prototype rawRow for every conflict row on every record', async () => {
    const prototypeData = await loadPrototypeData();
    const portRecords = [...devices, ...accounts];
    const prototypeRecords = [...prototypeData.devices, ...prototypeData.accounts];
    let rowsCompared = 0;

    for (const prototypeRecord of prototypeRecords) {
      const portRecord = portRecords.find((entry) => entry.name === prototypeRecord.name);
      expect(portRecord, `missing port record for ${prototypeRecord.name ?? 'unknown record'}`).toBeTruthy();

      const fieldKeys = Object.keys(prototypeRecord.sourceFieldValues ?? {}).filter(
        (fieldKey) => prototypeRecord.sourceFieldValues?.[fieldKey]?.hasConflict,
      );

      for (const fieldKey of fieldKeys) {
        const expectedLines = getExpectedPrototypeRawLines(prototypeRecord, fieldKey);
        const actualField = portRecord!.sourceFieldValues[fieldKey];
        expect(actualField, `missing port source field ${fieldKey} for ${prototypeRecord.name ?? 'unknown record'}`).toBeTruthy();

        const actualLines = Object.entries(actualField.valuesBySource ?? {})
          .filter(([, value]) => value !== null && value !== undefined && value !== '')
          .map(([source, value]) => {
            const fieldName = actualField.fieldNamesBySource?.[source] ?? fieldKey;
            return `${source}  "${fieldName}": "${String(value)}"`;
          });

        expect(actualLines).toEqual(expectedLines);
        rowsCompared += 1;
      }
    }

    console.log(`rows compared: ${rowsCompared}`);
  });
});
