import { describe, expect, it } from 'vitest';
import { productCrumbs } from './crumbs';

describe('productCrumbs', () => {
  const product = { category: 'boots', brand: { slug: 'adidas', name: 'Adidas' } };

  it('goes home, then category, then brand', () => {
    expect(productCrumbs(product, 'Football Boots', 'Home')).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Football Boots', to: '/c/boots' },
      { label: 'Adidas', to: '/brands/adidas' },
    ]);
  });

  it('falls back to the slug while the menu loads', () => {
    expect(productCrumbs(product, undefined, 'Home')[1]).toEqual({ label: 'boots', to: '/c/boots' });
  });

  it('skips a missing category', () => {
    expect(productCrumbs({ ...product, category: '' }, undefined, 'Home').map((c) => c.to)).toEqual(['/', '/brands/adidas']);
  });
});
