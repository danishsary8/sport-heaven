import { describe, expect, it } from 'vitest';
import { toNinety } from './price';

describe('toNinety', () => {
  it('moves a price down to the .90 below it, keeps .90 prices, never below $0.90', () => {
    expect([1200, 1250, 1299, 9500, 1190, 90, 1, 0].map(toNinety)).toEqual([1190, 1190, 1290, 9490, 1190, 90, 90, 90]);
  });
});
