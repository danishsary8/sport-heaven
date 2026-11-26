import { describe, expect, it } from 'vitest';
import { sortSizes } from './sizes';
import { humaniseKey } from './specs';

describe('sortSizes', () => {
  it('orders clothing sizes from small to large', () => {
    expect(sortSizes(['XL', 'S', 'XXL', 'M', 'L'])).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
  });

  it('orders numeric sizes by number, halves included', () => {
    expect(sortSizes(['EU 42', 'EU 40.5', 'EU 39', 'EU 44.5'])).toEqual(['EU 39', 'EU 40.5', 'EU 42', 'EU 44.5']);
  });

  it('keeps unknown sizes last and does not mutate the input', () => {
    const input = ['One size', 'M', 'S'];
    expect(sortSizes(input)).toEqual(['S', 'M', 'One size']);
    expect(input).toEqual(['One size', 'M', 'S']);
  });
});

describe('humaniseKey', () => {
  it('turns API spec keys into sentence-case labels', () => {
    expect(humaniseKey('careGuide')).toBe('Care guide');
    expect(humaniseKey('upper_material')).toBe('Upper material');
    expect(humaniseKey('stud-config')).toBe('Stud config');
  });
});
