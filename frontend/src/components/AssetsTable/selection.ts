export type SelectionChangeType =
  | 'sort'
  | 'page'
  | 'rowsPerPage'
  | 'filter'
  | 'search'
  | 'tab';

export function shouldKeepSelectionOnChange(change: SelectionChangeType): boolean {
  return change === 'sort' || change === 'page' || change === 'rowsPerPage';
}

export function shouldResetSelectionOnChange(change: SelectionChangeType): boolean {
  return change === 'filter' || change === 'search' || change === 'tab';
}

export function selectAllMatchingRows(
  currentSelected: number[],
  pageIds: number[],
  allMatchingIds: number[]
): number[] {
  const selectionSet = new Set([...currentSelected, ...allMatchingIds]);

  if (pageIds.length > 0 && pageIds.every((id) => currentSelected.includes(id))) {
    return Array.from(selectionSet).sort((left, right) => left - right);
  }

  return Array.from(selectionSet).sort((left, right) => left - right);
}

export function getSelectionBannerState(args: {
  selectedIds: number[];
  pageIds: number[];
  totalMatchingIds: number[];
}):
  | { type: 'pageSelected'; pageCount: number; totalCount: number }
  | { type: 'allSelected'; totalCount: number }
  | null {
  const selectedSet = new Set(args.selectedIds);
  const totalMatchingSet = new Set(args.totalMatchingIds);
  const pageSelected = args.pageIds.length > 0 && args.pageIds.every((id) => selectedSet.has(id));
  const allMatchingSelected = totalMatchingSet.size > 0 && args.totalMatchingIds.every((id) => selectedSet.has(id));

  if (allMatchingSelected) {
    return {
      type: 'allSelected',
      totalCount: args.totalMatchingIds.length,
    };
  }

  if (pageSelected && args.totalMatchingIds.length > args.pageIds.length) {
    return {
      type: 'pageSelected',
      pageCount: args.pageIds.length,
      totalCount: args.totalMatchingIds.length,
    };
  }

  return null;
}
