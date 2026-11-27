import { describe, expect, it } from 'vitest';
import { valueLabel } from '../filterLabels';
import { subCategory } from './facets';
import { queryFromSearch } from './params';

describe('continent and season', () => {
  it('sends continent and season to the API', () => {
    expect(queryFromSearch(new URLSearchParams('continent=europe&continent=asia&season=2026%2F27'))).toMatchObject({ continent: ['europe', 'asia'], season: ['2026/27'] });
  });
  it('titles the page with a continent or season', () => {
    const t = ((k: string) => k) as unknown as Parameters<typeof valueLabel>[2];
    expect(subCategory(new URLSearchParams('continent=south-america'))).toEqual({ key: 'continent', value: 'south-america' });
    expect(valueLabel('season', '2026/27', t)).toBe('2026–2027');
    expect(valueLabel('continent', 'south-america', t)).toBe('continent.south-america');
  });
});
