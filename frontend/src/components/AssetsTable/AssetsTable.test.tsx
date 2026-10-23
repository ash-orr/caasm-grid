import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { accounts, devices } from '../../mocks/generated/prototype-data';
import { AssetsTable } from './AssetsTable';
import { renderRiskScorePill, renderStatusCell } from './cellRenderers';
import { getSourceFieldAgreementRows } from './sourceAgreement';

describe('AssetsTable cell renderers', () => {
  it('renders a compact risk score pill without the band label text', () => {
    const { container } = render(<>{renderRiskScorePill(72)}</>);

    expect(screen.getByText('72')).toBeTruthy();
    expect(container.textContent).not.toContain('72 (Blocked)');
    expect(container.textContent).not.toContain('Blocked');
  });

  it('renders the device status as a pill with prototype semantics', () => {
    const { container } = render(<>{renderStatusCell('Blocked')}</>);

    expect(container.textContent).toBe('Blocked');
    expect(container.querySelector('span')?.className).toContain('pill');
  });
});

describe('AssetsTable', () => {
  it('renders the table shell', () => {
    render(<AssetsTable />);
    expect(screen.getByText('Rows per page')).toBeTruthy();
  });

  it('builds source-agreement rows for the Overview tab', () => {
    const deviceRows = getSourceFieldAgreementRows(devices[7]);
    const conflictRow = deviceRows.find((row) => row.fieldKey === 'osVersion');

    expect(conflictRow?.hasConflict).toBe(true);
    expect(conflictRow?.label).toBe('OS version');

    const accountRows = getSourceFieldAgreementRows(accounts[1]);
    const loginRow = accountRows.find((row) => row.fieldKey === 'lastLogin');

    expect(loginRow?.sourceCount).toBeGreaterThan(0);
    expect(loginRow?.label).toBe('Last login');
  });
});
