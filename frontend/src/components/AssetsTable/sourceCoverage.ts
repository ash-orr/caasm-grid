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

export interface ExposureGapCardState {
  visibleRows: SourceCoverageRow[];
  hiddenRows: SourceCoverageRow[];
  showToggle: boolean;
  toggleLabel: string;
  summaryText: string | null;
}

const SOURCE_CARD_MAX_ROWS = 5;
const SOURCE_STATUS_ORDER: Record<SourceCoverageRow['status'], number> = {
  'Not present': 0,
  Stale: 1,
  Pending: 2,
  Reporting: 3,
  'N/A': 4,
  'Not applicable': 4,
};

export function sortSourceCoverageRows(rows: SourceCoverageRow[]): SourceCoverageRow[] {
  return [...rows].sort((left, right) => {
    const statusDelta = (SOURCE_STATUS_ORDER[left.status] ?? Number.MAX_SAFE_INTEGER) - (SOURCE_STATUS_ORDER[right.status] ?? Number.MAX_SAFE_INTEGER);
    if (statusDelta !== 0) return statusDelta;
    return left.source.localeCompare(right.source);
  });
}

export function formatSourceSyncAge(
  status: SourceCoverageRow['status'],
  lastSyncAt: string | null,
  nowMs = Date.now()
): string | null {
  if (!lastSyncAt) return null;
  if (status === 'Pending' || status === 'Not applicable' || status === 'Not present' || status === 'N/A') return null;

  const parsed = Date.parse(lastSyncAt);
  if (Number.isNaN(parsed)) return null;

  const diffHours = Math.max(0, Math.floor((nowMs - parsed) / (1000 * 60 * 60)));
  if (diffHours < 1) return '<1h ago';
  if (diffHours >= 48) return `${Math.floor(diffHours / 24)}d ago`;
  return `${diffHours}h ago`;
}

export function getExposureGapCardState(rows: SourceCoverageRow[], expanded: boolean): ExposureGapCardState {
  const sortedRows = sortSourceCoverageRows(rows);

  if (sortedRows.length === 0) {
    return {
      visibleRows: [],
      hiddenRows: [],
      showToggle: false,
      toggleLabel: '',
      summaryText: 'No connected sources.',
    };
  }

  const issueRows = sortedRows.filter((row) => row.status === 'Not present' || row.status === 'Stale' || row.status === 'Pending');
  const reportingRows = sortedRows.filter((row) => row.status === 'Reporting');
  const notApplicableRows = sortedRows.filter((row) => row.status === 'N/A' || row.status === 'Not applicable');
  const allSourcesReporting = issueRows.length === 0 && reportingRows.length > 0;

  if (expanded) {
    return {
      visibleRows: sortedRows,
      hiddenRows: [],
      showToggle: true,
      toggleLabel: 'Hide details',
      summaryText: null,
    };
  }

  if (allSourcesReporting) {
    return {
      visibleRows: [],
      hiddenRows: sortedRows,
      showToggle: true,
      toggleLabel: 'See details',
      summaryText: 'All sources reporting',
    };
  }

  const visibleRows = issueRows.length > 0 ? issueRows : sortedRows;
  const hiddenRows = visibleRows === sortedRows ? [] : sortedRows.filter((row) => !issueRows.includes(row));

  if (visibleRows === sortedRows && issueRows.length === 0 && reportingRows.length === 0 && notApplicableRows.length > 0) {
    return {
      visibleRows: sortedRows,
      hiddenRows: [],
      showToggle: false,
      toggleLabel: '',
      summaryText: null,
    };
  }

  const hiddenParts: string[] = [];
  if (reportingRows.length > 0) hiddenParts.push(`${reportingRows.length} Reporting`);
  if (notApplicableRows.length > 0) hiddenParts.push(`${notApplicableRows.length} Not applicable`);

  return {
    visibleRows,
    hiddenRows,
    showToggle: hiddenRows.length > 0 || (allSourcesReporting && reportingRows.length > 0),
    toggleLabel: hiddenParts.length > 0 ? `+${hiddenParts.join(', ')}` : '',
    summaryText: null,
  };
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
