import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AssetsTable } from './AssetsTable';

afterEach(() => {
  cleanup();
});

describe('AssetsTable real data', () => {
  it('devices tab shows 140 rows total and Page 1 of 3 at the default 50 per page', () => {
    render(<AssetsTable />);

    expect(screen.getByText('140 rows')).toBeTruthy();
    expect(screen.getByText('Page 1 of 3')).toBeTruthy();
  });

  it('devices tab with Show all renders all 140 rows on one page', () => {
    render(<AssetsTable />);

    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: String(-1) } });

    expect(screen.getByText('140 rows')).toBeTruthy();
    expect(screen.getByText('Page 1 of 1')).toBeTruthy();
  });

  it('accounts tab shows 46 rows total and Page 1 of 1 at 50 per page', () => {
    render(<AssetsTable />);

    fireEvent.click(screen.getByRole('button', { name: 'Accounts' }));

    expect(screen.getByText('46 rows')).toBeTruthy();
    expect(screen.getByText('Page 1 of 1')).toBeTruthy();
  });

  it('selecting the first 50 device rows via the header checkbox shows the 140-device banner', () => {
    render(<AssetsTable />);

    fireEvent.click(screen.getByLabelText('Select page rows'));

    expect(screen.getByText('Select all 140 devices')).toBeTruthy();
  });

  it('does not render synthetic names with trailing #N suffixes', () => {
    render(<AssetsTable />);

    const rows = screen.getAllByRole('row');
    const names = rows
      .map((row) => row.textContent ?? '')
      .filter((value) => /\s#\d+$/.test(value));

    expect(names).toHaveLength(0);
  });

  it('opens IOT-1049 without synthetic suffixes and shows plain account device names', () => {
    render(<AssetsTable />);

    fireEvent.change(screen.getByPlaceholderText('Search devices, accounts, OS, location'), { target: { value: 'IOT-1049' } });
    fireEvent.click(screen.getAllByText('IOT-1049')[0]);

    expect(
      screen.getByText((_content, element) => {
        return element?.textContent === 'IOT-1049' && element.className.includes('detailCrumbCurrent');
      })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'casey@acme.com' }));

    expect(screen.getByText((content, element) => /Associated devices \(/.test(content ?? '') && element?.tagName.toLowerCase() === 'h3')).toBeTruthy();
    expect(screen.getAllByText('IOT-1049').length).toBeGreaterThan(0);
  });
});
