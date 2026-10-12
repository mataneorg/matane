import { describe, expect, it } from 'vitest';
import { cardMenuRows, menuTargetIds, movedCategoryIds, sharedCategoryIds, toggledAutoDownload } from './menu';

describe('menuTargetIds', () => {
  it('acts on the whole selection when the card is part of it', () => {
    expect(menuTargetIds(new Set([1, 2, 3]), 2)).toEqual([1, 2, 3]);
  });
  it('acts on the card alone when it is not selected, leaving the selection as it is', () => {
    const selection = new Set([1, 2]);
    expect(menuTargetIds(selection, 9)).toEqual([9]);
    expect([...selection]).toEqual([1, 2]);
  });
});

describe('cardMenuRows', () => {
  it('offers Open and Migrate for one manga only', () => {
    expect(cardMenuRows({ selected: false, targetCount: 1 })).toEqual({ open: true, migrate: true, select: true });
    expect(cardMenuRows({ selected: true, targetCount: 3 })).toEqual({ open: false, migrate: false, select: false });
  });
});

describe('movedCategoryIds', () => {
  it('swaps a category with its neighbour', () => {
    expect(movedCategoryIds([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(movedCategoryIds([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
  });
  it('leaves the order alone at either end or for an unknown id', () => {
    expect(movedCategoryIds([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(movedCategoryIds([1, 2, 3], 3, 1)).toEqual([1, 2, 3]);
    expect(movedCategoryIds([1, 2, 3], 9, 1)).toEqual([1, 2, 3]);
  });
});

describe('toggledAutoDownload', () => {
  it('switches between included and none, and includes an excluded category', () => {
    expect(toggledAutoDownload(null)).toBe('include');
    expect(toggledAutoDownload('include')).toBeNull();
    expect(toggledAutoDownload('exclude')).toBe('include');
  });
});

describe('sharedCategoryIds', () => {
  it('keeps the categories every manga is in', () => {
    expect(sharedCategoryIds([{ categoryIds: [1, 2] }, { categoryIds: [2, 3] }])).toEqual([2]);
    expect(sharedCategoryIds([{ categoryIds: [4] }])).toEqual([4]);
    expect(sharedCategoryIds([])).toEqual([]);
  });
});
