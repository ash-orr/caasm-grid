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
