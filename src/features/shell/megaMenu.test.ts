import { describe, expect, it } from 'vitest';
import { interpolate } from '../../lib/i18n/I18nProvider';
import { en } from '../../lib/i18n/dict.en';
import type { Facet, Menu } from '../catalog/api';
import { buildMegaMenu } from './megaMenu';

const t = ((key: keyof typeof en, vars?: Record<string, string | number>) => interpolate(en[key], vars)) as Parameters<typeof buildMegaMenu>[3];
const facet = (key: string, opts: [string, number][]) => ({ key, label: key, type: 'checkbox', options: opts.map(([value, count]) => ({ value, label: value, count })) }) as unknown as Facet;
const collections = [{ slug: 'national-teams', name: 'x' }, { slug: 'retro-jerseys', name: 'x' }, { slug: 'f1-jackets', name: 'x' }] as Menu['collections'];

describe('buildMegaMenu', () => {
  it('shows club leagues as tiles biggest first (with their clubs), then national teams, kits, collections and brands', () => {
    const menu = buildMegaMenu(
      'jerseys',
      [facet('league', [['Serie A', 3], ['International', 19], ['Premier League', 7], ['La Liga', 9], ['Empty League', 0]]), facet('kitType', [['Away', 4], ['Home', 9]]), facet('brand', [['nike', 5]])],
      collections,
      t,
    );
    expect(menu.tilesTitle).toBe('mega.leagues');
    expect(menu.tiles.map((l) => l.label)).toEqual(['Premier League', 'La Liga', 'Serie A']);
    expect(menu.tiles[0]).toMatchObject({ href: '/c/jerseys?league=Premier+League', count: 7, note: expect.stringContaining('Arsenal') });
    expect(menu.columns.map((c) => c.title)).toEqual(['mega.nations', 'mega.kit', 'mega.collections', 'mega.brands']);
    expect(menu.columns[0]!.links[0]).toEqual({ label: 'All national teams', href: '/c/jerseys?league=International', count: 19 });
    expect(menu.columns[0]!.links[1]).toEqual({ label: 'Cambodia', href: '/c/jerseys?league=International&q=Cambodia' });
    expect(menu.columns[1]!.links.map((l) => l.label)).toEqual(['Home', 'Away']);
    expect(menu.columns[2]!.links).toEqual([{ label: 'Retro jerseys', href: '/collections/retro-jerseys' }]);
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
