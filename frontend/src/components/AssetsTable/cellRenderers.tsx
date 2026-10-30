import type { ReactNode } from 'react';
import statusPillStyles from '../StatusPill/StatusPill.module.css';
import type { DeviceRecord } from '../../mocks/generated/prototype-data';
import { Tooltip } from './Tooltip';

function riskBand(score: number | null): 'Access' | 'Alert' | 'Blocked' | null {
  if (score == null) return null;
  if (score >= 70) return 'Blocked';
  if (score >= 40) return 'Alert';
  return 'Access';
}

export function renderRiskScorePill(score: number | null): ReactNode {
  if (score == null) return '—';

  const band = riskBand(score);
  const tone = band === 'Blocked' ? statusPillStyles.bad : band === 'Alert' ? statusPillStyles.warn : statusPillStyles.ok;
  return (
    <span aria-label={`${score} ${band}`} data-testid="risk-pill" className={`${statusPillStyles.pill} ${statusPillStyles.score} ${tone}`}>
      {score}
    </span>
  );
}

function renderBlockedStatusTooltip(device: DeviceRecord) {
  if (device.status !== 'Blocked') return undefined;

  const reasons = [
    device.bAdmin && `Blocked by Admin: ${device.bAdmin}`,
    device.bPolicy && `Blocked by Policy: ${device.bPolicy}`,
    device.bRisk != null && `Blocked by Risk Score: ${device.bRisk}`,
    device.bAcct && 'Account blocked',
  ].filter(Boolean) as string[];

  if (reasons.length === 0) {
    return (
      <div>
        <div>Blocked</div>
      </div>
    );
  }

  return (
    <div>
      {reasons.map((reason, index) => (
        <div key={reason} style={{ marginTop: index === 0 ? undefined : '4px' }}>{reason}</div>
      ))}
    </div>
  );
}

export function renderStatusCell(status: DeviceRecord['status'], device?: DeviceRecord): ReactNode {
  if (status == null) return '—';

  const tone = status === 'Blocked' ? statusPillStyles.bad : statusPillStyles.light;
  const content = status === 'Blocked' && device ? renderBlockedStatusTooltip(device) : undefined;

  if (status !== 'Blocked') {
    return (
      <span aria-label={status} data-testid="status-pill" className={`${statusPillStyles.pill} ${tone}`}>
        {status}
      </span>
    );
  }

  return (
    <Tooltip content={content}>
      <span aria-label={status} data-testid="status-pill" className={`${statusPillStyles.pill} ${tone}`}>
        {status}
      </span>
    </Tooltip>
  );
}
