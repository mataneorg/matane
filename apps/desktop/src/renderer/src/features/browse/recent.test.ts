import { describe, expect, it } from 'vitest';
import { recentSources } from './recent';

describe('recentSources', () => {
  const source = (id: string, lastUsedAt: number | null) => ({ id, lastUsedAt });

  it('lists the newest first and leaves out sources never used', () => {
    const list = [source('a', 10), source('b', null), source('c', 30), source('d', 20)];
    expect(recentSources(list).map((s) => s.id)).toEqual(['c', 'd', 'a']);
  });

  it('keeps only the requested number', () => {
    const list = [source('a', 1), source('b', 2), source('c', 3), source('d', 4)];
    expect(recentSources(list, 2).map((s) => s.id)).toEqual(['d', 'c']);
  });

  it('does not change the list it is given', () => {
    const list = [source('a', 1), source('b', 2)];
    recentSources(list);
    expect(list.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('is empty when nothing was used', () => {
    expect(recentSources([source('a', null)])).toEqual([]);
  });
});
