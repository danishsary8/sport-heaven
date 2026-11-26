import { describe, expect, it } from 'vitest';
import { formatDate, formatKhr, formatUsd } from './format';

describe('formatting', () => {
  it('formats cents as US dollars', () => {
    expect(formatUsd(9500)).toBe('$95.00');
    expect(formatUsd(1234567)).toBe('$12,345.67');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(-250)).toBe('-$2.50');
  });

  it('formats riel with grouping, Khmer digits in Khmer', () => {
    expect(formatKhr(389500, 'en')).toBe('៛389,500');
    expect(formatKhr(389500, 'km')).toBe('៣៨៩,៥០០៛');
  });

  it('formats dates in Phnom Penh time', () => {
    // 20:30 UTC is 03:30 the next day in Phnom Penh (UTC+7).
    expect(formatDate('2026-11-26T20:30:00Z', 'en')).toBe('27 Nov 2026');
    expect(formatDate('2026-11-26T20:30:00Z', 'en', { hour: '2-digit', minute: '2-digit', hour12: false })).toContain('03:30');
  });
});
