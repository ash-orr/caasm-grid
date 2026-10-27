import { describe, expect, it } from 'vitest';
import { getSelectionBannerState } from './selection';

describe('getSelectionBannerState', () => {
  it('shows a page-selected banner when the page is selected but more rows match', () => {
    expect(getSelectionBannerState({
      selectedIds: [1, 2, 3],
      pageIds: [1, 2, 3],
      totalMatchingIds: [1, 2, 3, 4, 5],
    })).toEqual({
      type: 'pageSelected',
      pageCount: 3,
      totalCount: 5,
    });
  });

  it('shows an all-selected banner when every matching row is selected', () => {
    expect(getSelectionBannerState({
      selectedIds: [1, 2, 3, 4, 5],
      pageIds: [1, 2, 3],
      totalMatchingIds: [1, 2, 3, 4, 5],
    })).toEqual({
      type: 'allSelected',
      totalCount: 5,
    });
  });

  it('matches a full-page selection when more rows remain', () => {
    expect(getSelectionBannerState({
      selectedIds: Array.from({ length: 50 }, (_, index) => index + 1),
      pageIds: Array.from({ length: 50 }, (_, index) => index + 1),
      totalMatchingIds: Array.from({ length: 140 }, (_, index) => index + 1),
    })).toEqual({
      type: 'pageSelected',
      pageCount: 50,
      totalCount: 140,
    });
  });

  it('returns null when neither selection banner state applies', () => {
    expect(getSelectionBannerState({
      selectedIds: [1, 2],
      pageIds: [1, 2, 3],
      totalMatchingIds: [1, 2, 3],
    })).toBeNull();
  });
});
