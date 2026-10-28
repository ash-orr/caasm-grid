import * as Tooltip from '@radix-ui/react-tooltip';
import styles from './StatusPill.module.css';

export type SourceStatus = 'Reporting' | 'Stale' | 'Pending' | 'Not present' | 'N/A';

const TONE: Record<SourceStatus, string> = {
  Reporting: styles.ok,
  Stale: styles.warn,
  'Not present': styles.bad,
  Pending: styles.light,
  'N/A': styles.light,
};

const DEVICE_TIP: Record<SourceStatus, string> = {
  Reporting: 'This source sent data for the device within the last day.',
  Stale: 'The device is in this source, but it hasn\u2019t sent data in the last day.',
  'Not present': 'Coverage gap: This source has no record of the device.',
  Pending: 'Waiting for this source\u2019s next sync.',
  'N/A': 'This source doesn\u2019t cover this type of device.',
};

const ACCOUNT_TIP: Partial<Record<SourceStatus, string>> = {
  Reporting: 'This source reports this account.',
  'Not present': 'Coverage gap: This source has no record of the account.',
  'N/A': 'This source doesn\u2019t cover this type of account.',
};

type Props = {
  status: SourceStatus;
  kind?: 'device' | 'account';
  label?: string; // optional text, e.g. "Okta: Reporting"
  dataTestId?: string;
};

export type StatusPillProps = Props;

export function StatusPill({ status, kind = 'device', label, dataTestId = 'status-pill' }: StatusPillProps) {
  const text = label ?? (status === 'N/A' ? 'Not applicable' : status);
  const tip = kind === 'account' ? ACCOUNT_TIP[status] ?? DEVICE_TIP[status] : DEVICE_TIP[status];
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span aria-label={text} data-testid={dataTestId} className={`${styles.pill} ${TONE[status]}`}>
            {text}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className={styles.tip} sideOffset={6}>
            {tip}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}