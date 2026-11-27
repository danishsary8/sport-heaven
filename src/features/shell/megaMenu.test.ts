import { describe, expect, it } from 'vitest';
import { interpolate } from '../../lib/i18n/I18nProvider';
import { en } from '../../lib/i18n/dict.en';
import type { Facet, Menu } from '../catalog/api';
import { buildMegaMenu } from './megaMenu';

const t = ((key: keyof typeof en, vars?: Record<string, string | number>) => interpolate(en[key], vars)) as Parameters<typeof buildMegaMenu>[3];
const facet = (key: string, opts: [string, number][]) => ({ key, label: key, type: 'checkbox', options: opts.map(([value, count]) => ({ value, label: value, count })) }) as unknown as Facet;
const collections = [{ slug: 'national-teams', name: 'x' }, { slug: 'retro-jerseys', name: 'x' }, { slug: 'f1-jackets', name: 'x' }] as Menu['collections'];

describe('buildMegaMenu', () => {
  it('lists club leagues biggest first, without International, then collections, kits and brands', () => {
    const cols = buildMegaMenu(
      'jerseys',
      [facet('league', [['Serie A', 3], ['International', 19], ['Premier League', 7], ['La Liga', 9], ['Empty League', 0]]), facet('kitType', [['Away', 4], ['Home', 9]]), facet('brand', [['nike', 5]])],
      collections,
      t,
    );
    expect(cols.map((c) => c.title)).toEqual(['mega.leagues', 'mega.collections', 'mega.kit', 'mega.brands']);
    expect(cols[0]!.links.map((l) => l.label)).toEqual(['Premier League', 'La Liga', 'Serie A']);
    expect(cols[0]!.links[0]!.href).toBe('/c/jerseys?league=Premier+League');
    expect(cols[1]!.links).toEqual([
      { label: 'National team jerseys', href: '/collections/national-teams' },
      { label: 'Retro jerseys', href: '/collections/retro-jerseys' },
    ]);
    expect(cols[2]!.links.map((l) => l.label)).toEqual(['Home', 'Away']);
  });

  it('names boot surfaces for shoppers and keeps them in pitch order', () => {
    const cols = buildMegaMenu('boots', [facet('surface', [['TF', 1], ['FG', 8], ['AG', 2]])], [], t);
    expect(cols[0]!.links.map((l) => l.label)).toEqual(['Firm ground (FG)', 'Artificial grass (AG)', 'Turf (TF)']);
  });

  it('names F1 garment types', () => {
    const cols = buildMegaMenu('f1', [facet('garmentType', [['jersey', 8], ['jacket', 4]])], collections, t);
    expect(cols[0]!.links.map((l) => l.label)).toEqual(['Team jerseys', 'Paddock jackets']);
  });

  it('only links to collections the shop has', () => {
    const cols = buildMegaMenu('jerseys', [], [], t);
    expect(cols).toEqual([]);
  });
});
