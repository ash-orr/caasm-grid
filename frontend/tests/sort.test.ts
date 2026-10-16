import { describe, expect, it } from 'vitest';
import { compareSortValues, nextSort, sortRowsBy } from '../src/components/AssetsTable/sort.js';

describe('sort state cycle', () => {
  it('toggles asc/desc on same column and resets to asc on new column', () => {
    const start = { columnId: 'name', direction: 'asc' as const };

    const firstClickSame = nextSort(start, 'name');
    const secondClickSame = nextSort(firstClickSame, 'name');
    const clickNew = nextSort(secondClickSame, 'riskScore');

    expect(firstClickSame).toEqual({ columnId: 'name', direction: 'desc' });
    expect(secondClickSame).toEqual({ columnId: 'name', direction: 'asc' });
    expect(clickNew).toEqual({ columnId: 'riskScore', direction: 'asc' });
  });
});

describe('source-status ordering', () => {
  it('sorts source statuses as Reporting, Stale, Pending, Not present, Not applicable', () => {
    const values = ['Not present', 'Reporting', 'Pending', 'Stale', 'Not applicable'];
    const sorted = values.slice().sort(compareSortValues);

    expect(sorted).toEqual(['Reporting', 'Stale', 'Pending', 'Not present', 'Not applicable']);
  });
});

describe('row sorting', () => {
  it('applies sort before pagination slicing', () => {
    const rows = [
      { id: 1, name: 'delta' },
      { id: 2, name: 'alpha' },
      { id: 3, name: 'charlie' },
      { id: 4, name: 'bravo' },
    ];

    const sorted = sortRowsBy(rows, { columnId: 'name', direction: 'asc' }, (row, key) => row[key as 'name']);
    const firstPage = sorted.slice(0, 2).map((row) => row.name);

    expect(firstPage).toEqual(['alpha', 'bravo']);
  });

  it('keeps null values after concrete values', () => {
    const rows = [
      { id: 1, value: null as string | null },
      { id: 2, value: 'b' },
      { id: 3, value: 'a' },
    ];

    const sorted = sortRowsBy(rows, { columnId: 'value', direction: 'asc' }, (row, key) => row[key as 'value']);

    expect(sorted.map((row) => row.id)).toEqual([3, 2, 1]);
  });
});
