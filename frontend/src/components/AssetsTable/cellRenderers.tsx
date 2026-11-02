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

function formatRiskChangeTime(at: string | Date): string {
  const value = typeof at === 'string' ? new Date(at) : at;
  if (Number.isNaN(value.getTime())) return '—';

  const diffHours = Math.max(0, Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60)));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;

  const month = value.toLocaleDateString('en-US', { month: 'short' });
  const day = value.getDate();
  const time = value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${month} ${day} ${time}`;
}

function renderRiskHistoryTooltip(score: number | null, changes: Array<{ at: string | Date; from: number; to: number }> = []): ReactNode {
  if (score == null) return undefined;

  const band = riskBand(score);
  const orderedChanges = [...changes].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

  if (orderedChanges.length === 0) {
    return (
      <>
        <div style={{ fontWeight: 600 }}>Risk score changes, last 7 days</div>
        <div style={{ color: 'rgb(93, 107, 120)' }}>No changes in the last 7 days</div>
      </>
    );
  }

  return (
    <>
      <div style={{ fontWeight: 600 }}>Risk score changes, last 7 days</div>
      <div style={{ color: 'rgb(93, 107, 120)', margin: '2px 0 8px' }}>Current: {score} ({band})</div>
      {orderedChanges.map((change, index) => (
        <div key={`${change.at}-${change.from}-${change.to}-${index}`} style={index > 0 ? { marginTop: '4px' } : undefined}>
          {formatRiskChangeTime(change.at)}: {change.from} ({riskBand(change.from)}) → {change.to} ({riskBand(change.to)})
        </div>
      ))}
    </>
  );
}

export function renderRiskScorePill(score: number | null, changes: Array<{ at: string | Date; from: number; to: number }> = []): ReactNode {
  if (score == null) return '—';

  const band = riskBand(score);
  const tone = band === 'Blocked' ? statusPillStyles.bad : band === 'Alert' ? statusPillStyles.warn : statusPillStyles.ok;
  const tooltipContent = renderRiskHistoryTooltip(score, changes);

  const pill = (
    <span aria-label={`${score} ${band}`} data-testid="risk-pill" className={`${statusPillStyles.pill} ${statusPillStyles.score} ${tone}`}>
      {score}
    </span>
  );

  if (!tooltipContent) return pill;

  return <Tooltip content={tooltipContent}>{pill}</Tooltip>;
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
