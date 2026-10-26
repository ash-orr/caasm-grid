import type { SavedViewSort } from '../../views/savedViews.js';

export const SOURCE_STATUS_SORT_ORDER = ['Reporting', 'Stale', 'Pending', 'Not present', 'Not applicable', 'N/A'] as const;

const sourceStatusRank = new Map<string, number>(
  SOURCE_STATUS_SORT_ORDER.map((status, index) => [status, index])
);

function comparePrimitive(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
}

export function compareSortValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  const leftRank = typeof left === 'string' ? sourceStatusRank.get(left) : undefined;
  const rightRank = typeof right === 'string' ? sourceStatusRank.get(right) : undefined;

  if (leftRank != null && rightRank != null) {
    return leftRank - rightRank;
  }

  return comparePrimitive(left, right);
}

export function nextSort(current: SavedViewSort, clickedColumnId: string): SavedViewSort {
  if (current.columnId !== clickedColumnId) {
    return { columnId: clickedColumnId, direction: 'asc' };
  }

  return {
    columnId: clickedColumnId,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
}

export function sortRowsBy<T>(
  rows: T[],
  sort: SavedViewSort,
  getValue: (row: T, columnId: string) => string | number | null | undefined
): T[] {
  const directionFactor = sort.direction === 'asc' ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = getValue(left.row, sort.columnId);
      const rightValue = getValue(right.row, sort.columnId);

      const leftIsNull = leftValue == null;
      const rightIsNull = rightValue == null;

      if (leftIsNull !== rightIsNull) {
        return leftIsNull ? 1 : -1;
      }

      const comparison = compareSortValues(leftValue, rightValue);

      if (comparison !== 0) {
        return comparison * directionFactor;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.row);
}
