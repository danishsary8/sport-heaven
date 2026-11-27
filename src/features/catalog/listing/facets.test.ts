import { describe, expect, it } from 'vitest';
import type { Facet } from '../api';
import { subCategory, usefulFacets } from './facets';

const colour = (counts: number[]) => ({ key: 'color', label: 'Colour', type: 'checkbox', options: counts.map((count, i) => ({ value: `c${i}`, label: `C${i}`, count })) }) as unknown as Facet;
const brand = { key: 'brand', label: 'Brand', type: 'checkbox', options: [] } as unknown as Facet;

describe('usefulFacets', () => {
  it('hides a long colour list where every colour is a single product', () => {
    expect(usefulFacets([brand, colour([1, 1, 1, 1, 1, 1, 1, 1])]).map((f) => f.key)).toEqual(['brand']);
  });

  it('keeps colours that group several products, and short lists', () => {
    expect(usefulFacets([colour([3, 1, 1, 1, 1, 1, 1, 1])])).toHaveLength(1);
    expect(usefulFacets([colour([1, 1, 1])])).toHaveLength(1);
  });
});

describe('subCategory', () => {
  it('names the page after a single league, surface, type or kit', () => {
    expect(subCategory(new URLSearchParams('league=Premier League'))).toEqual({ key: 'league', value: 'Premier League' });
    expect(subCategory(new URLSearchParams('surface=TF&sort=new'))).toEqual({ key: 'surface', value: 'TF' });
  });

  it('keeps the category name when there are none or several', () => {
    expect(subCategory(new URLSearchParams(''))).toBeNull();
    expect(subCategory(new URLSearchParams('league=La Liga&league=Serie A'))).toBeNull();
    expect(subCategory(new URLSearchParams('league=La Liga&kitType=Home'))).toBeNull();
  });
});
