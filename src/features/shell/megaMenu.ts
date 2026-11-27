import type { DictKey } from '../../lib/i18n';
import type { Facet, Menu } from '../catalog/api';
import { SURFACE_LABELS, valueLabel } from '../catalog/filterLabels';

/**
 * The columns of a category's mega menu, built from what the API says the category holds:
 * its facets (`/v1/catalog/filters?category=…`) and the shop's collections (`/v1/catalog/menu`).
 * Only options with products are shown, so the menu never links to an empty page.
 */

export interface MenuLink {
  label: string;
  href: string;
  count?: number;
}

export interface MenuColumn {
  title: DictKey;
  links: MenuLink[];
}

type Translate = (key: DictKey, vars?: Record<string, string | number>) => string;

/** Club leagues, biggest first; any league not listed follows in the API's order. */
const LEAGUE_ORDER = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Cambodian Premier League'];
const KIT_ORDER = ['Home', 'Away', 'Third', 'Special Edition', 'Retro'];
const byOrder = (list: string[]) => (a: { value: string }, b: { value: string }) => rank(list, a.value) - rank(list, b.value);
const rank = (list: string[], v: string) => (list.indexOf(v) === -1 ? 99 : list.indexOf(v));

/** Leagues that are not club leagues: they get their own links instead. */
const NOT_CLUB_LEAGUES = new Set(['International', 'Formula 1']);

/** Curated collection links per category, by collection slug, with short menu names. */
const COLLECTION_LINKS: Record<string, { slug: string; label: DictKey }[]> = {
  boots: [
    { slug: 'phnom-penh-turf', label: 'mega.col.turf' },
    { slug: 'limited-edition', label: 'mega.col.limited' },
  ],
  jerseys: [
    { slug: 'national-teams', label: 'mega.col.national' },
    { slug: 'retro-jerseys', label: 'mega.col.retro' },
    { slug: 'ucl-2026-27', label: 'mega.col.ucl' },
    { slug: 'limited-edition', label: 'mega.col.limited' },
  ],
  f1: [{ slug: 'f1-jackets', label: 'mega.col.f1jackets' }],
};

const href = (category: string, key: string, value: string) => `/c/${encodeURIComponent(category)}?${new URLSearchParams({ [key]: value })}`;

function options(facets: Facet[], key: string) {
  return (facets.find((f) => f.key === key)?.options ?? []).filter((o) => o.count > 0);
}

export function buildMegaMenu(category: string, facets: Facet[], collections: Menu['collections'], t: Translate): MenuColumn[] {
  const columns: MenuColumn[] = [];
  const known = new Set(collections.map((c) => c.slug));
  const curated = (COLLECTION_LINKS[category] ?? []).filter((c) => known.has(c.slug)).map((c) => ({ label: t(c.label), href: `/collections/${c.slug}` }));

  if (category === 'jerseys') {
    const leagues = options(facets, 'league').filter((o) => !NOT_CLUB_LEAGUES.has(o.value)).sort(byOrder(LEAGUE_ORDER));
    if (leagues.length) columns.push({ title: 'mega.leagues', links: leagues.map((o) => ({ label: o.label, href: href(category, 'league', o.value), count: o.count })) });
    if (curated.length) columns.push({ title: 'mega.collections', links: curated });
    const kits = options(facets, 'kitType').sort(byOrder(KIT_ORDER));
    if (kits.length) columns.push({ title: 'mega.kit', links: kits.map((o) => ({ label: o.label, href: href(category, 'kitType', o.value), count: o.count })) });
  } else if (category === 'boots') {
    const surfaces = options(facets, 'surface').sort(byOrder(Object.keys(SURFACE_LABELS)));
    if (surfaces.length)
      columns.push({
        title: 'mega.surface',
        links: surfaces.map((o) => ({ label: valueLabel('surface', o.value, t), href: href(category, 'surface', o.value), count: o.count })),
      });
    if (curated.length) columns.push({ title: 'mega.collections', links: curated });
  } else if (category === 'f1') {
    const types = options(facets, 'garmentType');
    if (types.length)
      columns.push({
        title: 'mega.type',
        links: types.map((o) => ({ label: valueLabel('garmentType', o.value, t), href: href(category, 'garmentType', o.value), count: o.count })),
      });
    const kits = options(facets, 'kitType').sort(byOrder(KIT_ORDER));
    if (kits.length) columns.push({ title: 'mega.kit', links: kits.map((o) => ({ label: o.label, href: href(category, 'kitType', o.value), count: o.count })) });
  } else if (curated.length) {
    columns.push({ title: 'mega.collections', links: curated });
  }

  const brands = options(facets, 'brand');
  if (brands.length) columns.push({ title: 'mega.brands', links: brands.map((o) => ({ label: o.label, href: href(category, 'brand', o.value), count: o.count })) });
  return columns;
}
