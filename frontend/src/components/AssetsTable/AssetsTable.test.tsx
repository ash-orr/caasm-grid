import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssetsTable } from './AssetsTable';
import { renderRiskScorePill, renderStatusCell } from './cellRenderers';

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
});
