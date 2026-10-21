import type { ReactNode } from 'react';
import statusPillStyles from '../StatusPill/StatusPill.module.css';
import type { DeviceRecord } from '../../mocks/generated/prototype-data';

function riskBand(score: number): 'Access' | 'Alert' | 'Blocked' {
  if (score >= 70) return 'Blocked';
  if (score >= 40) return 'Alert';
  return 'Access';
}

export function renderRiskScorePill(score: number): ReactNode {
  const band = riskBand(score);
  const tone = band === 'Blocked' ? statusPillStyles.bad : band === 'Alert' ? statusPillStyles.warn : statusPillStyles.ok;
  return (
    <span aria-label={`${score} ${band}`} data-testid="risk-pill" className={`${statusPillStyles.pill} ${tone}`}>
      {score}
    </span>
  );
}

export function renderStatusCell(status: DeviceRecord['status']): ReactNode {
  const tone = status === 'Blocked' ? statusPillStyles.bad : statusPillStyles.light;
  return (
    <span aria-label={status} data-testid="status-pill" className={`${statusPillStyles.pill} ${tone}`}>
      {status}
    </span>
  );
}
