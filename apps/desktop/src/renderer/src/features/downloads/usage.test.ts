import { describe, expect, it } from 'vitest';
import { usageShare } from './usage';

describe('usageShare', () => {
  it('is the used part of the limit, capped at 100', () => {
    expect(usageShare(5, 20)).toEqual({ percent: 25, over: false });
    expect(usageShare(30, 20)).toEqual({ percent: 100, over: true });
  });
  it('counts a limit that is exactly reached as over', () => {
    expect(usageShare(20, 20)).toEqual({ percent: 100, over: true });
  });
  it('has no share without a limit', () => {
    expect(usageShare(5, null)).toEqual({ percent: 0, over: false });
    expect(usageShare(5, 0)).toEqual({ percent: 0, over: false });
  });
});
