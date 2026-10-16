export function moveColumnByIndex(
  order: string[],
  fromIndex: number,
  toIndex: number,
  fixedFirstColumnId?: string,
): string[] {
  if (fromIndex < 0 || fromIndex >= order.length) {
    return order;
  }

  const nextOrder = [...order];
  const firstColumnId = fixedFirstColumnId ?? nextOrder[0];

  const lockedIndex = firstColumnId ? nextOrder.indexOf(firstColumnId) : -1;
  if (lockedIndex === 0 && fromIndex === 0) {
    return order;
  }

  const effectiveToIndex = firstColumnId && lockedIndex === 0
    ? Math.max(1, Math.min(toIndex, nextOrder.length - 1))
    : Math.min(Math.max(toIndex, 0), nextOrder.length - 1);

  if (fromIndex === effectiveToIndex) {
    return order;
  }

  const [moved] = nextOrder.splice(fromIndex, 1);
  nextOrder.splice(effectiveToIndex, 0, moved);

  return nextOrder;
}

export function moveColumnById(
  order: string[],
  columnId: string,
  targetIndex: number,
  fixedFirstColumnId?: string,
): string[] {
  const fromIndex = order.indexOf(columnId);
  if (fromIndex < 0) {
    return order;
  }

  return moveColumnByIndex(order, fromIndex, targetIndex, fixedFirstColumnId);
}
