import { describe, expect, it } from 'vitest';
import { srcSetFor } from './images';

const manifest = { 'catalog/a': [480, 960], 'site/hero': [480, 960, 1440] };

describe('srcSetFor', () => {
  it('builds avif and webp srcsets for a known image', () => {
    expect(srcSetFor('/assets/catalog/a.jpg', manifest)).toEqual({
      avif: '/assets/catalog/a-480.avif 480w, /assets/catalog/a-960.avif 960w',
      webp: '/assets/catalog/a-480.webp 480w, /assets/catalog/a-960.webp 960w',
    });
  });

  it('keeps a CDN prefix', () => {
    expect(srcSetFor('https://cdn.example/catalog/a.jpg', manifest).webp).toBe('https://cdn.example/catalog/a-480.webp 480w, https://cdn.example/catalog/a-960.webp 960w');
  });

  it('returns nothing for unknown images (the JPG alone is used)', () => {
    expect(srcSetFor('/assets/catalog/unknown.jpg', manifest)).toEqual({});
    expect(srcSetFor('', manifest)).toEqual({});
  });
});
