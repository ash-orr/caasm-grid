import { describe, expect, it } from 'vitest';
import {
  selectAllMatchingRows,
  shouldKeepSelectionOnChange,
  shouldResetSelectionOnChange,
} from '../src/components/AssetsTable/selection.js';

describe('selection change rules', () => {
  it('keeps the current selection for sort, page, and rows-per-page changes', () => {
    expect(shouldKeepSelectionOnChange('sort')).toBe(true);
    expect(shouldKeepSelectionOnChange('page')).toBe(true);
    expect(shouldKeepSelectionOnChange('rowsPerPage')).toBe(true);
  });

  it('resets the current selection for filter, search, and tab changes', () => {
    expect(shouldResetSelectionOnChange('filter')).toBe(true);
    expect(shouldResetSelectionOnChange('search')).toBe(true);
    expect(shouldResetSelectionOnChange('tab')).toBe(true);
  });
});

describe('select-all matching rows', () => {
  it('keeps the current selection and adds all ids that match the active filter set', () => {
    const selected = selectAllMatchingRows([2, 4], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);

    expect(selected).toEqual([1, 2, 3, 4, 5]);
  });

  it('still works when the current page is only a subset of the matching rows', () => {
    const selected = selectAllMatchingRows([2], [2, 3], [1, 2, 3, 4]);

    expect(selected).toEqual([1, 2, 3, 4]);
  });
});
