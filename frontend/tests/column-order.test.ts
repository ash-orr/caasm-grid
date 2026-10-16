import { describe, expect, it } from 'vitest';
import { moveColumnById, moveColumnByIndex } from '../src/components/AssetsTable/columnOrder.js';

describe('column reorder helpers', () => {
  it('moves a column from index A to index B', () => {
    expect(moveColumnByIndex(['name', 'type', 'os', 'location'], 1, 3)).toEqual(['name', 'os', 'location', 'type']);
  });

  it('keeps the fixed first column in place and blocks moves above it', () => {
    expect(moveColumnById(['name', 'type', 'os', 'location'], 'os', 0, 'name')).toEqual(['name', 'os', 'type', 'location']);
    expect(moveColumnByIndex(['name', 'type', 'os', 'location'], 2, 0, 'name')).toEqual(['name', 'os', 'type', 'location']);
  });
});
