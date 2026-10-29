import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusPill } from '../StatusPill';
import { Tooltip } from './Tooltip';
import styles from './AssetsTable.module.css';
import { formatSourceSyncAge, getExposureGapCardState, type SourceCoverageRow } from './sourceCoverage';

interface SourceCoverageCardProps {
  rows: SourceCoverageRow[];
}

function statusPillStatus(status: SourceCoverageRow['status']): 'Reporting' | 'Stale' | 'Pending' | 'Not present' | 'N/A' {
  if (status === 'Not applicable') return 'N/A';
  if (status === 'N/A') return 'N/A';
  if (status === 'Pending') return 'Pending';
  if (status === 'Not present') return 'Not present';
  if (status === 'Stale') return 'Stale';
  return 'Reporting';
}

function statusLabel(status: SourceCoverageRow['status']): string {
  if (status === 'N/A' || status === 'Not applicable') return 'Not applicable';
  return status;
}

function SourceNameCell({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      setTruncated(node.scrollWidth > node.clientWidth);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [value]);

  return (
    <Tooltip content={truncated ? value : undefined}>
      <span className={styles.sourceNameValue} ref={ref}>
        {value}
      </span>
    </Tooltip>
  );
}

export function SourceCoverageCard({ rows }: SourceCoverageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const cardState = useMemo(
    () => getExposureGapCardState(rows, expanded),
    [rows, expanded]
  );

  return (
    <div className={styles.detailCard} data-testid="source-coverage-card">
      <h3 className={styles.detailCardTitle}>Exposure gaps</h3>
      {cardState.summaryText ? (
        <div className={styles.detailCardSummary}>{cardState.summaryText}</div>
      ) : null}
      {rows.length === 0 ? (
        <p className={styles.detailMuted}>No connected sources.</p>
      ) : (
        <dl className={styles.sourceCoverageList}>
          {cardState.visibleRows.map((row) => {
            const age = formatSourceSyncAge(row.status, row.lastSyncAt);

            return (
              <div className={styles.sourceCoverageRow} key={row.source}>
                <dt className={styles.sourceName} data-testid="source-coverage-source">
                  <SourceNameCell value={row.source} />
                </dt>
                <dd className={styles.sourceValue}>
                  <StatusPill status={statusPillStatus(row.status)} label={statusLabel(row.status)} dataTestId="source-coverage-pill" />
                  {age ? <span className={styles.detailMuted} data-testid="source-coverage-time">{age}</span> : null}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {cardState.showToggle ? (
        <button className={styles.linkBtn} data-testid="source-coverage-toggle" onClick={() => setExpanded((prev) => !prev)} type="button">
          {cardState.toggleLabel}
        </button>
      ) : null}
    </div>
  );
}
