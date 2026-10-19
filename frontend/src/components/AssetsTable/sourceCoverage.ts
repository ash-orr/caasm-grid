import type { SourceStatus } from '../../mocks/generated/prototype-data.js';

export interface SourceCoverageRow {
  source: string;
  status: SourceStatus | 'Not applicable';
  lastSyncAt: string | null;
}

export interface SourceCoverageVisibility {
  visibleCount: number;
  hiddenCount: number;
  showToggle: boolean;
  toggleLabel: string;
}

const SOURCE_CARD_MAX_ROWS = 5;

export function formatSourceSyncAge(
  status: SourceCoverageRow['status'],
  lastSyncAt: string | null,
  nowMs = Date.now()
): string | null {
  if (!lastSyncAt) return null;
  if (status === 'Pending' || status === 'Not applicable' || status === 'Not present') return null;

  const parsed = Date.parse(lastSyncAt);
  if (Number.isNaN(parsed)) return null;

  const diffHours = Math.max(0, Math.floor((nowMs - parsed) / (1000 * 60 * 60)));
  if (diffHours < 1) return '<1h ago';
  if (diffHours >= 48) return `${Math.floor(diffHours / 24)}d ago`;
  return `${diffHours}h ago`;
}

export function getSourceCoverageVisibility(totalRows: number, expanded: boolean): SourceCoverageVisibility {
  if (totalRows <= SOURCE_CARD_MAX_ROWS) {
    return {
      visibleCount: totalRows,
      hiddenCount: 0,
      showToggle: false,
      toggleLabel: '',
    };
  }

  if (expanded) {
    return {
      visibleCount: totalRows,
      hiddenCount: totalRows - SOURCE_CARD_MAX_ROWS,
      showToggle: true,
      toggleLabel: 'Collapse',
    };
  }

  const hiddenCount = totalRows - SOURCE_CARD_MAX_ROWS;
  return {
    visibleCount: SOURCE_CARD_MAX_ROWS,
    hiddenCount,
    showToggle: true,
    toggleLabel: `Show all (+${hiddenCount})`,
  };
}
