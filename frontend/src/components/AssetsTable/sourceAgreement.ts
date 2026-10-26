import type { AccountRecord, DeviceRecord } from '../../mocks/generated/prototype-data';

export interface SourceFieldAgreementSource {
  source: string;
  fieldName: string;
  value: string | null;
}

export interface SourceFieldAgreementRow {
  fieldKey: string;
  label: string;
  value: string;
  rawValue: string | null;
  sourceCount: number;
  hasConflict: boolean;
  sources: SourceFieldAgreementSource[];
}

function buildSourceFieldAgreementLabel(key: string): string {
  const labels: Record<string, string> = {
    name: 'Account name',
    hostname: 'Hostname',
    group: 'Group',
    lastLogin: 'Last login',
    os: 'OS',
    osVersion: 'OS version',
    manufacturer: 'Vendor',
    model: 'Device model',
    lastSeen: 'Last seen by sources',
    location: 'Location',
  };

  return labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

export function getSourceFieldAgreementRows(record: AccountRecord | DeviceRecord): SourceFieldAgreementRow[] {
  const rows: Array<SourceFieldAgreementRow | null> = Object.entries(record.sourceFieldValues ?? {})
    .map(([fieldKey, field]) => {
      if (!field) return null;

      const sources: SourceFieldAgreementSource[] = Object.entries(field.valuesBySource ?? {})
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([source, value]) => ({
          source,
          fieldName: field.fieldNamesBySource?.[source] ?? fieldKey,
          value: value === null ? null : String(value),
        }));

      if (sources.length === 0) return null;

      const counts = new Map<string, number>();
      for (const entry of sources) {
        const key = (entry.value ?? '').toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      const winningValue = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '—';

      return {
        fieldKey,
        label: buildSourceFieldAgreementLabel(fieldKey),
        value: field.value ? String(field.value) : winningValue,
        rawValue: field.value ?? null,
        sourceCount: sources.length,
        hasConflict: field.hasConflict && sources.length > 1,
        sources,
      };
    });

  return rows.filter((row): row is SourceFieldAgreementRow => row !== null);
}
