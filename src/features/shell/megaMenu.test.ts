import { describe, expect, it } from 'vitest';
import { interpolate } from '../../lib/i18n/I18nProvider';
import { en } from '../../lib/i18n/dict.en';
import type { Facet, Menu } from '../catalog/api';
import { buildMegaMenu, inTopMenu } from './megaMenu';

const t = ((key: keyof typeof en, vars?: Record<string, string | number>) => interpolate(en[key], vars)) as Parameters<typeof buildMegaMenu>[3];
const facet = (key: string, opts: [string, number][]) => ({ key, label: key, type: 'checkbox', options: opts.map(([value, count]) => ({ value, label: value, count })) }) as unknown as Facet;
const collections = [{ slug: 'national-teams', name: 'x' }, { slug: 'retro-jerseys', name: 'x' }, { slug: 'f1-jackets', name: 'x' }] as Menu['collections'];

describe('buildMegaMenu', () => {
  it('shows club leagues as tiles biggest first (with their clubs), then national teams by continent, seasons, collections and brands', () => {
    const menu = buildMegaMenu(
      'jerseys',
      [
        facet('league', [['Serie A', 3], ['International', 19], ['Premier League', 7], ['La Liga', 9], ['Empty League', 0]]),
        facet('continent', [['europe', 8], ['south-america', 6], ['asia', 5], ['africa', 0]]),
        facet('season', [['2026/27', 41], ['2025/26', 1], ['2002', 1]]),
        facet('brand', [['nike', 5]]),
      ],
      collections,
      t,
    );
    expect(menu.tilesTitle).toBe('mega.leagues');
    expect(menu.tiles.map((l) => l.label)).toEqual(['Premier League', 'La Liga', 'Serie A']);
    expect(menu.tiles[0]).toMatchObject({ href: '/c/jerseys?league=Premier+League', count: 7, note: expect.stringContaining('Arsenal') });
    expect(menu.columns.map((c) => c.title)).toEqual(['mega.nations', 'mega.season', 'mega.collections', 'mega.brands']);
    expect(menu.columns[0]!.links).toEqual([
      { label: 'All national teams', href: '/c/jerseys?league=International', count: 19 },
      { label: 'Europe', href: '/c/jerseys?continent=europe', count: 8 },
      { label: 'South America', href: '/c/jerseys?continent=south-america', count: 6 },
      { label: 'Asia', href: '/c/jerseys?continent=asia', count: 5 },
    ]);
    expect(menu.columns[1]!.links).toEqual([
      { label: '2026–2027', href: '/c/jerseys?season=2026%2F27', count: 41 },
      { label: '2025–2026', href: '/c/jerseys?season=2025%2F26', count: 1 },
      { label: '2002', href: '/c/jerseys?season=2002', count: 1 },
    ]);
    expect(menu.columns[2]!.links).toEqual([{ label: 'Retro jerseys', href: '/collections/retro-jerseys' }]);
  });

  it('names continents in Khmer too', () => {
    const menu = buildMegaMenu('jerseys', [facet('league', [['International', 3]]), facet('continent', [['asia', 3]])], [], t, 'km');
    expect(menu.columns[0]!.links[1]!.label).toBe('អាស៊ី');
  });

  it('names boot surfaces for shoppers, says what pitch each is for, and keeps pitch order', () => {
    const menu = buildMegaMenu('boots', [facet('surface', [['TF', 1], ['FG', 8], ['AG', 2]])], [], t);
    expect(menu.tiles.map((l) => l.label)).toEqual(['Firm ground (FG)', 'Artificial grass (AG)', 'Turf (TF)']);
    expect(menu.tiles.map((l) => l.note)).toEqual(['Natural grass pitches', '3G and 4G artificial grass', 'Hard turf, 5v5 and 7v7 cages']);
    expect(menu.columns[0]!.title).toBe('mega.families');
  });

  it('shows F1 by team and names garment types', () => {
    const menu = buildMegaMenu('f1', [facet('garmentType', [['jersey', 8], ['jacket', 4]])], collections, t);
    expect(menu.tiles.map((l) => l.href)).toContain('/c/f1?q=Ferrari');
    expect(menu.columns[0]!.links.map((l) => l.label)).toEqual(['Team jerseys', 'Paddock jackets']);
  });

  it('gives essentials item tiles, and brands by their names', () => {
    const menu = buildMegaMenu('essentials', [facet('brand', [['gksm', 1]])], [], t);
    expect(menu.tiles.map((l) => l.label)).toEqual(['Goalkeeper gloves', 'Shin guards', 'Grip socks']);
    expect(menu.columns).toEqual([{ title: 'mega.brands', links: [{ label: 'gksm', href: '/c/essentials?brand=gksm', count: 1 }] }]);
  });

  it('gives jackets a tile per jacket type, with the F1 jackets collection last', () => {
    const menu = buildMegaMenu('jackets', [facet('brand', [['adidas', 3]])], collections, t);
    expect(menu.tilesTitle).toBe('mega.jacketType');
    expect(menu.tiles.map((l) => [l.label, l.href])).toEqual([
      ['Anthem / Walkout Jacket', '/c/jackets?q=anthem'],
      ['Drill Top / Half-Zip', '/c/jackets?q=drill'],
      ['Rain / All-Weather Jacket', '/c/jackets?q=rain'],
      ['Presentation Jacket', '/c/jackets?q=presentation'],
      ['Bench Coat / Stadium Parka', '/c/jackets?q=bench'],
      ['F1 Jackets', '/collections/f1-jackets'],
    ]);
    expect(menu.tiles.every((l) => l.note.length > 0)).toBe(true);
    expect(menu.intro).toMatch(/jacket/i);
    // Jacket types have no photo of their own: the menu borrows the first matching product's.
    expect(menu.tiles[0]!.probe).toEqual({ category: 'jackets', q: 'anthem' });
    expect(menu.tiles.at(-1)!.probe).toBeUndefined();
    expect(menu.columns.map((c) => c.title)).toEqual(['mega.f1.jackets', 'mega.brands']);
    expect(menu.columns[0]!.links[0]).toEqual({ label: 'Scuderia Ferrari', href: '/c/f1?garmentType=jacket&q=Ferrari' });
    expect(menu.columns[1]).toEqual({ title: 'mega.brands', links: [{ label: 'adidas', href: '/c/jackets?brand=adidas', count: 3 }] });
    // Without the F1 jackets collection the tile goes to F1 paddock jackets.
    expect(buildMegaMenu('jackets', [], [], t).tiles.at(-1)!.href).toBe('/c/f1?garmentType=jacket');
    expect(buildMegaMenu('jackets', [], [], t, 'km').tiles[0]!.label).not.toBe('Anthem / Walkout Jacket');
  });

  it('keeps GK & Essentials out of the top menu, everything else in', () => {
    expect(['boots', 'jerseys', 'balls', 'jackets', 'f1', 'essentials'].filter(inTopMenu)).toEqual(['boots', 'jerseys', 'balls', 'jackets', 'f1']);
  });

  it('writes its own copy in the shop language', () => {
    const menu = buildMegaMenu('boots', [facet('surface', [['FG', 8]])], [], t, 'km');
    expect(menu.tiles[0]!.note).toBe('ទីលានស្មៅធម្មជាតិ');
    expect(menu.intro).toMatch(/ទីលាន/);
  });

  it('only links to leagues and collections the shop has', () => {
    const menu = buildMegaMenu('jerseys', [], [], t);
    expect(menu.tiles).toEqual([]);
    expect(menu.columns).toEqual([]);
  });
});
