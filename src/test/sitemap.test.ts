import { describe, expect, it } from 'vitest';
import { buildSitemap } from '../../scripts/sitemap-lib.mjs';

describe('sitemap', () => {
  it('lists real paths (no hash URLs) for pages, categories, brands and products', () => {
    const xml = buildSitemap('https://shop.example/', { categories: ['boots'], brands: ['nike'], products: ['f50-elite'] });
    expect(xml).toContain('<loc>https://shop.example/</loc>');
    expect(xml).toContain('<loc>https://shop.example/c/boots</loc>');
    expect(xml).toContain('<loc>https://shop.example/brands/nike</loc>');
    expect(xml).toContain('<loc>https://shop.example/p/f50-elite</loc>');
    expect(xml).toContain('<loc>https://shop.example/stores</loc>');
    expect(xml).not.toContain('#/');
    expect(xml).not.toContain('/checkout');
    // robots.txt disallows /track: listing it would be a conflict search engines report.
    expect(xml).not.toContain('/track');
  });

  it('escapes characters that break XML', () => {
    expect(buildSitemap('https://s.example', { categories: [], brands: ['a&b'], products: [] })).toContain('/brands/a&amp;b');
  });
});
