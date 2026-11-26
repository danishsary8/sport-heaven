import { describe, expect, it } from 'vitest';
import { HERO_FALLBACK, headingId, linkTo, railHref, readBrandRow, readCategoryGrid, readHero, readRail } from './sections';

describe('home section payloads', () => {
  it('turns a link object into a storefront path', () => {
    expect(linkTo({ collection: 'new-arrivals' })).toBe('/collections/new-arrivals');
    expect(linkTo({ category: 'boots' })).toBe('/c/boots');
    expect(linkTo({ brand: 'nike' })).toBe('/brands/nike');
    expect(linkTo({ product: 'f50-elite' })).toBe('/p/f50-elite');
  });

  it('sends unknown or broken links to the full shop', () => {
    expect(linkTo(undefined)).toBe('/shop');
    expect(linkTo('boots')).toBe('/shop');
    expect(linkTo({ collection: 42 })).toBe('/shop');
    expect(linkTo({ category: '  ' })).toBe('/shop');
  });

  it('escapes slugs so a payload cannot inject a path', () => {
    expect(linkTo({ category: '../admin' })).toBe('/c/..%2Fadmin');
  });

  it('maps a rail query to the listing that shows the same products', () => {
    expect(railHref({ tag: ['new'], sort: 'new' })).toBe('/shop?tag=new&sort=new');
    expect(railHref({ category: 'boots', sort: 'price_asc' })).toBe('/c/boots?sort=price_asc');
    expect(railHref({ collection: 'world-cup' })).toBe('/collections/world-cup');
    expect(railHref(null)).toBe('/shop');
  });

  it('reads the hero with a fallback photo', () => {
    expect(readHero({ title: 'Matchday', link: { collection: 'new-arrivals' } })).toEqual({
      title: 'Matchday',
      subtitle: undefined,
      href: '/collections/new-arrivals',
      image: HERO_FALLBACK,
    });
    expect(readHero({ title: 'x', imagePath: '/assets/site/a.jpg' }).image).toBe('/assets/site/a.jpg');
  });

  it('reads rails, category grids and brand rows, dropping values of the wrong type', () => {
    expect(readRail({ title: 'New' }).products).toEqual([]);
    expect(readCategoryGrid({ title: 'Shop', categories: ['boots', 3, '', 'f1'] }).slugs).toEqual(['boots', 'f1']);
    expect(readBrandRow({ brands: 'nike' })).toEqual({ title: '', slugs: [] });
  });

  it('makes heading ids from titles, including Khmer', () => {
    expect(headingId('rail', 'New arrivals')).toBe('rail-new-arrivals');
    expect(headingId('rail', '!!!')).toBe('rail-section');
    expect(headingId('rail', 'ទំនិញថ្មី')).toBe('rail-ទំនិញថ្មី');
  });
});
