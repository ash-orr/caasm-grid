import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssetsTable } from '../src/components/AssetsTable/AssetsTable';

describe('table toolbar', () => {
  it('uses the prototype toolbar actions and removes the legacy view-settings menu', () => {
    render(<AssetsTable />);

    const filterButtons = screen.getAllByRole('button', { name: /hide filters/i });
    const searchInputs = screen.getAllByRole('searchbox', { name: 'Search' });
    const columnsButtons = screen.getAllByRole('button', { name: 'Show/hide columns' });
    const viewsButtons = screen.getAllByRole('button', { name: 'Views' });
    const exportButtons = screen.getAllByRole('button', { name: 'Export' });

    expect(filterButtons.length).toBeGreaterThan(0);
    expect(searchInputs.length).toBeGreaterThan(0);
    expect(columnsButtons.length).toBeGreaterThan(0);
    expect(viewsButtons.length).toBeGreaterThan(0);
    expect(exportButtons.length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'View settings' })).toBeNull();

    const filterButton = filterButtons[0];
    const columnsButton = columnsButtons[0];

    expect(filterButton.innerHTML).toContain('svg');
    expect(columnsButton.innerHTML).toContain('svg');

    const toolbar = filterButton.parentElement;
    expect(toolbar).toBeTruthy();

    const labels = Array.from(toolbar!.children).map((node) => {
      if (node instanceof HTMLButtonElement) {
        return node.getAttribute('aria-label') || node.textContent?.trim() || '';
      }

      if (node instanceof HTMLInputElement) {
        return node.getAttribute('aria-label') || '';
      }

      return '';
    });

    expect(labels).toContain('Hide filters');
    expect(labels).toContain('Search');
    expect(labels).toContain('Show/hide columns');
    expect(labels).toContain('Views');
    expect(labels).toContain('Export');
  });

  it('renders the column picker with the fixed-column helper text from the prototype', async () => {
    render(<AssetsTable />);

    const columnsButtons = screen.getAllByRole('button', { name: 'Show/hide columns' });
    await columnsButtons[0].click();

    expect(screen.getByText('Show, hide and reorder. Drag a row or use the arrows.')).toBeTruthy();
    expect(screen.getAllByText('Fixed').length).toBeGreaterThan(0);
  });

  it('shows the Add action in the Accounts toolbar exactly as the prototype does', () => {
    render(<AssetsTable />);

    const accountsButtons = screen.getAllByRole('button', { name: 'Accounts' });
    accountsButtons[0].click();

    const addButton = screen.getByRole('button', { name: 'Add' });
    expect(addButton).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change group' })).toBeTruthy();
  });
});
