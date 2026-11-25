import { describe, expect, it } from 'vitest';
import { formatUsd, getPatchFee, getPatchLabel } from './commerce';

describe('commerce helpers', () => {
  it('formats USD amounts with two decimals', () => {
    expect(formatUsd(5)).toBe('$5.00');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('resolves jersey patch fee and label, defaulting to no patch', () => {
    expect(getPatchFee('ucl')).toBe(5);
    expect(getPatchFee('none')).toBe(0);
    expect(getPatchLabel('cpl')).toBe('Cambodian Premier League Patch');
    expect(getPatchLabel('none')).toBe('No Sleeve Patch');
  });
});
