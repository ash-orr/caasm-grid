import { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from './Tooltip';
import styles from './AssetsTable.module.css';
import { formatSourceSyncAge, getExposureGapCardState, type SourceCoverageRow } from './sourceCoverage';

interface SourceCoverageCardProps {
  rows: SourceCoverageRow[];
}

function statusClass(status: SourceCoverageRow['status']): string {
  if (status === 'Reporting') return styles.detailPillOk;
  if (status === 'Stale') return styles.detailPillWarn;
  if (status === 'Not present') return styles.detailPillBad;
  return styles.detailPillNeutral;
}

function statusLabel(status: SourceCoverageRow['status']): string {
  if (status === 'N/A') return 'Not applicable';
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
    <div className={styles.detailCard}>
      <h3 className={styles.detailCardTitle}>Exposure gaps</h3>
      {cardState.summaryText ? (
        <div className={styles.detailMuted}>{cardState.summaryText}</div>
      ) : null}
      {rows.length === 0 ? (
        <p className={styles.detailMuted}>No connected sources.</p>
      ) : (
        <dl className={styles.sourceCoverageList}>
          {cardState.visibleRows.map((row) => {
            const age = formatSourceSyncAge(row.status, row.lastSyncAt);

            return (
              <div className={styles.sourceCoverageRow} key={row.source}>
                <dt className={styles.sourceName}>
                  <SourceNameCell value={row.source} />
                </dt>
                <dd className={styles.sourceValue}>
                  <span className={`${styles.detailPill} ${statusClass(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                  {age ? <span className={styles.detailMuted}>{age}</span> : null}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {cardState.showToggle ? (
        <button className={styles.linkBtn} onClick={() => setExpanded((prev) => !prev)} type="button">
          {cardState.toggleLabel}
        </button>
      ) : null}
    </div>
  );
}
